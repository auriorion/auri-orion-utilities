/* Normalize OpenAI export records and selective browser captures; no network/API calls. */
(function(root){
'use strict';
function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');}
function splitTerms(s){return String(s||'').split(',').map(x=>norm(x.trim())).filter(Boolean);}
function hits(text,terms){const t=norm(text);return terms.filter(w=>t.includes(w));}
function iso(value){if(value==null||value==='')return null;const d=new Date(typeof value==='number' ? (value<1e11?value*1000:value):value);return Number.isFinite(d.getTime())?d.toISOString():null;}
function partText(p,warnings){if(typeof p==='string')return p;if(!p||typeof p!=='object')return '';
 if(typeof p.text==='string')return p.text;if(typeof p.content==='string')return p.content;
 if(typeof p.code==='string')return `\`\`\`${p.language||''}\n${p.code}\n\`\`\``;
 if(p.asset_pointer||p.image_url||p.url||p.asset_id){warnings.add('Hay archivos, imágenes o multimedia no incluidos en esta copia textual.');return `[Adjunto: ${p.name||p.alt||'archivo'}]`;}
 if(p.content_type==='image_asset_pointer'){warnings.add('Imagen no guardada como archivo.');return '[Imagen adjunta]';}
 return '';
}
function extractText(message,warnings){const c=message?.content||{};if(Array.isArray(c.parts))return c.parts.map(p=>partText(p,warnings)).filter(Boolean).join('\n\n');if(typeof c.text==='string')return c.text;if(typeof c.result==='string')return c.result;if(typeof c.content==='string')return c.content;return '';}
function normalizeConversation(data,options={}){
 const warn=new Set();if(!data||typeof data!=='object'||(!data.title&&!data.mapping&&!data.messages))return null;
 if(data.meta&&Array.isArray(data.messages))data={...data.meta,messages:data.messages};
 const id=String(data.id||data.conversation_id||data.conversationId||`local-${globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)}`);
 const title=String(data.title||'Conversación sin título').trim().slice(0,500);
 const messages=[];
 if(Array.isArray(data.messages)){
  for(const m of data.messages){const role=m.role||m.author?.role;if(!['user','assistant'].includes(role))continue;
   const body=typeof m.text==='string'?m.text:typeof m.content==='string'?m.content:extractText(m,warn);
   if(body.trim())messages.push({role,text:body,createdAt:iso(m.createdAt||m.create_time)});
  }
 }else if(data.mapping&&typeof data.mapping==='object'){
  const mp=data.mapping;let ordered=[];let nodeId=data.current_node;const visited=new Set();
  while(nodeId&&mp[nodeId]&&!visited.has(nodeId)){visited.add(nodeId);ordered.unshift(mp[nodeId]);nodeId=mp[nodeId].parent;}
  if(!ordered.length){warn.add('No se identificó la rama activa; se usan mensajes ordenados por fecha.');ordered=Object.values(mp).sort((a,b)=>(a.message?.create_time||0)-(b.message?.create_time||0));}
  for(const node of ordered){const m=node?.message;if(!m)continue;
   const role=m.author?.role;if(!['user','assistant'].includes(role))continue;
   if(m.metadata?.is_visually_hidden_from_conversation||m.metadata?.reasoning_status)continue;
   if(role==='assistant'&&m.recipient&&m.recipient!=='all')continue;
   const t=m.content?.content_type;
   if(['thoughts','reasoning_recap','model_editable_context','user_editable_context'].includes(t))continue;
   const body=extractText(m,warn);if(body.trim())messages.push({role,text:body,createdAt:iso(m.create_time)});
  }
 }
 const updatedAt=iso(data.update_time||data.updatedAt||data.last_update_time||data.create_time||data.createdAt);
 const createdAt=iso(data.create_time||data.createdAt)||updatedAt;
 return {meta:{id,title,createdAt,updatedAt,source:options.source||'Exportación OpenAI',messageCount:messages.length,warnings:[...warn],folderId:null,manualClass:null,deletedAt:null,lastExportedAt:null,rawAvailable:!!options.preserveRaw},messages,raw:options.preserveRaw?data:null};
}
function classify(meta,body,settings){const t=norm(meta.title),text=settings.searchMode==='content'?`${t} ${norm(body)}`:t;
 const includes=splitTerms(settings.include),excludes=splitTerms(settings.exclude);
 const protectedTerms=[...excludes];
 if(excludes.includes('recetas'))protectedTerms.push('receta');
 if(excludes.includes('oracion'))protectedTerms.push('oraciones');
 if(excludes.includes('cocina'))protectedTerms.push('cocinar');
 const block=hits(text,protectedTerms); // Advisory category: content only if chosen by the user.
 if(block.length)return {kind:'other',reason:'Otros temas: '+block.join(', ')};
 const positive=hits(text,includes);
 if(!positive.length)return {kind:'other',reason:'Sin coincidencia técnica'};
 if(settings.match==='all'&&positive.length<includes.length)return {kind:'other',reason:'No coincide con todas las palabras'};
 const weak=['auri','alma'];
 if(positive.every(k=>weak.includes(k)))return {kind:'review',reason:'Coincidencia genérica que requiere revisión'};
 return {kind:'candidate',reason:'Coincidencia técnica: '+positive.join(', ')};
}
root.AOMParser={norm,splitTerms,hits,iso,normalizeConversation,classify};
})(globalThis);
