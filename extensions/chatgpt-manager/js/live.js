/* Auri–Orion Utilities — read-only browser inventory. No private endpoints.
 * All functions injected in chatgpt.com by a user click must be self-contained.
 */
(function(root){
'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function normalizeRows(rows){
 const out=new Map();for(const r of rows||[]){
  const m=String(r.href||'').match(/(?:^|\/)c\/([0-9a-f-]{36})(?:[/?#]|$)/i);
  if(!m||!UUID.test(m[1]))continue;
  const title=String(r.title||'').replace(/\s+/g,' ').trim().slice(0,500);
  if(title&&!out.has(m[1].toLowerCase()))out.set(m[1].toLowerCase(),{id:m[1].toLowerCase(),title});
 }return [...out.values()];
}
function snapshotSidebar(){
 if(location.hostname!=='chatgpt.com')return {error:'Pestaña incorrecta'};
 const seen=new Map();
 for(const a of document.querySelectorAll('a[href*="/c/"]')){
  const match=(a.getAttribute('href')||'').match(/(?:^|\/)c\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[/?#]|$)/i);
  if(!match||!a.closest('nav, aside, [data-testid="history"], [data-testid*="sidebar"]'))continue;
  const title=(a.getAttribute('title')||a.innerText||a.textContent||'').replace(/\s+/g,' ').trim().slice(0,500);
  if(title)seen.set(match[1].toLowerCase(),{href:a.getAttribute('href'),title});
 }
 return {items:[...seen.values()],partial:true,mode:'sidebar-visible'};
}
async function scanExpandedSidebar(){
 if(location.hostname!=='chatgpt.com')return {error:'Pestaña incorrecta'};
 const sleep=ms=>new Promise(r=>setTimeout(r,ms)),seen=new Map();
 const record=()=>{for(const a of document.querySelectorAll('a[href*="/c/"]')){
  if(!a.closest('nav, aside, [data-testid="history"], [data-testid*="sidebar"]'))continue;
  const match=(a.getAttribute('href')||'').match(/(?:^|\/)c\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[/?#]|$)/i);
  if(!match)continue;
  const title=(a.getAttribute('title')||a.innerText||a.textContent||'').replace(/\s+/g,' ').trim().slice(0,500);
  if(title)seen.set(match[1].toLowerCase(),{href:a.getAttribute('href'),title});
 }};
 record();
 const roots=[...document.querySelectorAll('nav,aside,[data-testid="history"],[data-testid*="sidebar"]')]
   .filter(r=>r.querySelector('a[href*="/c/"]'));
 const containers=new Set();
 for(const root of roots){let el=root;for(let depth=0;el&&depth<7;depth++,el=el.parentElement){
   if(el.scrollHeight>el.clientHeight+60&&el.clientHeight>100&&el.clientWidth<Math.max(800,window.innerWidth*.65))containers.add(el);
 }}
 let moved=0,failed=0;const els=[...containers].sort((a,b)=>a.clientWidth-b.clientWidth).slice(0,3);
 for(const el of els){const initial=el.scrollTop;try{
   el.scrollTop=0;await sleep(110);record();let stagnation=0;
   for(let i=0;i<140;i++){
     const before=el.scrollTop,count=seen.size;
     el.scrollTop=Math.min(el.scrollHeight,el.scrollTop+Math.max(150,Math.round(el.clientHeight*.7)));
     await sleep(140);record();moved++;
     if(el.scrollTop===before&&seen.size===count)stagnation++;else stagnation=0;
     if(stagnation>=4)break;
   }
  }catch(_){failed++;}finally{el.scrollTop=initial;}
 }
 record();return {items:[...seen.values()],partial:true,mode:'sidebar-scroll',scrollContainers:els.length,scrollSteps:moved,scanFailures:failed};
}
function snapshotSearchResults(){
 if(location.hostname!=='chatgpt.com')return {error:'Pestaña incorrecta'};
 // ChatGPT may render search matches as React buttons rather than <a href="/c/…">.
 // Never manufacture a conversation ID from its title or search snippet.
 const UUID_PATTERN='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
 const route=new RegExp('(?:^|\\/)c\\/('+UUID_PATTERN+')(?:[/?#]|$)','i');
 const exact=new RegExp('^'+UUID_PATTERN+'$','i');
 const roots=new Set();
 const selectors='[role="dialog"], [aria-modal="true"], [cmdk-root], [data-testid*="search"], [role="listbox"]';
 for(const root of document.querySelectorAll(selectors)){
  if(root.querySelector('input,[role="searchbox"],[role="combobox"]'))roots.add(root);
 }
 // Fallback for search overlays whose root has no documented role.
 for(const input of document.querySelectorAll('input,[role="searchbox"]')){
  const placeholder=String(input.getAttribute('placeholder')||input.getAttribute('aria-label')||'');
  if(!/buscar|search/i.test(placeholder)&&!input.closest('[role="dialog"],[aria-modal="true"],[cmdk-root]'))continue;
  let root=input.closest('[role="dialog"],[aria-modal="true"],[cmdk-root],[role="listbox"]');
  if(!root){root=input.parentElement;for(let i=0;root&&i<5;i++,root=root.parentElement){
   if(root.querySelectorAll('[role="option"],[role="listitem"],[data-testid*="result"],button').length>=3)break;
  }}
  if(root&&root!==document.body)roots.add(root);
 }
 const seen=new Map(),unlinked=[];
 let inputs=0, resultRows=0;
 const hints=new Map();
 const validTitle=node=>String(node.getAttribute?.('title')||node.getAttribute?.('aria-label')||node.innerText||node.textContent||'').replace(/\s+/g,' ').trim().slice(0,500);
 const takeId=(node)=>{
  for(const name of ['href','data-href','data-url','data-to','data-path','data-conversation-id','data-chat-id']){
   const value=String(node.getAttribute?.(name)||'');if(!value)continue;
   const match=value.match(route);
   if(match)return {id:match[1],href:value};
   if((name==='data-conversation-id'||name==='data-chat-id')&&exact.test(value))return {id:value,href:'/c/'+value};
  }
  return null;
 };
 for(const root of roots){
  const input=root.querySelector('input,[role="searchbox"],[role="combobox"]');if(!input)continue;
  inputs++;
  // Search all descendants with a strictly checkable URL/ID, not just anchor elements.
  for(const node of root.querySelectorAll('a[href], [data-href], [data-url], [data-to], [data-path], [data-conversation-id], [data-chat-id]')){
   const target=takeId(node);if(!target)continue;
   const row=node.closest('[role="option"], [role="listitem"], [data-testid*="result"], a, button')||node;
   const title=validTitle(row)||validTitle(node);
   if(title)seen.set(target.id.toLowerCase(),{href:target.href,title});
  }
  const rows=root.querySelectorAll('[role="option"], [role="listitem"], [cmdk-item], [data-testid*="result"], [data-testid*="Result"], [data-conversation-id]');
  resultRows+=rows.length;
  for(const node of rows){
   if(takeId(node))continue;
   if(unlinked.length<20){const title=validTitle(node);if(title)unlinked.push(title.slice(0,80));}
   const key=(node.tagName||'unknown').toLowerCase()+'/'+(node.getAttribute?.('role')||'none');
   if(!hints.has(key))hints.set(key,[...(node.attributes||[])].map(a=>a.name).filter(n=>/^(role|data-|href|aria-|class)/.test(n)).slice(0,10));
  }
 }
 return {items:[...seen.values()],partial:true,mode:'search-results',searchUiDetected:roots.size>0,
  rootCount:roots.size,inputCount:inputs,resultRows,unlinkedRows:unlinked.length,
  // Structural summary only: no private search text, titles or snippets in diagnostics.
  diagnostic:{rootCount:roots.size,inputCount:inputs,resultRows,linkIds:seen.size,unlinkedRows:unlinked.length,
    elementShapes:[...hints.entries()].slice(0,10).map(([type,attributes])=>({type,attributes}))}};
}

// User-initiated, READ-ONLY account index page. Undocumented ChatGPT web API;
// do not store, return, log or transmit the bearer token beyond this page.
// Chrome injects this in MAIN world only when user explicitly confirms sync.
async function readHistoryPage(offset,limit){
 try {
  if(location.hostname!=='chatgpt.com')throw new Error('Dominio diferente de ChatGPT.');
  if(!Number.isSafeInteger(offset)||offset<0||limit!==100)throw new Error('Paginación incorrecta.');
  const sessionResponse=await fetch('/api/auth/session',{credentials:'include',cache:'no-store'});
  if(!sessionResponse.ok)throw new Error('Sesión no disponible (HTTP '+sessionResponse.status+').');
  const session=await sessionResponse.json();
  const token=session&&session.accessToken;
  const subject=String(session?.user?.id||session?.account?.id||'');
  if(typeof token!=='string'||!token||!subject)throw new Error('No se reconoce la identidad de la cuenta.');
  const bytes=new TextEncoder().encode(subject),digest=await crypto.subtle.digest('SHA-256',bytes);
  const accountKey=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
  const response=await fetch('/backend-api/conversations?offset='+offset+'&limit='+limit,{
   credentials:'include',cache:'no-store',headers:{'Authorization':'Bearer '+token}
  });
  if(!response.ok){const e=new Error('No se pudo leer el historial (HTTP '+response.status+').');e.status=response.status;throw e;}
  const raw=await response.json();
  if(!raw||!Array.isArray(raw.items))throw new Error('Formato de respuesta de ChatGPT desconocido.');
  // Whitelist: never return auth material, messages, or unrelated account data.
  const items=raw.items.map(c=>({
   id:String(c?.id||''), title:String(c?.title||'').slice(0,500),
   created:c?.create_time??null, updated:c?.update_time??null,
   projectId:c?.project_id==null?null:String(c.project_id).slice(0,100),
   archived:c?.is_archived===true
  }));
  return {ok:true,accountKey,items,count:raw.items.length};
 } catch(error) {
  return {ok:false,error:String(error?.message||'Error de sincronización'),status:Number(error?.status||0)};
 }
}
function normalizeHistoryPage(rows){
 const seen=new Set(),out=[];
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const date=value=>{
  if(value==null||value==='')return null;
  let t;if(typeof value==='number'){t=value>1e12?value*1:value*1000;}
  else if(/^\d+(?:\.\d+)?$/.test(String(value))){const n=Number(value);t=n>1e12?n:n*1000;}
  else t=Date.parse(String(value));
  return Number.isFinite(t)&&t>0&&t<=Date.now()+86400000?new Date(t).toISOString():null;
 };
 for(const r of Array.isArray(rows)?rows:[]){
  const id=String(r?.id||'').toLowerCase();if(!uuid.test(id)||seen.has(id))continue;
  const title=String(r?.title||'').replace(/\s+/g,' ').trim().slice(0,500);if(!title)continue;
  seen.add(id);out.push({id,title,createdAt:date(r.created),updatedAt:date(r.updated),projectId:r.projectId||null,archived:r.archived===true});
 }
 return out;
}


// User-initiated read-only conversation fetch. Uses a non-public same-origin web
// route; failures are expected when ChatGPT changes. No token leaves the page.
// This function MUST remain self-contained for chrome.scripting.executeScript.
async function readConversationForExport(id){
 const fail=(reason,status=0)=>({ok:false,reason,status});
 try{
  if(location.hostname!=='chatgpt.com')return fail('La pestaña no es ChatGPT.');
  const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  if(!uuid.test(String(id||'')))return fail('Identificador de chat incorrecto.');
  const sessionResponse=await fetch('/api/auth/session',{credentials:'include',cache:'no-store'});
  if(!sessionResponse.ok)return fail('Sesión de ChatGPT no disponible.',sessionResponse.status);
  const session=await sessionResponse.json(),token=session?.accessToken;
  const subject=String(session?.user?.id||session?.account?.id||'');
  if(typeof token!=='string'||!token||!subject)return fail('Falta la sesión autenticada de ChatGPT.');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(subject));
  const accountKey=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
  const resp=await fetch('/backend-api/conversation/'+encodeURIComponent(id),{
   method:'GET',credentials:'include',cache:'no-store',headers:{Authorization:'Bearer '+token}
  });
  if(!resp.ok)return fail('No se ha podido leer el chat (HTTP '+resp.status+').',resp.status);
  const data=await resp.json();
  if(!data||typeof data!=='object')return fail('El contenido devuelto no es un objeto reconocido.');
  const responseId=String(data.conversation_id||data.id||data.conversation?.id||id).toLowerCase();
  if(responseId!==String(id).toLowerCase())return fail('El ID del contenido devuelto no coincide.');
  const mapping=data.mapping||data.conversation?.mapping;
  const messages=[],warnings=new Set();
  const normalizeDate=v=>{
    if(v===undefined||v===null||v==='')return null;
    const n=typeof v==='number'?v:Number(v),t=Number.isFinite(n)?(n>1e12?n:n*1000):Date.parse(String(v));
    return Number.isFinite(t)&&t>0?new Date(t).toISOString():null;
  };
  const textFrom=content=>{
   if(!content)return '';
   const parts=Array.isArray(content.parts)?content.parts:
        typeof content.text==='string'?[content.text]:typeof content.result==='string'?[content.result]:[];
   const out=[];
   for(const part of parts){
    if(typeof part==='string'){out.push(part);continue;}
    if(!part||typeof part!=='object')continue;
    if(typeof part.text==='string')out.push(part.text);
    else if(typeof part.content==='string')out.push(part.content);
    else if(typeof part.code==='string')out.push('```'+String(part.language||'')+'\n'+part.code+'\n```');
    else if(part.asset_pointer||part.image_url||part.asset_id||part.content_type==='image_asset_pointer'){
      warnings.add('Hay imágenes o adjuntos que no están incluidos como archivos en esta exportación textual.');
      out.push('[Imagen o adjunto no incorporado]');
    } else if(part.content_type){warnings.add('Se omitieron elementos multimedia o estructurados no textuales.');}
   }
   return out.filter(Boolean).join('\n\n');
  };
  let nodes=[];
  if(mapping&&typeof mapping==='object'){
   const current=data.current_node||data.conversation?.current_node;
   const visited=new Set();let cursor=current;
   while(cursor&&mapping[cursor]&&!visited.has(cursor)&&nodes.length<3000){
    visited.add(cursor);nodes.unshift(mapping[cursor]);cursor=mapping[cursor].parent;
   }
   if(!nodes.length){
     warnings.add('Rama activa no determinada: se ordenaron mensajes por fecha; verifica su secuencia.');
     nodes=Object.values(mapping).sort((a,b)=>(a?.message?.create_time||0)-(b?.message?.create_time||0)).slice(0,3000);
   }
   if(Object.keys(mapping).length>3000||nodes.length>=3000)warnings.add('Conversación muy extensa: algunos mensajes podrían omitirse por límite de seguridad.');
   nodes=nodes.map(n=>n?.message).filter(Boolean);
  } else if(Array.isArray(data.messages)){
   nodes=data.messages.slice(0,3000);
   if(data.messages.length>3000)warnings.add('Solo se procesaron los primeros 3000 mensajes.');
  } else return fail('El formato del chat no contiene mapping ni mensajes reconocibles.');
  for(const m of nodes){
   const role=String(m?.author?.role||m?.role||'');
   if(role!=='user'&&role!=='assistant')continue;
   if(m?.metadata?.is_visually_hidden_from_conversation)continue;
   if(m?.recipient&&m.recipient!=='all')continue;
   if(['thoughts','reasoning_recap','model_editable_context','user_editable_context'].includes(m?.content?.content_type))continue;
   const content=m?.content||((typeof m?.text==='string')?{parts:[m.text]}:null);
   const text=textFrom(content);
   if(m?.metadata?.attachments?.length)warnings.add('Existen adjuntos; sus archivos binarios no se descargan.');
   if(text.trim())messages.push({role,text,createdAt:normalizeDate(m.create_time||m.createdAt)});
  }
  if(!messages.length)return fail('La respuesta no contiene mensajes de usuario/asistente exportables.');
  // A text export never claims to be a complete account backup.
  warnings.add('Copia textual; archivos externos, imágenes y elementos interactivos pueden no estar incluidos.');
  return {ok:true,id:String(id).toLowerCase(),accountKey,title:String(data.title||'').slice(0,500),
   createdAt:normalizeDate(data.create_time||data.createdAt),updatedAt:normalizeDate(data.update_time||data.updatedAt),
   messages,warnings:[...warnings],reader:'chatgpt-web-readonly'};
 }catch(e){return fail('Error de lectura del chat: '+String(e?.message||e));}
}

root.AOMLive={normalizeRows,snapshotSidebar,scanExpandedSidebar,snapshotSearchResults,readHistoryPage,normalizeHistoryPage,readConversationForExport};
})(globalThis);
