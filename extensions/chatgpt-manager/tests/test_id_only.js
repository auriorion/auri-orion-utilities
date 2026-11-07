const fs=require('fs'),vm=require('vm'),assert=require('assert').strict,crypto=require('crypto');
const path=require('path');
const source=fs.readFileSync(path.join(__dirname,'..','js','batch.js'),'utf8');
const id='11111111-2222-4333-8444-555555555555';
const other='11111111-1111-1111-1111-111111111111';
const account='test-account';
const fingerprint=crypto.createHash('sha256').update(account).digest('hex');
const fakeCrypto={subtle:{digest:async (_,bytes)=>crypto.createHash('sha256').update(Buffer.from(bytes)).digest().buffer.slice(0)}};
function env(config={}){
 const calls=[];
 const main={innerText:'Conversación abierta con mensajes',textContent:'Conversación abierta con mensajes'};
 let seenPatch=false;
 const doc={querySelector:(s)=>/main/.test(s)?main:null};
 const get=()=>({conversation_id:config.remoteId||id,title:'Título cambiado por ejemplo',is_visible:seenPatch?false:true});
 const fetch=async(url,opt={})=>{
  calls.push({url,method:opt.method||'GET'});
  if(url==='/api/auth/session')return {ok:true,json:async()=>({accessToken:'secret-test',user:{id:config.account||account}})};
  if(String(url).includes('/backend-api/conversation/')){
   if(opt.method==='PATCH'){seenPatch=true;return {ok:true,json:async()=>({success:true})};}
   return {ok:true,json:async()=>get()};
  }
  throw new Error('Unexpected URL '+url);
 };
 const b={};
 const context={globalThis:b,location:{hostname:'chatgpt.com',pathname:'/c/'+(config.pathId||id)},document:doc,
  fetch,crypto:{subtle:{digest:async(_algo,bytes)=>{let data=crypto.createHash('sha256').update(Buffer.from(bytes)).digest();return Uint8Array.from(data).buffer;}}},
  TextEncoder, setTimeout:(cb)=>cb(), console};
 vm.createContext(context);vm.runInContext(source,context);
 return {b,calls};
}
(async()=>{
 let e=env();let r=await e.b.AOMBatch.sessionConversationOperation(id,'check',fingerprint);
 assert.equal(r.ok,true,'Renamed title must not prevent ID verification');assert.equal(e.calls.some(c=>c.method==='PATCH'),false);
 e=env();r=await e.b.AOMBatch.sessionConversationOperation(id,'delete',fingerprint);
 assert.equal(r.ok,true,'ID verified deletion may succeed with renamed title');assert.equal(e.calls.filter(c=>c.method==='PATCH').length,1);
 e=env({remoteId:other});r=await e.b.AOMBatch.sessionConversationOperation(id,'delete',fingerprint);
 assert.equal(r.ok,false);assert.equal(r.stage,'identidad');assert.equal(e.calls.some(c=>c.method==='PATCH'),false);
 e=env({account:'other-account'});r=await e.b.AOMBatch.sessionConversationOperation(id,'delete',fingerprint);
 assert.equal(r.ok,false);assert.equal(r.stage,'cuenta');assert.equal(e.calls.some(c=>c.method==='PATCH'),false);
 e=env({pathId:other});r=await e.b.AOMBatch.sessionConversationOperation(id,'delete',fingerprint);
 assert.equal(r.ok,false);assert.equal(r.stage,'identidad');assert.equal(e.calls.length,0);
 e=env();r=await e.b.AOMBatch.sessionConversationOperation(id,'delete','');assert.equal(r.ok,false);assert.equal(e.calls.length,0);
 e=env();r=await e.b.AOMBatch.onChatPage(id,null,'identity');assert.equal(r.ok,true);
 e=env({pathId:other});r=await e.b.AOMBatch.onChatPage(id,null,'identity');assert.equal(r.ok,false);
 console.log('PASS: ID-only rename, account, URL, remote ID, single PATCH, no PATCH on mismatch');
})().catch(e=>{console.error(e);process.exit(1)});
