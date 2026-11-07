'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const id='22222222-3333-4444-8555-666666666666';
const a={getAttribute(name){return name==='href'?'/c/'+id:null},innerText:'Mejoras y activaciones de Alma',textContent:'Mejoras y activaciones de Alma',parentElement:null};
let clicked=false;
const ctx={console,document:{title:'ChatGPT',querySelector(q){return q.includes('main')?{innerText:'Chat de prueba cargado'}:null},querySelectorAll(q){if(q==='a[href]')return[a];return []}},location:{origin:'https://chatgpt.com',pathname:'/c/'+id},URL,Date,Blob,TextEncoder,Uint32Array,Uint8Array};ctx.globalThis=ctx;vm.createContext(ctx);
for(const f of ['parser.js','export.js','batch.js'])vm.runInContext(fs.readFileSync(path.join(root,'js',f),'utf8'),ctx);
(async()=>{
const B=ctx.AOMBatch,E=ctx.AOMExport;
// Chat identity is UUID only. A renamed title must never block a legitimate operation.
const result=await B.onChatPage(id,{title:'Mejoras y activaciones de Alma',signature:null},'identity');
assert.equal(result.ok,true);assert.match(result.reason,/ID exacto/);
const bad=await B.onChatPage(id,{title:'Chat equivocado',signature:null},'identity');
assert.equal(bad.ok,true,'title rename must be accepted because ID matches');
const wrong=await B.onChatPage('11111111-2222-4333-8444-555555555555',{title:'Mejoras y activaciones de Alma'},'identity');
assert.equal(wrong.ok,false);assert.equal(wrong.stage,'url');
const menu=await B.onChatPage(id,{title:'Mejoras y activaciones de Alma'},'locate');
assert.equal(menu.ok,false);assert.equal(menu.stage,'menu');assert.equal(clicked,false);
const indexDoc=E.markdown({id,title:'Test',warnings:['SOLO ÍNDICE, SIN MENSAJES; NO ES UNA COPIA DE SEGURIDAD DEL CHAT.']},[]);
assert(indexDoc.includes('SOLO ÍNDICE'));
const html=fs.readFileSync(path.join(root,'manager.html'),'utf8');
for(const field of ['backup-auto-read','backup-metadata-only','backup-progress','folder-suggestions'])assert(html.includes('id="'+field+'"'),field);
const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
assert(app.includes('async function loadMissingForExport('));assert(app.includes('function showFolderSuggestions('));
assert(app.includes('signature:P.norm(first).length>=12?first:null'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));assert.equal(manifest.version,'0.6.7');assert.equal(manifest.content_scripts,undefined);
console.log('PASS 0.6.4: ID identity tolerates renamed title, URL mismatch fail closed, export and folders');
})().catch(e=>{console.error(e);process.exitCode=1});
