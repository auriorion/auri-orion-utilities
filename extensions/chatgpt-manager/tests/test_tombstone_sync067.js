const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const id='6a4ace09-1698-83eb-8d69-af13601334dc';
const record={id,title:'Antiguo',remoteDeletedAt:'2026-11-07T19:30:00Z',folderId:'f'};
const values=new Map([[id,{...record}]]);
const database={transaction(){let n=0;const tx={oncomplete:null,onerror:null,objectStore(){return{
 get(i){n++;const req={result:undefined,onsuccess:null};setImmediate(()=>{req.result=values.get(i);req.onsuccess?.();if(--n===0)setImmediate(()=>tx.oncomplete?.());});return req},
 put(v){values.set(v.id,v)}
};}};return tx}};
const indexedDB={open(){const req={onsuccess:null};setImmediate(()=>{req.result=database;req.onsuccess?.()});return req;}};
const ctx={globalThis:null,indexedDB,Set,Map};ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/db.js'),'utf8'),ctx);
(async()=>{const r=await ctx.AOMDB.mergeHistoryMetadata([{id,title:'Título nuevo'}],'2026-11-07');assert.equal(r.updated,1);assert.deepEqual(values.get(id),record);assert.equal(ctx.AOMDB.visible(values.get(id)),false);console.log('PASS v0.6.7: syncing a deleted UUID does not resurrect it');})().catch(e=>{console.error(e);process.exitCode=1});
