(async function(){
'use strict';
const $=id=>document.getElementById(id),DB=globalThis.AOMDB,P=globalThis.AOMParser,E=globalThis.AOMExport,B=globalThis.AOMBatch,L=globalThis.AOMLive,F=globalThis.AOMFolders;
const defaultSettings={include:'Auri, Orion, Orión, Alma, OrionHub, Vault, Athena, Mem0, Tool Studio',exclude:'recetas, cocina, oración, salud, Elu',match:'any',searchMode:'title'};
let settings={...defaultSettings};try{settings={...settings,...JSON.parse(localStorage.getItem('aom.filters')||'{}')};}catch(_){}
let syncingHistory=false,stopHistory=false;
let all=[],filtered=[],currentId=null,currentFolder='all',selected=new Set(),pageSize=100,sortKey='updatedAt',sortAsc=false,filterVersion=0,worker=null,deleteMode='trash',pendingDropFiles=null,remotePending=[],remoteWorking=false,remoteStop=false,hydrating=false,hydrateStop=false;
const folderSpec={all:['▤','Todos mis chats','Catálogo unificado de conversaciones conocidas; la cobertura de la cuenta aún puede ser parcial'],live:['◎','Cuenta ChatGPT detectada','Conversaciones descubiertas en la interfaz real; cobertura parcial'],auri:['◇','Auri–Orion','Clasificación sugerida, sin bloqueo de otros chats'],review:['◫','Por revisar','Coincidencias genéricas para organizar manualmente'],other:['♧','Otros temas','Conversaciones no clasificadas como técnicas, disponibles para todas las operaciones'],trash:['▤','Papelera local','Conversaciones ocultas solo del catálogo local']};
function esc(v){return E.escapeHtml(v)}
function toast(text){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),4300)}
function status(text){$('app-status').textContent=text}
function fmtDate(value){if(!value)return 'Sin fecha';const d=new Date(value);return Number.isNaN(d.getTime())?'Sin fecha':d.toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'});}
function labelSource(source){return source==='Captura de página'?'Chat abierto':source==='ChatGPT sidebar'?'ChatGPT en vivo':source==='ChatGPT sincronizado'?'ChatGPT cuenta':'JSON OpenAI'}
function getSettings(){return {...settings,searchMode:$('search-mode').value};}
function settingsFromUI(){settings={include:$('include').value,exclude:$('exclude').value,match:$('match').value,searchMode:$('search-mode').value};localStorage.setItem('aom.filters',JSON.stringify(settings));}
function classification(meta,body=''){
 const c=P.classify(meta,body,getSettings());
 if(meta.manualClass==='candidate')return {kind:'candidate',reason:'Clasificado manualmente como Auri–Orion'};
 if(meta.manualClass==='review')return {kind:'review',reason:'Pendiente de revisión manual'};
 return c;
}
function activeFolder(meta,cls){if(meta.deletedAt)return 'trash';return meta.folderId||cls.kind;}
function clearPreview(){currentId=null;$('viewer').innerHTML='<div class="viewer-empty"><div class="empty-icon">▤</div><strong>Vista previa</strong><p>Selecciona una conversación para leerla.</p></div>';}
const collapsedFolders=new Set((()=>{try{return JSON.parse(localStorage.getItem('aom.collapsed-folders')||'[]');}catch(_){return [];}})());
let activeFolderMenuId=null,folderDialogParentId=null,folderDeleteTargetId=null;
function hideFolderMenu(){$('folder-context-menu').hidden=true;activeFolderMenuId=null;}
function folderMenuButton(action,label){const btn=document.createElement('button');btn.type='button';btn.textContent=label;btn.dataset.folderAction=action;btn.setAttribute('role','menuitem');return btn;}
function openFolderMenu(id,trigger){
 if(activeFolderMenuId===id){hideFolderMenu();return;}
 const menu=$('folder-context-menu');menu.replaceChildren();activeFolderMenuId=id;
 menu.append(folderMenuButton('subfolder','＋ Crear subcarpeta'),folderMenuButton('rename','✎ Cambiar nombre'),folderMenuButton('delete','🗑 Eliminar carpeta'));
 for(const btn of menu.querySelectorAll('button'))btn.onclick=()=>{hideFolderMenu();const action=btn.dataset.folderAction;
  if(action==='subfolder')openFolderDialog(false,id);if(action==='rename')openRenameFolder(id);if(action==='delete')openFolderDelete(id);
 };
 menu.hidden=false;const r=trigger.getBoundingClientRect();const width=215;
 menu.style.left=Math.max(6,Math.min(window.innerWidth-width-8,r.right-width))+'px';
 menu.style.top=Math.max(6,Math.min(window.innerHeight-138,r.bottom+4))+'px';
 menu.querySelector('button')?.focus();
}
function buildFolderList(){
 const counts={all:0,live:0,auri:0,review:0,other:0,trash:0};
 for(const meta of all){if(!DB.visible(meta))continue;
  const cls=classification(meta);const target=activeFolder(meta,cls);counts[target]=(counts[target]||0)+1;
  if(!meta.deletedAt){counts.all++;if(meta.liveDetectedAt)counts.live++;
   if(meta.folderId)for(const parent of F.ancestors(meta.folderId,folders))counts[parent]=(counts[parent]||0)+1;
  }
 }
 const nav=$('folders');nav.replaceChildren();for(const [key,[sym,label]] of Object.entries(folderSpec)){
  const b=document.createElement('button');b.className='folder'+(key===currentFolder?' active':'');b.innerHTML=`<span class="symbol">${sym}</span><span>${esc(label)}</span><span class="count">${counts[key]||0}</span>`;b.onclick=()=>setFolder(key);nav.appendChild(b);
 }
 const customNav=$('custom-folders');customNav.replaceChildren();const hiddenBranches=new Set();
 for(const entry of F.tree(folders)){
  const folder=entry.folder;
  if(F.ancestors(folder.id,folders).some(id=>collapsedFolders.has(id)))continue;
  const row=document.createElement('div');row.className='folder-tree-row';row.style.setProperty('--folder-depth',String(Math.min(entry.depth,8)));
  row.dataset.folderId=folder.id;
  const toggle=document.createElement('button');toggle.className='folder-toggle';toggle.type='button';toggle.title=entry.hasChildren?(collapsedFolders.has(folder.id)?'Expandir subcarpetas':'Contraer subcarpetas'):'Sin subcarpetas';
  toggle.textContent=entry.hasChildren?(collapsedFolders.has(folder.id)?'▸':'▾'):'·';toggle.disabled=!entry.hasChildren;
  toggle.onclick=()=>{if(collapsedFolders.has(folder.id))collapsedFolders.delete(folder.id);else collapsedFolders.add(folder.id);
   localStorage.setItem('aom.collapsed-folders',JSON.stringify([...collapsedFolders]));buildFolderList();};
  const select=document.createElement('button');select.type='button';select.className='folder folder-tree-select'+(folder.id===currentFolder?' active':'');select.title=F.folderPath(folder.id,folders);
  const icon=document.createElement('span');icon.className='symbol';icon.textContent='▱';
  const label=document.createElement('span');label.className='folder-label';label.textContent=folder.name;
  const count=document.createElement('span');count.className='count';count.textContent=String(counts[folder.id]||0);
  select.append(icon,label,count);select.onclick=()=>setFolder(folder.id);
  const more=document.createElement('button');more.className='folder-more';more.type='button';more.title='Opciones de '+folder.name;more.setAttribute('aria-label','Opciones de '+folder.name);more.textContent='···';more.onclick=e=>{e.stopPropagation();openFolderMenu(folder.id,more);};
  row.append(toggle,select,more);
  row.addEventListener('dragover',e=>{e.preventDefault();row.classList.add('drag-hover')});
  row.addEventListener('dragleave',()=>row.classList.remove('drag-hover'));
  row.addEventListener('drop',async e=>{e.preventDefault();row.classList.remove('drag-hover');const id=e.dataTransfer.getData('text/plain');const meta=all.find(c=>c.id===id);
   if(DB.visible(meta)&&!meta.deletedAt){await DB.updateMeta(id,{folderId:folder.id});await refresh();setFolder(folder.id);}});
  customNav.appendChild(row);
 }
}
let folders=[];
function setFolder(key){hideFolderMenu();currentFolder=key;selected.clear();pageSize=100;for(const id of F.ancestors(key,folders))collapsedFolders.delete(id);const name=F.folderPath(key,folders);const spec=folderSpec[key]||['▱',name||'Carpeta',F.ancestors(key,folders).length?'Subcarpeta · Colección local':'Colección personalizada'];$('folder-title').textContent=spec[1];$('page-title').textContent=spec[1];$('page-subtitle').textContent=spec[2];$('restore').hidden=key!=='trash';$('local-delete').textContent=key==='trash'?'Eliminar definitivamente del catálogo':'Mover a papelera local';filterAndRender();}
async function refresh(){all=await DB.all('chats');folders=await DB.all('folders');
 if(currentId&&!all.some(c=>c.id===currentId&&DB.visible(c)))clearPreview();
 await filterAndRender();}
async function filterAndRender(){const version=++filterVersion,search=P.norm($('search').value.trim()),days=Number($('age').value),now=Date.now(),ms=days*86400000;
 const searchContent=$('search-mode').value==='content';
 const out=[];for(const meta of all){if(version!==filterVersion)return;
   if(!DB.visible(meta))continue; // Remote-deleted chats are not listed, searched or counted.
  if(currentFolder==='trash'&&!meta.deletedAt)continue;if(currentFolder!=='trash'&&meta.deletedAt)continue;
  if(currentFolder==='live'&&!meta.liveDetectedAt)continue;
  if(days>0){const t=Date.parse(meta.updatedAt||meta.createdAt);if(!Number.isFinite(t)||t>now-ms)continue;}
  let body='';const mayNeedBody=searchContent;if(mayNeedBody){const messageRecord=await DB.get('messages',meta.id);body=(messageRecord?.messages||[]).map(x=>x.text).join('\n');}
  const cls=classification(meta,body);if(currentFolder!=='live'&&currentFolder!=='all'&&activeFolder(meta,cls)!==currentFolder)continue;
  if(search&&!P.norm(meta.title+(searchContent?'\n'+body:'')).includes(search))continue;
  out.push({...meta,classification:cls});
 }
 if(version!==filterVersion)return;
 filtered=out.sort((a,b)=>{const av=a[sortKey]||'',bv=b[sortKey]||'';return (sortAsc?1:-1)*String(av).localeCompare(String(bv),'es');});
 $('total-count').textContent=filtered.length.toLocaleString('es-ES');$('result-count').textContent=`${filtered.length} resultados`;
 renderRows();buildFolderList();renderSelection();
}
function renderRows(){const list=$('chat-list');list.replaceChildren();const n=Math.min(filtered.length,pageSize);
 if(!n){const d=document.createElement('div');d.className='empty';d.innerHTML='<div class="empty-icon">▤</div><strong>No hay conversaciones en esta vista</strong><p>Pulsa «Leer chats visibles de ChatGPT», importa conversaciones o ajusta los filtros.</p>';list.appendChild(d);}
 for(const meta of filtered.slice(0,n)){
  const row=document.createElement('div');row.className='chat-row'+(meta.id===currentId?' active':'');row.setAttribute('role','row');row.draggable=!meta.deletedAt;
  const cls=meta.classification;const box=document.createElement('input');box.type='checkbox';box.checked=selected.has(meta.id);box.disabled=!!meta.remoteDeletedAt;box.title=meta.remoteDeletedAt?'Ya eliminada en ChatGPT (según la ejecución local)':'Seleccionar conversación';box.setAttribute('aria-label','Seleccionar '+meta.title);box.addEventListener('click',e=>e.stopPropagation());box.addEventListener('change',()=>{box.checked?selected.add(meta.id):selected.delete(meta.id);renderSelection();});
  const checkboxCell=document.createElement('div');checkboxCell.appendChild(box);row.appendChild(checkboxCell);
  const title=document.createElement('div');title.className='chat-main';title.innerHTML=`<div class="chat-title" title="${esc(meta.title)}">${esc(meta.title)}</div><div class="chat-extra">${meta.remoteDeletedAt?'<span class="protected">Borrado remoto registrado</span> · ':''}${esc(cls.reason)}</div>`;row.appendChild(title);
  const date=document.createElement('div');date.className='chat-date';date.textContent=fmtDate(meta.updatedAt);row.appendChild(date);
  const num=document.createElement('div');num.className='chat-num';num.textContent=String(meta.messageCount||0);row.appendChild(num);
  const src=document.createElement('div');src.className='chat-origin';src.textContent=labelSource(meta.source);row.appendChild(src);
  const open=document.createElement('button');open.className='open-icon';open.title='Ver conversación';open.textContent='›';row.appendChild(open);
  row.addEventListener('click',()=>showChat(meta.id));row.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain',meta.id));list.appendChild(row);
 }
 $('more').hidden=pageSize>=filtered.length;$('list-status').textContent=n?`Mostrando ${n} de ${filtered.length} conversaciones`:'Sin conversaciones que mostrar';
}
function renderSelection(){for(const id of [...selected])if(!all.some(c=>c.id===id&&DB.visible(c)))selected.delete(id);
 $('selected-count').textContent=`${selected.size} seleccionados`;if(!hydrating)$('hydrate').disabled=!selected.size;const safeForDelete=selected.size>0;$('move').disabled=!selected.size||currentFolder==='trash'||!safeForDelete;$('local-delete').disabled=!safeForDelete;$('restore').disabled=!selected.size;
 $('remote-delete').disabled=remoteWorking||!selected.size||![...selected].every(id=>{const m=filtered.find(c=>c.id===id);return m&&B.eligible(m,m.classification,Number($('age').value));});
 const ids=filtered.slice(0,pageSize).filter(m=>!m.remoteDeletedAt).map(m=>m.id);$('select-visible').checked=ids.length>0&&ids.every(id=>selected.has(id));$('select-visible').indeterminate=ids.some(id=>selected.has(id))&&!$('select-visible').checked;
}
async function showChat(id){const meta=all.find(c=>c.id===id);if(!DB.visible(meta)){clearPreview();return;}
 currentId=id;renderRows();
 const rec=await DB.get('messages',id),messages=rec?.messages||[];
 const viewer=$('viewer');viewer.replaceChildren();const head=document.createElement('div');head.className='viewer-head';
 const cls=classification(meta,messages.map(m=>m.text).join('\n'));
 head.innerHTML=`<div class="viewer-flag">${esc(cls.kind==='candidate'?'Auri–Orion':cls.kind==='review'?'Por revisar':'Otros temas')}</div><h2>${esc(meta.title)}</h2><div class="viewer-meta">${messages.length} mensajes · ${esc(fmtDate(meta.updatedAt))}<br>${esc(labelSource(meta.source))} · ${esc(meta.id)}</div><div class="viewer-actions"></div>`;
 const actions=head.querySelector('.viewer-actions');const makeBtn=(label,fn,kind='subtle')=>{const b=document.createElement('button');b.className='btn '+kind;b.textContent=label;b.onclick=fn;actions.appendChild(b);};
 makeBtn('↓ Exportar este chat',()=>{selected.clear();selected.add(id);renderSelection();openBackup();},'primary');
 if(!meta.deletedAt){makeBtn('↗ Abrir en ChatGPT',()=>openRemote(meta));
  if(cls.kind==='review')makeBtn('✓ Marcar como Auri–Orion',async()=>{if(!confirm('¿Confirmas que esta conversación pertenece a los proyectos técnicos Auri–Orion?'))return;await DB.updateMeta(id,{manualClass:'candidate'});await refresh();toast('Clasificada como Auri–Orion');});
  if(!meta.folderId)makeBtn('▱ Mover a carpeta',()=>openFolderDialog(true));
 }
 viewer.appendChild(head);if(meta.warnings?.length){const n=document.createElement('p');n.className='viewer-note';n.textContent='Avisos de fidelidad: '+meta.warnings.join(' · ');viewer.appendChild(n);}
 const msgList=document.createElement('div');msgList.className='msg-list';messages.forEach(m=>{const a=document.createElement('article');a.className='msg '+m.role;const role=document.createElement('div');role.className='role';role.textContent=m.role==='user'?'Usuario':'Asistente';const t=document.createElement('div');t.className='msg-text';t.textContent=m.text;a.append(role,t);msgList.appendChild(a);});viewer.appendChild(msgList);
}
function openRemote(meta){if(!meta.id||meta.id.startsWith('local-')){toast('No hay identificador de ChatGPT para este chat.');return;}
 if(!confirm('Se abrirá este chat en ChatGPT. Para eliminarlo de OpenAI tendrás que usar su menú ··· > Eliminar y confirmarlo allí. ¿Continuar?'))return;
 const url='https://chatgpt.com/c/'+encodeURIComponent(meta.id);window.open(url,'_blank','noopener');
}
async function openBackup(){if(!selected.size&&currentId)selected.add(currentId);if(!selected.size){toast('Selecciona una o varias conversaciones.');return;}
 $('backup-summary').textContent=`${selected.size} conversaciones seleccionadas. Los archivos se guardarán localmente. Si faltan mensajes, la lectura se hará exclusivamente desde tu sesión de chatgpt.com.`;$('backup-dialog').showModal();}
async function pageForRead(){
 const tabs=await chrome.tabs.query({url:'https://chatgpt.com/*'});
 const selected=tabs.find(t=>t.url?.startsWith('https://chatgpt.com/')&&!t.discarded);
 if(selected)return {tabId:selected.id,created:false};
 const tab=await chrome.tabs.create({url:'https://chatgpt.com/',active:false});
 await B.waitLoaded(tab.id);
 return {tabId:tab.id,created:true};
}
async function readAndStoreChat(id,meta,tabId,options={}){
 const result=await chrome.scripting.executeScript({target:{tabId},world:'MAIN',func:L.readConversationForExport,args:[id]});
 const data=result?.[0]?.result;
 const fingerprint=localStorage.getItem('aom.accountFingerprint');
 if(data?.ok&&fingerprint&&data.accountKey!==fingerprint)
   throw new Error('La cuenta autenticada no corresponde al catálogo sincronizado. No se guardó contenido.');
 if(data?.ok&&data.id?.toLowerCase()===id.toLowerCase()&&data.messages?.length){
   const entry=P.normalizeConversation({id,title:meta.title||data.title,createdAt:meta.createdAt||data.createdAt,
     updatedAt:meta.updatedAt||data.updatedAt,messages:data.messages},{source:'ChatGPT lectura directa'});
   if(!entry?.messages?.length)throw new Error('La lectura devolvió mensajes, pero no pudieron normalizarse.');
   entry.meta.warnings=data.warnings||[];
   await DB.saveBatch([entry]);
   await DB.updateMeta(id,{liveDetectedAt:meta.liveDetectedAt||new Date().toISOString()});
   return {ok:true,count:entry.messages.length,source:'chatgpt-web-readonly'};
 }
 // If the API is rate-limited or authentication changed, stop. Do not use DOM
 // from an account whose identity was not verified.
 if(data?.status===401||data?.status===403||data?.status===429)
   throw Object.assign(new Error(data.reason||'La lectura no está disponible.'),{status:data.status});
 if(options.allowDomFallback!==false){
   // DOM fallback is explicitly marked as potentially incomplete.
   let auxiliaryTabId=null;
   try{
     auxiliaryTabId=await B.openChatTab(id);
     await B.waitLoaded(auxiliaryTabId);
     const dom=await chrome.scripting.executeScript({target:{tabId:auxiliaryTabId},func:captureDom});
     const captured=dom?.[0]?.result;
     if(!captured||captured.error||captured.id?.toLowerCase()!==id.toLowerCase()||!captured.messages?.length)
       throw new Error(captured?.error||'Sin mensajes visibles; la página puede no haberlos cargado.');
     const entry=P.normalizeConversation(captured,{source:'Captura de página'});
     if(!entry?.messages?.length)throw new Error('La captura visual no obtuvo mensajes de texto.');
     entry.meta.title=meta.title||entry.meta.title;
     entry.meta.createdAt=meta.createdAt||null;entry.meta.updatedAt=meta.updatedAt||null;
     entry.meta.warnings=['Captura visual potencialmente incompleta: pueden faltar mensajes virtualizados e imágenes.'];
     await DB.saveBatch([entry]);
     return {ok:true,count:entry.messages.length,source:'dom-partial'};
   }catch(error){throw new Error((data?.reason||'Lectura directa no disponible')+'; alternativa visual: '+error.message);}
   finally{if(auxiliaryTabId!==null)try{await chrome.tabs.remove(auxiliaryTabId)}catch(_){}}
 }
 throw new Error(data?.reason||'El chat no pudo recuperarse desde ChatGPT.');
}
async function loadMissingForExport(ids,progress){
 const results={ok:[],failed:[]};let page=null;
 try{
  if(ids.length)page=await pageForRead();
  for(let i=0;i<ids.length;i++){
   const id=ids[i],meta=await DB.get('chats',id),previous=await DB.get('messages',id);
   if((previous?.messages||[]).length){results.ok.push(id);continue;}
   if(!meta||!B.eligible(meta,null,0)){results.failed.push({id,reason:'No existe un identificador de chat remoto válido.'});continue;}
   progress(`Recuperando mensajes ${i+1}/${ids.length}: ${meta.title}`);
   try{
    const value=await readAndStoreChat(id,meta,page.tabId);
    results.ok.push(id);
    progress(`${i+1}/${ids.length}: ${value.count} mensajes recuperados de «${meta.title}» (${value.source==='dom-partial'?'captura visual parcial':'lectura directa'}).`);
   }catch(error){
    results.failed.push({id,reason:String(error?.message||error)});
    if([401,403,429].includes(error.status)){
     for(const rest of ids.slice(i+1))results.failed.push({id:rest,reason:'Lectura detenida por sesión o límite de solicitudes.'});
     break;
    }
   }
   await new Promise(r=>setTimeout(r,250));
  }
 }finally{if(page?.created)try{await chrome.tabs.remove(page.tabId)}catch(_){}}
 return results;
}
async function performBackup(){
 const fmt=$('export-format').value,ids=[...selected],entries=[],exportedIds=[],skipped=[];const auto=$('backup-auto-read').checked,allowIndex=$('backup-metadata-only').checked;
 const progress=text=>{$('backup-progress').textContent=text;status(text);};
 $('confirm-backup').disabled=true;
 try{
  // Keep Chrome's permission request in the user's click activation (before other awaits).
  let canRead=false;
  if(auto&&ids.some(id=>(all.find(c=>c.id===id)?.messageCount||0)===0)){
   const granted=await chrome.permissions.request({origins:['https://chatgpt.com/*']});
   canRead=!!granted;
   if(!canRead)progress('Permiso denegado; no se leerán chats de la cuenta.');
  }
  if(auto&&canRead){const missing=ids.filter(id=>(all.find(c=>c.id===id)?.messageCount||0)===0);
   const result=await loadMissingForExport(missing,progress);
   for(const f of result.failed)skipped.push(f);
  }
  for(let i=0;i<ids.length;i++){
   const id=ids[i],meta=await DB.get('chats',id),rec=await DB.get('messages',id);
   if(!meta){skipped.push({id,reason:'Sin metadatos.'});continue;}
   const hasMessages=(rec?.messages||[]).length>0;
   if(!hasMessages&&!allowIndex){if(!skipped.some(x=>x.id===id))skipped.push({id,reason:'Contenido no disponible. Activa la lectura, importa JSON o permite índice explícito.'});continue;}
   const base=hasMessages?meta:{...meta,warnings:[...(meta.warnings||[]),'SOLO ÍNDICE, SIN MENSAJES; NO ES UNA COPIA DE SEGURIDAD DEL CHAT.'],indexOnly:true};
   const ext=fmt==='md'?'md':fmt==='html'?'html':'json';
   const filename=`${String(i+1).padStart(3,'0')}-${E.safeFilename((hasMessages?'':'SOLO-INDICE-')+meta.title,ext)}`;
   const doc=E.content(base,hasMessages?rec.messages:[],fmt,null); // Exportar mensajes actuales del catálogo, nunca un JSON original obsoleto.
   entries.push({name:filename,text:doc});exportedIds.push(id);
  }
  if(!entries.length)throw new Error(`No hay conversaciones con contenido exportable. ${skipped.length} sin leer. Importa JSON o permite «solo índice».`);
  if(entries.length===1){const mime=fmt==='md'?'text/markdown':fmt==='html'?'text/html':'application/json';E.download(new Blob([entries[0].text],{type:mime+';charset=utf-8'}),entries[0].name);}
  else E.download(E.zip(entries),`chatgpt-manager-${new Date().toISOString().slice(0,10)}-${entries.length}.zip`);
  const when=new Date().toISOString();for(const id of exportedIds)await DB.updateMeta(id,{lastExportedAt:when});
  const summary=`Descarga iniciada: ${entries.length} archivos, ${skipped.length} no exportados. ${skipped.length?'Revisa los chats sin contenido antes de considerarlos respaldados.':''}`;
  progress(summary+(skipped.length?'\n'+skipped.slice(0,8).map(f=>'• '+(all.find(c=>c.id===f.id)?.title||f.id)+': '+f.reason).join('\n'):'') );toast(summary);
  if(!skipped.length)$('backup-dialog').close();
  await refresh();
 }catch(error){progress('Error al exportar: '+error.message);toast('Error al exportar: '+error.message)}finally{$('confirm-backup').disabled=false;}
}
async function performDelete(){const ids=[...selected];$('confirm-delete').disabled=true;
 try{if(deleteMode==='purge'){for(const id of ids)await DB.purge(id);}else{const when=new Date().toISOString();for(const id of ids)await DB.updateMeta(id,{deletedAt:when,folderId:null});}
  selected.clear();currentId=null;$('viewer').innerHTML='<div class="viewer-empty"><div class="empty-icon">▤</div><strong>Vista previa</strong><p>Selecciona una conversación para leerla.</p></div>';
  $('delete-dialog').close();await refresh();toast(deleteMode==='purge'?`${ids.length} borradas del catálogo local`:`${ids.length} movidas a papelera local`);
 }catch(e){toast('No se pudo completar: '+e.message)}finally{$('confirm-delete').disabled=false;}
}
function openDelete(){if(!selected.size||$('local-delete').disabled)return;deleteMode=currentFolder==='trash'?'purge':'trash';$('delete-title').textContent=deleteMode==='purge'?'Eliminar definitivamente del catálogo local':'Mover a papelera local';$('delete-summary').textContent=`Se han seleccionado ${selected.size} conversaciones. Esta acción NO elimina conversaciones en OpenAI.`;$('delete-dialog').showModal();}
async function restore(){for(const id of selected)await DB.updateMeta(id,{deletedAt:null,folderId:null});selected.clear();await refresh();toast('Conversaciones restauradas en el catálogo local');}
let chosenFolderId=null;
function showFolderSuggestions(){
 const mode=$('folder-dialog').dataset.mode,query=P.norm($('folder-name').value.trim()),panel=$('folder-suggestions');panel.replaceChildren();
 if(mode==='subfolder'||mode==='rename'){panel.hidden=true;return;}
 const matches=folders.filter(f=>!query||P.norm(F.folderPath(f.id,folders)).includes(query)).sort((a,b)=>F.folderPath(a.id,folders).localeCompare(F.folderPath(b.id,folders),'es'));
 if(chosenFolderId&&query!==P.norm(folders.find(f=>f.id===chosenFolderId)?.name))chosenFolderId=null;
 for(const f of matches){const btn=document.createElement('button');btn.type='button';btn.className='folder-suggestion'+(f.id===chosenFolderId?' selected':'');
  btn.textContent='▱ '+F.folderPath(f.id,folders);btn.dataset.folderId=f.id;btn.setAttribute('role','option');btn.setAttribute('aria-selected',String(f.id===chosenFolderId));
  btn.onclick=()=>{chosenFolderId=f.id;$('folder-name').value=f.name;showFolderSuggestions();$('folder-confirm').focus();};panel.appendChild(btn);
 }
 panel.hidden=matches.length===0;
 const exact=folders.filter(f=>P.norm(f.name)===query);
 $('folder-choice-hint').textContent=matches.length
  ?`${matches.length} carpetas coinciden · ${exact.length>1?'Selecciona la ruta correcta para evitar confusiones.':exact.length===1?'Se utilizará «'+F.folderPath(exact[0].id,folders)+'».':'Selecciona una existente o guarda el nombre para crear una nueva.'}`
  :'No existe esa carpeta. Si guardas, se creará una nueva en la raíz.';
}
function openFolderDialog(move=false,parentId=null){
 const dialog=$('folder-dialog');folderDialogParentId=parentId;dialog.dataset.mode=move?'move':parentId?'subfolder':'new';
 $('folder-dialog-title').textContent=move?'Mover seleccionadas a una carpeta':parentId?'Nueva subcarpeta':'Nueva carpeta';chosenFolderId=null;$('folder-name').value='';
 $('folder-name').placeholder=move?'Buscar carpeta o escribir un nombre nuevo':parentId?'Nombre de la subcarpeta':'Nombre de la carpeta';
 $('folder-choice-hint').textContent=parentId?'Dentro de «'+F.folderPath(parentId,folders)+'». Los chats de ChatGPT no se modifican.':'';
 showFolderSuggestions();dialog.showModal();$('folder-name').focus();
}
function openRenameFolder(id){const folder=folders.find(f=>f.id===id);if(!folder)return;
 folderDialogParentId=folder.parentId||null;chosenFolderId=id;const dialog=$('folder-dialog');dialog.dataset.mode='rename';
 $('folder-dialog-title').textContent='Cambiar nombre de carpeta';$('folder-name').value=folder.name;
 $('folder-choice-hint').textContent='Conserva las subcarpetas y los chats organizados en ella. Solo cambia el nombre local.';
 showFolderSuggestions();dialog.showModal();$('folder-name').focus();$('folder-name').select();
}
async function saveFolder(){const name=$('folder-name').value.trim(),mode=$('folder-dialog').dataset.mode;
 if(!name){toast('Escribe un nombre de carpeta.');return;}if(name.includes('/')||name.includes('\\')){toast('El nombre no puede contener barras.');return;}
 let folder=null;
 if(mode==='rename'){
  folder=folders.find(f=>f.id===chosenFolderId);if(!folder){toast('La carpeta ya no existe.');return;}
  if(F.isSiblingNameTaken(folders,name,folder.parentId,folder.id)){toast('Ya existe una carpeta con ese nombre al mismo nivel.');return;}
  await DB.put('folders',{...folder,name});
 }else if(mode==='subfolder'){
  if(!folders.some(f=>f.id===folderDialogParentId)){toast('La carpeta principal ya no existe.');return;}
  if(F.isSiblingNameTaken(folders,name,folderDialogParentId)){toast('Ya existe esa subcarpeta.');return;}
  folder={id:'folder-'+crypto.randomUUID(),name,parentId:folderDialogParentId,createdAt:new Date().toISOString()};await DB.put('folders',folder);
 }else{
  folder=folders.find(f=>f.id===chosenFolderId)||null;
  if(!folder){const matches=folders.filter(f=>P.norm(f.name)===P.norm(name));
   if(mode==='move'&&matches.length>1){toast('Hay varias carpetas con ese nombre: selecciona una ruta de la lista.');return;}
   folder=matches.length===1?matches[0]:null;
  }
  if(!folder){folder={id:'folder-'+crypto.randomUUID(),name,parentId:null,createdAt:new Date().toISOString()};await DB.put('folders',folder);}
  if(mode==='move'){const ids=selected.size?[...selected]:currentId?[currentId]:[];
   for(const id of ids){const meta=await DB.get('chats',id);if(DB.visible(meta)&&!meta.deletedAt)await DB.updateMeta(id,{folderId:folder.id});}
   selected.clear();}
 }
 $('folder-dialog').close();await refresh();setFolder(folder.id);
 toast((mode==='rename'?'Carpeta renombrada: ':mode==='subfolder'?'Subcarpeta creada: ':'Carpeta preparada: ')+name);
}
function openFolderDelete(id){const folder=folders.find(f=>f.id===id);if(!folder)return;
 folderDeleteTargetId=id;const report=F.stats(id,folders,all);
 $('folder-delete-title').textContent='Eliminar carpeta «'+folder.name+'»';
 $('folder-delete-summary').textContent=`Se eliminará la carpeta «${F.folderPath(id,folders)}» y ${report.subfolders} subcarpeta${report.subfolders===1?'':'s'}. ${report.chats} conversación${report.chats===1?'':'es'} perderá${report.chats===1?'':'n'} esta organización local y volverá${report.chats===1?'':'n'} al catálogo general.`;
 $('folder-delete-warning').textContent=report.subfolders?'Atención: se eliminará también toda la estructura de subcarpetas, incluidos sus niveles inferiores. No se eliminarán las conversaciones.':'Solo se elimina esta carpeta virtual. No se eliminan conversaciones.';
 $('folder-delete-ack').checked=false;
 $('folder-delete-confirm').disabled=true;
 $('folder-delete-dialog').showModal();
}
async function confirmFolderDelete(){const id=folderDeleteTargetId;if(!id||!$('folder-delete-ack').checked)return;
 const folder=folders.find(f=>f.id===id);if(!folder){$('folder-delete-dialog').close();toast('Esta carpeta ya no existe.');return;}
 const report=F.stats(id,folders,all);$('folder-delete-confirm').disabled=true;
 try{await DB.deleteFolderTree(report.folderIds);for(const oldId of report.folderIds)collapsedFolders.delete(oldId);
  localStorage.setItem('aom.collapsed-folders',JSON.stringify([...collapsedFolders]));
  $('folder-delete-dialog').close();folderDeleteTargetId=null;selected.clear();
  if(report.folderIds.includes(currentFolder))currentFolder='all';await refresh();setFolder(currentFolder);
  toast(`Carpeta eliminada: ${report.subfolders} subcarpetas retiradas; ${report.chats} chats conservados.`);
 }catch(e){toast('No se pudo eliminar la carpeta: '+e.message);}finally{$('folder-delete-confirm').disabled=false;}
}
async function captureDom(){
 // This function runs in an isolated extension world only on explicit request.
 const path=location.pathname.match(/^\/c\/([^/]+)/);if(!path)return {error:'Abre primero una conversación de ChatGPT.'};
 const candidates=['[data-testid^="conversation-turn-"]','article[data-testid*="conversation-turn"]','[data-message-author-role]','[data-testid="conversation-turn"]'];
 let nodes=[];for(const selector of candidates){nodes=[...document.querySelectorAll(selector)];if(nodes.length)break;}
 const messages=[],seen=new Set();for(const node of nodes){const test=node.getAttribute('data-testid')||'',role=node.getAttribute('data-message-author-role')|| (node.querySelector('[data-message-author-role]')?.getAttribute('data-message-author-role')) || (test.includes('user')?'user':test.includes('assistant')?'assistant':null);
  if(role!=='assistant'&&role!=='user')continue;
  const text=(node.innerText||node.textContent||'').trim();if(!text)continue;const key=role+'|'+text;if(seen.has(key))continue;seen.add(key);messages.push({role,text});}
 const sidebarTitle=document.querySelector(`a[href="${location.pathname}"]`)?.innerText?.trim();
 const title=sidebarTitle||document.title.replace(/\s*[-|]\s*ChatGPT.*$/i,'').trim()||'Chat sin título';
 return {id:decodeURIComponent(path[1]),title,createdAt:null,updatedAt:null,capturedAt:new Date().toISOString(),messages,url:location.href};
}
async function captureActive(){if(!globalThis.chrome?.permissions){toast('Instala la extensión Chrome para capturar chats.');return;}
 try{
  const granted=await chrome.permissions.request({origins:['https://chatgpt.com/*']});
  if(!granted){toast('Permiso para ChatGPT denegado.');return;}
  const tabs=await chrome.tabs.query({url:'https://chatgpt.com/c/*'});
  if(!tabs.length)throw new Error('No hay conversaciones abiertas en otra pestaña de ChatGPT.');
  tabs.sort((a,b)=>(b.lastAccessed||0)-(a.lastAccessed||0));let tab=tabs[0];
  if(tabs.length>1){const choices=tabs.map((t,i)=>`${i+1}. ${t.title||t.url||'ChatGPT'}`).join('\n');
    const n=prompt('¿Qué conversación quieres capturar?\n'+choices,'1');if(n===null)return;
    const idx=Number(n)-1;if(!Number.isInteger(idx)||idx<0||idx>=tabs.length)throw new Error('Selección de pestaña inválida');tab=tabs[idx];}
  const path=new URL(tab.url).pathname.match(/^\/c\/([a-f0-9-]{36})$/i);
  if(!path)throw new Error('La pestaña no contiene un identificador de chat válido.');
  const id=path[1].toLowerCase();let meta=await DB.get('chats',id);
  if(!meta){meta={id,title:tab.title||'Conversación de ChatGPT',createdAt:null,updatedAt:null,
    source:'ChatGPT sidebar',messageCount:0,folderId:null,manualClass:null,warnings:[]};}
  const value=await readAndStoreChat(id,meta,tab.id);
  await refresh();toast(`Captura: ${value.count} mensajes (${value.source==='dom-partial'?'visual parcial':'lectura directa'}).`);
 }catch(error){toast('Captura no realizada: '+error.message);status('Captura: '+error.message);}
}
function importFiles(files){const names=[...files].filter(f=>f.name.toLowerCase().endsWith('.json'));if(!names.length){toast('Selecciona archivos .json extraídos de OpenAI');return;}
 $('import-progress').hidden=false;$('progress-bar').style.width='0';$('progress-label').textContent='Preparando archivos...';$('start-import').disabled=true;
 if(worker)worker.terminate();worker=new Worker('js/import-worker.js');worker.onmessage=async({data})=>{
  if(data.type==='progress'){$('progress-bar').style.width=((data.bytes/data.total)*100).toFixed(1)+'%';$('progress-label').textContent=`${data.file}: ${data.count} chats leídos · ${Math.round(data.bytes/1024/1024)} de ${Math.round(data.total/1024/1024)} MB`;}
  if(data.type==='file-complete'){status(`Importado ${data.file} · ${data.count} conversaciones · ${data.invalid} registros omitidos`);}
  if(data.type==='complete'){$('import-progress').hidden=true;$('import-dialog').close();worker.terminate();worker=null;await refresh();toast(`Importación completada: ${data.total} conversaciones · ${data.invalid} registros omitidos`);status('Importación local terminada; OpenAI no ha sido modificado.');}
  if(data.type==='error'){$('progress-label').textContent='Error: '+data.message;$('start-import').disabled=false;worker.terminate();worker=null;toast('Error de importación: '+data.message);}
 };worker.postMessage({type:'import',files:names,preserveRaw:$('preserve-raw').checked});
}

// Live inventory: read only the links currently rendered in a ChatGPT sidebar.
// No hidden API requests, no automatic scrolling, no invented dates and no account mutations.
async function scanLive(){
 const btn=$('live-scan');btn.disabled=true;status('Leyendo enlaces de ChatGPT visibles…');
 try{
  const permission=await chrome.permissions.request({origins:['https://chatgpt.com/*']});
  if(!permission)throw new Error('No se concedió permiso para leer ChatGPT.');
  const tabs=await chrome.tabs.query({url:'https://chatgpt.com/*'});
  const tab=tabs.find(t=>t.active)||tabs.sort((a,b)=>(b.lastAccessed||0)-(a.lastAccessed||0))[0];
  if(!tab)throw new Error('Abre una pestaña de ChatGPT para leer los chats disponibles.');
  const result=await chrome.scripting.executeScript({target:{tabId:tab.id},func:L.snapshotSidebar});
  const data=result?.[0]?.result;
  if(!data||data.error)throw new Error(data?.error||'No se pudo leer la barra lateral.');
  const items=L.normalizeRows(data.items);
  if(!items.length)throw new Error('No se han encontrado chats en la barra lateral cargada. Abre el historial de ChatGPT e inténtalo de nuevo.');
  const now=new Date().toISOString();let fresh=0;
  for(const item of items){
   const old=await DB.get('chats',item.id);
   if(old){if(DB.visible(old))await DB.updateMeta(item.id,{liveDetectedAt:now});continue;}
   await DB.put('chats',{id:item.id,title:item.title,source:'ChatGPT sidebar',createdAt:null,updatedAt:null,messageCount:0,
     warnings:['Solo se ha detectado el enlace de la barra lateral; no hay fecha ni mensajes verificados.'],liveDetectedAt:now,
     folderId:null,manualClass:null,deletedAt:null,remoteDeletedAt:null});
   await DB.put('messages',{id:item.id,messages:[]});fresh++;
  }
  await refresh();setFolder('all');
  $('age').value='0';await filterAndRender();
  toast(`${items.length} enlaces visibles (${fresh} nuevos). Historial completo no confirmado.`);
  status(`ChatGPT visible: ${items.length} enlaces detectados. Cobertura de la cuenta NO garantizada.`);
 }catch(error){toast('No se pudo leer ChatGPT: '+error.message);status('Lectura de ChatGPT no realizada.');}
 finally{btn.disabled=false;}
}


// Read-only full-index attempt using the same *undocumented* backend that ChatGPT's
// web interface uses. Explicit opt-in; no stored auth token or remote mutations.
async function syncHistory(){
 if(syncingHistory)return;
 const btn=$('sync-history');
 let granted;
 try{granted=await chrome.permissions.request({origins:['https://chatgpt.com/*']});}
 catch(_){toast('Chrome no concedió acceso al sitio.');return;}
 if(!granted){toast('Permiso opcional denegado. Puedes seguir usando lectura visual o JSON.');return;}
 if(!confirm('Sincronización de SOLO LECTURA de la cuenta ChatGPT. Utiliza rutas internas no documentadas del propio sitio: podrían cambiar y el índice podría no contener chats archivados o de proyectos. No almacena contraseñas ni tokens. ¿Comenzar?'))return;
 const tabs=await chrome.tabs.query({url:'https://chatgpt.com/*'});
 const tab=tabs.find(t=>t.active)||tabs.sort((a,b)=>(b.lastAccessed||0)-(a.lastAccessed||0))[0];
 if(!tab){toast('Abre una pestaña de ChatGPT con tu sesión iniciada.');return;}
 syncingHistory=true;stopHistory=false;btn.disabled=true;$('stop-sync').hidden=false;$('stop-sync').disabled=false;
 let offset=0,pages=0,account=null,rows=[],outcome='incompleta',lastError=null;
 const LIMIT=100,MAX_PAGES=100;
 try {
  for(let page=0;page<MAX_PAGES&&!stopHistory;page++){
   status(`Sincronizando cuenta en solo lectura: ${offset} chats consultados. Ninguno se eliminará…`);
   const result=await chrome.scripting.executeScript({target:{tabId:tab.id},world:'MAIN',func:L.readHistoryPage,args:[offset,LIMIT]});
   const data=result?.[0]?.result;
   if(!data?.ok){const error=new Error(data?.error||'Respuesta de sincronización no válida.');error.http=data?.status;throw error;}
   if(account&&account!==data.accountKey)throw new Error('La cuenta ha cambiado durante la sincronización.');
   account=data.accountKey;
   if(!account)throw new Error('Identidad de cuenta desconocida.');
   if(localStorage.getItem('aom.accountFingerprint')&&localStorage.getItem('aom.accountFingerprint')!==account)
    throw new Error('Esta extensión conserva chats de otra cuenta. No se mezclarán automáticamente.');
   rows.push(...L.normalizeHistoryPage(data.items));
   pages++;offset+=data.count;
   if(data.count<LIMIT){outcome='terminada';break;}
   await new Promise(resolve=>setTimeout(resolve,220));
  }
  if(stopHistory){status(`Sincronización detenida tras ${offset} elementos consultados. No se ha mezclado un catálogo parcial.`);return;}
  if(outcome!=='terminada')throw new Error('Límite de '+MAX_PAGES+' páginas alcanzado. No se incorporó un catálogo parcial.');
  const unique=new Map(rows.map(x=>[x.id,x]));
  const added=await DB.mergeHistoryMetadata([...unique.values()],new Date().toISOString());
  localStorage.setItem('aom.accountFingerprint',account);
  await refresh();setFolder('all');$('age').value='0';await filterAndRender();
  const msg=`Sincronización de índice terminada: ${unique.size} chats con ID y título (${added.inserted} nuevos, ${added.updated} actualizados). No se descargaron mensajes ni se borró nada. La cobertura puede excluir archivados y otros casos.`;
  status(msg);toast(msg);
 } catch(error){lastError=error;status(`Sincronización detenida: ${error.message}. El catálogo anterior sigue intacto.`);toast('Sincronización fallida: '+error.message);}
 finally{syncingHistory=false;btn.disabled=false;$('stop-sync').hidden=true;}
}

// Import any verified link discoveries without overwriting imported content or dates.
async function mergeDiscovered(items, source){
 const rows=L.normalizeRows(items),now=new Date().toISOString();let fresh=0;
 for(const item of rows){const old=await DB.get('chats',item.id);
  if(old){if(DB.visible(old))await DB.updateMeta(item.id,{liveDetectedAt:now});continue;}
  await DB.put('chats',{id:item.id,title:item.title,source,createdAt:null,updatedAt:null,messageCount:0,
    warnings:['Enlace detectado; no se han comprobado fechas ni contenido.'],liveDetectedAt:now,
    folderId:null,manualClass:null,deletedAt:null,remoteDeletedAt:null});
  await DB.put('messages',{id:item.id,messages:[]});fresh++;
 }
 await refresh();setFolder('all');$('age').value='0';await filterAndRender();
 return {count:rows.length,fresh};
}
let latestSearchDiagnostic=null;
async function scanByMode(btnId,fn,label){
 const btn=$(btnId);btn.disabled=true;status(label);
 try{
  const granted=await chrome.permissions.request({origins:['https://chatgpt.com/*']});
  if(!granted)throw new Error('Permiso para ChatGPT denegado.');
  const tabs=await chrome.tabs.query({url:'https://chatgpt.com/*'});
  if(!tabs.length)throw new Error('Abre una pestaña ChatGPT.');
  // Search is a dialog on a *different tab*. Scan all ChatGPT tabs, rather than
  // assuming the tab Chrome last marked active holds the still-open dialog.
  const ordered=tabs.sort((a,b)=>(Number(b.active)-Number(a.active))||((b.lastAccessed||0)-(a.lastAccessed||0)));
  let found=[], scanned=0, searches=0, unlinked=0, resultRows=0, failed=0;
  const diagnostics=[];
  for(const tab of (btnId==='live-search'?ordered:ordered.slice(0,1))){
   try{
    const response=await chrome.scripting.executeScript({target:{tabId:tab.id},func:fn});
    const data=response?.[0]?.result;
    if(!data||data.error){failed++;continue;}
    scanned++;found.push(...(data.items||[]));
    if(data.searchUiDetected)searches++;
    unlinked+=data.unlinkedRows||0;resultRows+=data.resultRows||0;
    if(data.diagnostic)diagnostics.push({tabId:tab.id,document:data.diagnostic});
   }catch(_){failed++;}
  }
  latestSearchDiagnostic={version:'0.5.1',tabsDetected:tabs.length,tabsRead:scanned,searchDialogs:searches,
    rowsWithoutLinks:unlinked,resultRows,identifiedIds:L.normalizeRows(found).length,failedTabs:failed,
    tabs:diagnostics};
  $('copy-search-diagnostic').hidden=btnId!=='live-search';
  if(!found.length){
   if(btnId==='live-search'){
    const detail=searches
      ?`Se detectó la búsqueda en ${searches} pestaña(s), pero ningún resultado expuso un ID /c/ verificable. Filas reconocidas: ${resultRows}. Usa «Copiar diagnóstico» para revisar su estructura sin compartir los chats.`
      :`No se detectó una ventana de búsqueda abierta en las ${scanned} pestañas de ChatGPT inspeccionadas. Déjala abierta mientras pulsas «Leer búsqueda».`;
    status(detail);toast(detail);return;
   }
   throw new Error('No aparecen más enlaces de chats; la barra lateral puede tener un límite de carga.');
  }
  const merged=await mergeDiscovered(found,btnId==='live-search'?'ChatGPT búsqueda':'ChatGPT sidebar');
  const suffix=btnId==='live-search'?` · ${searches} búsqueda(s), ${resultRows} filas sin garantía de enlace`:'';
  toast(`${merged.count} identificados · ${merged.fresh} nuevos${suffix}.`);
  status(`Inventario conocido: ${all.filter(x=>!x.deletedAt).length}. ${suffix} Cobertura total desconocida.`);
 }catch(error){toast('Exploración: '+error.message);status(error.message)}finally{btn.disabled=false;}
}
async function scanDeep(){return scanByMode('live-deep',L.scanExpandedSidebar,'Recorriendo la barra lateral sin abrir ni borrar chats…');}
async function scanSearch(){return scanByMode('live-search',L.snapshotSearchResults,'Leyendo búsquedas abiertas en todas las pestañas de ChatGPT…');}
async function copySearchDiagnostic(){
 if(!latestSearchDiagnostic){toast('Ejecuta primero «Leer búsqueda».');return;}
 const value=JSON.stringify(latestSearchDiagnostic,null,2);
 try{await navigator.clipboard.writeText(value);toast('Diagnóstico estructural copiado; no incluye títulos, mensajes ni consultas.');}
 catch(_){toast('No se pudo copiar el diagnóstico; revisa los permisos del portapapeles.');}
}
// Enrich links already discovered, by loading each known chat as the user requested.
// This cannot discover chats whose IDs are unknown; never fake creation/modification dates.
async function hydrateSelected(){
 if(hydrating)return;
 const ids=[...selected].filter(id=>!String(id).startsWith('local-'));
 if(!ids.length){toast('Selecciona chats conocidos para leer su contenido.');return;}
 if(ids.length>100){toast('Máximo 100 chats por lectura. Divide la selección para controlar los fallos.');return;}
 const granted=await chrome.permissions.request({origins:['https://chatgpt.com/*']});
 if(!granted){toast('Permiso denegado.');return;}
 hydrating=true;hydrateStop=false;$('hydrate').disabled=true;$('hydrate-stop').hidden=false;
 let good=0,fail=0,page=null;
 try{
  page=await pageForRead();
  for(let i=0;i<ids.length;i++){
   if(hydrateStop)break;
   const id=ids[i],meta=await DB.get('chats',id),stored=await DB.get('messages',id);
   if(!meta||meta.remoteDeletedAt)continue;
   if((stored?.messages||[]).length){good++;continue;}
   status(`Recuperando mensajes ${i+1}/${ids.length}: ${meta.title}`);
   try{
    const value=await readAndStoreChat(id,meta,page.tabId);
    status(`Leídos ${value.count} mensajes de ${meta.title}.`);good++;
   }catch(error){fail++;status(`Error leyendo ${meta.title}: ${error.message}.`);
    if([401,403,429].includes(error.status)){
     status('Lectura detenida por sesión o límite de solicitudes; conserva lo ya leído.');break;
    }
   }
   await new Promise(r=>setTimeout(r,250));
  }
 }finally{
  if(page?.created)try{await chrome.tabs.remove(page.tabId)}catch(_){ }
  hydrating=false;$('hydrate-stop').hidden=true;$('hydrate').disabled=false;
  await refresh();status(`Lectura terminada: ${good} con contenido, ${fail} sin leer${hydrateStop?' (detenida)':''}. Ningún chat eliminado.`);
  toast(`Lectura: ${good} con contenido, ${fail} fallos. Ningún chat eliminado.`);
 }
}

// Borrado remoto individual, en lote aprobado; ninguna clasificación bloquea gestionar un chat.
function putRemoteLog(message,ok=false){
 const line=document.createElement('div');line.className='remote-log-line'+(ok?' remote-log-ok':'');line.textContent=message;$('remote-results').appendChild(line);
 line.scrollIntoView({block:'nearest'});
}
async function buildRemoteList(){
 if(remoteWorking) return;
 const ids=[...selected];if(!ids.length){toast('Selecciona conversaciones para borrar.');return;}
 const age=Number($('age').value),rows=[];
 for(const id of ids){
  const meta=await DB.get('chats',id), rec=await DB.get('messages',id);
  const body=(rec?.messages||[]).map(m=>m.text).join('\n');
  const cls=meta?classification(meta,body):null;
  if(!B.eligible(meta,cls,age)) {toast('Selección bloqueada: hay chats sin identificador válido, fuera del rango de fechas elegido o ya borrados.');return;}
  const first=(rec?.messages||[]).find(m=>m.role==='user'&&m.text?.trim())?.text||'';
  // For sync-only chats, do not require a pre-export; verify the title on the real page.
  rows.push({id,title:meta.title,signature:P.norm(first).length>=12?first:null,updatedAt:meta.updatedAt});
 }
 remotePending=rows;$('remote-summary').textContent=`${rows.length} conversaciones seleccionadas · ${age?`Más de ${age} días (fechas verificadas)`:'Sin límite de antigüedad: puede incluir chats recientes y personales'}. La eliminación real es irreversible.`;
 const list=$('remote-list');list.replaceChildren();for(const [i,item] of rows.entries()){
  const d=document.createElement('div');d.className='remote-chat';d.innerHTML=`<span class="remote-item-index">${i+1}</span><div class="remote-item-info"><strong>${esc(item.title)}</strong><small>${esc(fmtDate(item.updatedAt))} · ID: ${esc(item.id)}</small></div>`;list.appendChild(d);
 }
 // Use ID-based method for a bound account; require new explicit consent per batch.
 $('remote-method').value=B.preferredMethod(localStorage.getItem('aom.accountFingerprint'));
 $('remote-session-ack').checked=false;
 $('remote-preflight-result').hidden=true;$('remote-preflight-result').textContent='';
 validateRemoteApproval();
 $('remote-ack').checked=false;$('remote-phrase').value='';$('remote-phrase-label').textContent=`BORRAR ${rows.length}`;
 $('remote-progress').hidden=true;$('remote-review').hidden=false;$('remote-start').disabled=true;
 $('remote-dialog').showModal();
}
function validateRemoteApproval(){
 const isSession=$('remote-method').value==='session';
 $('remote-session-notice').hidden=!isSession;
 const bound=B.preferredMethod(localStorage.getItem('aom.accountFingerprint'))==='session';
 $('remote-session-ack').disabled=isSession&&!bound;
 $('remote-start').disabled=remoteWorking||!$('remote-ack').checked||$('remote-phrase').value.trim()!==`BORRAR ${remotePending.length}`||(isSession&&(!bound||!$('remote-session-ack').checked));

}
async function waitForRemoteIdentity(tabId,item){
 let r;
 for(let attempt=0;attempt<12;attempt++){
  r=await B.execute(tabId,item.id,null,'identity');
  if(r.ok) return r;
  if(r.stage!=='identidad'||/no coincide|demasiado corta/i.test(r.reason))break;
  await new Promise(resolve=>setTimeout(resolve,900));
 }
 return r;
}
async function preflightRemote(){
 const item=remotePending[0];if(!item||remoteWorking)return;
 $('remote-test').disabled=true;
 let tab=null;
 try{
  const permission=await chrome.permissions.request({origins:['https://chatgpt.com/*']});
  if(!permission)throw new Error('Permiso para chatgpt.com denegado.');
  tab=await B.openChatTab(item.id);await B.waitLoaded(tab);
  const isSession=$('remote-method').value==='session';
  // A session check verifies account and immutable UUID in ChatGPT's response.
  // No stale title, sidebar row or rendered conversation is required.
  if(!isSession){
   const check=await waitForRemoteIdentity(tab,item);
   if(!check?.ok)throw new Error(check?.reason||'Fallo de identidad');
  }
  const result=isSession
    ?await B.executeSession(tab,item.id,'check',localStorage.getItem('aom.accountFingerprint'))
    :await B.execute(tab,item.id,{title:item.title,signature:item.signature},'locate');
  if(!result.ok)throw new Error(result.stage+': '+result.reason);
  $('remote-preflight-result').hidden=false;
  $('remote-preflight-result').textContent='✓ '+result.reason;
  toast('Prueba superada en el primer chat. No se eliminó nada.');
 }catch(error){
  $('remote-preflight-result').hidden=false;$('remote-preflight-result').textContent='Verificación detenida: '+error.message;
  toast('Prueba sin borrado: '+error.message);
 }
 finally{if(tab!==null)try{await chrome.tabs.remove(tab)}catch(_){} $('remote-test').disabled=false;}
}
async function runRemoteBatch(){
 if(remoteWorking||$('remote-start').disabled||!remotePending.length)return;
 // Chrome requires permission request from a direct user click.
 const permission=await chrome.permissions.request({origins:['https://chatgpt.com/*']});
 if(!permission){toast('Sin permiso de Chrome no se modifica ChatGPT.');return;}
 remoteWorking=true;remoteStop=false;$('remote-review').hidden=true;$('remote-progress').hidden=false;$('remote-results').replaceChildren();
 $('close-remote').disabled=true;$('remote-done').hidden=true;$('remote-stop').disabled=false;
 const batch=remotePending.slice();const useSession=$('remote-method').value==='session';
 const consented=useSession&&$('remote-session-ack').checked;
 const accountFingerprint=localStorage.getItem('aom.accountFingerprint');
 if(useSession&&(!consented||!accountFingerprint)){remoteWorking=false;toast('Método por ID bloqueado: falta autorización específica o sincronización vinculada.');$('remote-review').hidden=false;$('remote-progress').hidden=true;$('close-remote').disabled=false;return;}
 let succeeded=0,processed=0,tabId=null,failure=null;
 try{
  for(let i=0;i<batch.length;i++){
   if(remoteStop)break;
   const item=batch[i];$('remote-progress-label').textContent=`Procesando ${i+1}/${batch.length}: ${item.title}`;
   // Refresco conservador: proteger frente a cambios en filtros o catálogo mientras se procesa.
   const meta=await DB.get('chats',item.id),rec=await DB.get('messages',item.id);
   const classificationNow=meta?classification(meta,(rec?.messages||[]).map(m=>m.text).join('\n')):null;
   if(!B.eligible(meta,classificationNow,Number($('age').value))){failure='La conversación dejó de cumplir las condiciones de selección.';putRemoteLog('DETENIDO: '+failure);break;}
   try{
    tabId=await B.openChatTab(item.id,tabId);await B.waitLoaded(tabId);
    // The visual route uses the DOM. The session method verifies account + UUID
    // directly from ChatGPT's response, so do not impose a DOM check on it.
    if(!useSession){
     const check=await waitForRemoteIdentity(tabId,item);
     if(!check?.ok)throw new Error('Identidad no verificada: '+(check?.reason||'sin respuesta'));
    }
    // Cada conversación se procesa independientemente tras una sola aprobación del lote.
    const submitted=useSession
      ?await B.executeSession(tabId,item.id,'delete',accountFingerprint)
      :await B.execute(tabId,item.id,{title:item.title,signature:item.signature},'delete');
    if(!submitted.ok)throw new Error(submitted.stage+': '+submitted.reason);
    const outcome=useSession?submitted:await B.confirmResult(tabId,item.id);
    if(!outcome.ok)throw new Error(outcome.stage+': '+outcome.reason);
    await DB.updateMeta(item.id,{remoteDeletedAt:new Date().toISOString(),remoteDeleteEvidence:outcome.reason,folderId:null});
    putRemoteLog(`✓ ${item.title} — ChatGPT confirmó la acción`,true);succeeded++;processed++;
    await new Promise(resolve=>setTimeout(resolve,600));
   }catch(error){processed++;failure=`${item.title}: ${error.message}`;putRemoteLog(`DETENIDO: ${failure}`);break;}
   $('remote-progress-bar').value=100*processed/batch.length;
  }
 }finally{
  if(tabId!==null)try{await chrome.tabs.remove(tabId)}catch(_){}
  remoteWorking=false;
  $('remote-stop').disabled=true;$('close-remote').disabled=false;$('remote-done').hidden=false;
  const remaining=batch.length-processed;
  $('remote-progress-label').textContent=`Resultado: ${succeeded} confirmados · ${failure?'incidencia detectada':remoteStop?'detenido por usuario':'lote finalizado'} · ${remaining} no procesados.`;
  if(failure)putRemoteLog('Revisa el chat detenido antes de intentar otro lote. No se repite automáticamente.');
  selected.clear();await refresh();
 }
}

// Bind controls
$('open-import').onclick=()=>{$('import-dialog').showModal()};$('start-import').onclick=()=>importFiles(pendingDropFiles||$('import-files').files);
$('import-files').onchange=e=>{pendingDropFiles=null,remotePending=[],remoteWorking=false,remoteStop=false;$('start-import').disabled=!e.target.files.length};
const dropzone=$('dropzone');dropzone.addEventListener('dragover',e=>{e.preventDefault();dropzone.classList.add('drag-hover')});dropzone.addEventListener('dragleave',()=>dropzone.classList.remove('drag-hover'));dropzone.addEventListener('drop',e=>{e.preventDefault();dropzone.classList.remove('drag-hover');const list=e.dataTransfer.files;pendingDropFiles=list;$('start-import').disabled=!list.length;});
$('sync-history').onclick=syncHistory;$('stop-sync').onclick=()=>{stopHistory=true;$('stop-sync').disabled=true;toast('Se detendrá tras la respuesta actual.');};$('copy-search-diagnostic').onclick=copySearchDiagnostic;$('live-scan').onclick=scanLive;$('live-deep').onclick=scanDeep;$('live-search').onclick=scanSearch;$('hydrate').onclick=hydrateSelected;$('hydrate-stop').onclick=()=>{hydrateStop=true;};$('capture').onclick=captureActive;$('backup').onclick=openBackup;
$('remote-delete').onclick=buildRemoteList;$('remote-test').onclick=preflightRemote;
$('remote-start').onclick=runRemoteBatch;$('remote-ack').onchange=validateRemoteApproval;$('remote-phrase').oninput=validateRemoteApproval;
$('remote-method').onchange=validateRemoteApproval;$('remote-session-ack').onchange=validateRemoteApproval;
$('remote-stop').onclick=()=>{remoteStop=true;$('remote-stop').disabled=true;toast('Se detendrá después del chat actual.');};
$('remote-done').onclick=()=>$('remote-dialog').close();$('close-remote').onclick=()=>{if(!remoteWorking)$('remote-dialog').close()};$('confirm-backup').onclick=performBackup;
$('local-delete').onclick=openDelete;$('confirm-delete').onclick=performDelete;$('restore').onclick=restore;
$('new-folder').onclick=()=>openFolderDialog(false);$('move').onclick=()=>openFolderDialog(true);$('folder-confirm').onclick=saveFolder;$('folder-name').oninput=showFolderSuggestions;$('folder-name').onfocus=showFolderSuggestions;
$('folder-delete-ack').onchange=()=>{$('folder-delete-confirm').disabled=!$('folder-delete-ack').checked;};
$('folder-delete-confirm').onclick=confirmFolderDelete;
$('folder-delete-close').onclick=()=>{$('folder-delete-dialog').close();};
$('folder-delete-cancel').onclick=()=>{$('folder-delete-dialog').close();};
document.addEventListener('pointerdown',e=>{const menu=$('folder-context-menu');if(!menu.hidden&&!menu.contains(e.target)&&!e.target.closest('.folder-more'))hideFolderMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideFolderMenu();});
window.addEventListener('scroll',hideFolderMenu,true);
$('filters-toggle').onclick=()=>{$('filters').hidden=!$('filters').hidden};$('apply-filters').onclick=()=>{selected.clear();settingsFromUI();filterAndRender();toast('Filtros aplicados')};
$('search').oninput=()=>{selected.clear();clearTimeout(window.__searchTimer);window.__searchTimer=setTimeout(filterAndRender,150)};
$('age').onchange=()=>{selected.clear();filterAndRender()};$('search-mode').onchange=()=>{selected.clear();settingsFromUI();filterAndRender()};
$('select-visible').onchange=e=>{const ids=filtered.slice(0,pageSize).filter(m=>!m.remoteDeletedAt).map(m=>m.id);for(const id of ids)e.target.checked?selected.add(id):selected.delete(id);renderRows();renderSelection()};
$('more').onclick=()=>{pageSize+=100;renderRows();renderSelection()};
for(const b of document.querySelectorAll('[data-sort]'))b.onclick=()=>{const key=b.dataset.sort;if(key===sortKey)sortAsc=!sortAsc;else{sortKey=key;sortAsc=key==='title';}filterAndRender()};
$('include').value=settings.include;$('exclude').value=settings.exclude;$('match').value=settings.match;$('search-mode').value=settings.searchMode;
try{await DB.open();await refresh();status('Preparado · Los datos permanecen en Chrome, sin envío externo.');}catch(error){status('Error al abrir almacenamiento: '+error.message);toast('No se pudo abrir IndexedDB: '+error.message);}
})();
