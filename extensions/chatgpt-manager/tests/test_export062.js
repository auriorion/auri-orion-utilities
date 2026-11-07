'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const id='11111111-2222-4333-8444-555555555555';
function response(body,status=200){return {ok:status>=200&&status<300,status,json:async()=>body};}
const session={accessToken:'TEST-PRIVATE-NEVER-SAVE',user:{id:'user-example'}};
const mapping={
 root:{id:'root',parent:null,message:null},
 a:{id:'a',parent:'root',message:{author:{role:'user'},content:{content_type:'text',parts:['Primera pregunta']},create_time:1793000000}},
 b:{id:'b',parent:'a',message:{author:{role:'assistant'},content:{content_type:'text',parts:['## Respuesta con tabla\n\n| A | B |\n|---|---|\n| 1 | 2 |']},create_time:1793000002}},
 alt:{id:'alt',parent:'a',message:{author:{role:'assistant'},content:{parts:['RESPUESTA ALTERNATIVA NO SELECCIONADA']}}},
 c:{id:'c',parent:'b',message:{author:{role:'user'},content:{content_type:'multimodal_text',parts:['Imagen adjunta:',{content_type:'image_asset_pointer',asset_pointer:'file-123'}]},metadata:{attachments:[{name:'ejemplo.png'}]}}},
 d:{id:'d',parent:'c',message:{author:{role:'assistant',name:'ChatGPT'},content:{content_type:'text',parts:['Respuesta final']}}},
 e:{id:'e',parent:'d',message:{author:{role:'tool'},content:{parts:['Secreto tool']}}}
};
function ctxFor(convo,status=200){
 const calls=[];
 const context={console,crypto:webcrypto,TextEncoder,Uint8Array,Array,Number,Date,String,Set,Map,URL,location:{hostname:'chatgpt.com'},fetch:async(url,opts)=>{
  calls.push({url,opts});
  if(url==='/api/auth/session')return response(session);
  if(url==='/backend-api/conversation/'+id)return response(convo,status);
  throw Error('Unexpected request: '+url);
 }};
 context.globalThis=context;vm.createContext(context);
 for(const file of ['parser.js','export.js','live.js'])vm.runInContext(fs.readFileSync(path.join(root,'js',file),'utf8'),context,{filename:file});
 return {context,calls};
}
(async()=>{
 const {context,calls}=ctxFor({id,title:'Conversación de ejemplo',mapping,current_node:'d',create_time:1793000000,update_time:1793002000});
 const result=await context.AOMLive.readConversationForExport(id);
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.id,id);
 assert.equal(result.messages.length,4);
 assert.equal(result.messages[0].role,'user');
 assert.equal(result.messages[1].role,'assistant');
 assert(result.messages[1].text.includes('| A | B |'));
 assert(!result.messages.some(x=>x.text.includes('ALTERNATIVA')));
 assert(result.warnings.join(' ').includes('adjuntos'));
 assert(!JSON.stringify(result).includes(session.accessToken));
 assert.equal(calls.length,2);
 assert.match(calls[1].url,/backend-api\/conversation/);
 assert.equal(calls[1].opts.method,'GET');
 const parsed=context.AOMParser.normalizeConversation({id,title:'Conversación de ejemplo',messages:result.messages},{source:'ChatGPT lectura directa'});
 assert.equal(parsed.meta.messageCount,4);
 assert.match(context.AOMExport.markdown(parsed.meta,parsed.messages),/Primera pregunta/);
 assert.match(context.AOMExport.html(parsed.meta,parsed.messages),/Respuesta final/);
 assert.match(context.AOMExport.content(parsed.meta,parsed.messages,'json'),/Primera pregunta/);
 const missing=ctxFor({id,mapping:{},current_node:null});
 const noMessages=await missing.context.AOMLive.readConversationForExport(id);
 assert.equal(noMessages.ok,false);
 const failure=ctxFor({},429);
 const rate=await failure.context.AOMLive.readConversationForExport(id);
 assert.equal(rate.ok,false);assert.equal(rate.status,429);
 const invalid=await context.AOMLive.readConversationForExport('../bad');
 assert.equal(invalid.ok,false);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
 assert.equal(manifest.version,'0.6.7');assert.equal(manifest.content_scripts,undefined);
 const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
 assert(app.includes("world:'MAIN',func:L.readConversationForExport"));
 assert(app.includes('captureDom'));
 assert(app.includes('async function readAndStoreChat('));
 assert(app.includes('No hay conversaciones con contenido exportable'));
 const html=fs.readFileSync(path.join(root,'manager.html'),'utf8');
 assert(html.includes('v0.6.7'));
 assert(html.includes('id="folder-suggestions"'));
 assert(!html.includes('id="folder-existing-list"'));
 console.log('PASS: exportación directa de 4 mensajes, rama activa, adjuntos advertidos, 3 formatos, bloqueo 429, token no retornado, permisos y UI');
})().catch(e=>{console.error(e);process.exitCode=1});
