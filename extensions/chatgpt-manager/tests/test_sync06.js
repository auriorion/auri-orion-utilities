const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const {webcrypto}=require('node:crypto');
const first='22222222-3333-4444-8555-666666666666',second='11111111-2222-4333-8444-555555555555';
const seen=[];
const fakeFetch=async(url,init)=>{
 seen.push({url,init});
 if(url==='/api/auth/session')return {ok:true,json:async()=>({user:{id:'account-1'},accessToken:'secret-never-expose'})};
 if(url.includes('offset=0'))return {ok:true,json:async()=>({items:[
   {id:first,title:'Auditoría de Orion',create_time:1791000000,update_time:1792000000,irrelevant:'DO-NOT-RETURN'},
   {id:second,title:'Receta de ejemplo',create_time:1791000001,update_time:null}
 ]})};
 return {ok:true,json:async()=>({items:[]})};
};
const ctx={globalThis:null,console,location:{hostname:'chatgpt.com'},fetch:fakeFetch,crypto:webcrypto,TextEncoder,Uint8Array,Date,Number,String,Array,Set,Map};ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'js/live.js'),'utf8'),ctx);
const api=ctx.AOMLive;
(async()=>{
 const response=await api.readHistoryPage(0,100);
 assert.equal(response.ok,true);assert.equal(response.items.length,2);
 assert(!JSON.stringify(response).includes('secret-never-expose'));
 assert(!JSON.stringify(response).includes('DO-NOT-RETURN'));
 assert.equal(response.accountKey.length,64);
 assert.equal(seen[1].init.headers.Authorization,'Bearer secret-never-expose');
 assert.equal(seen[1].init.credentials,'include');
 const n=api.normalizeHistoryPage(response.items);
 assert.equal(n.length,2);assert.equal(n[0].title,'Auditoría de Orion');
 assert(n[0].updatedAt.startsWith('2026-'));assert.equal(n[1].updatedAt,null);
 assert.equal(api.normalizeHistoryPage([{id:'bad',title:'a'},{id:first,title:'ok',updated:9999999999999999}]).length,1);
 assert.equal(api.normalizeHistoryPage([{id:first,title:'ok',updated:9999999999999999}])[0].updatedAt,null);
 const invalid=await api.readHistoryPage(-1,100);assert.equal(invalid.ok,false);
 assert.equal(seen.length,2,'invalid pagination must not access network');
 console.log('PASS 1/3: isolated web-session read only, token never leaves page, date validation, account marker, source whitelist');
})().catch(e=>{console.error(e);process.exitCode=1});
