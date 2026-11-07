'use strict';
const assert=require('node:assert/strict');
const F=require('../js/folders.js');
const folders=[
 {id:'a',name:'Ingredientes'},
 {id:'b',name:'Verduras',parentId:'a'},
 {id:'c',name:'Hojas',parentId:'b'},
 {id:'d',name:'Proyecto',parentId:null},
 {id:'e',name:'Verduras',parentId:'d'}
];
const chats=[{id:'1',folderId:'a'},{id:'2',folderId:'b'},{id:'3',folderId:'c'},{id:'4',folderId:'d'},{id:'5',folderId:'c',deletedAt:'2026-01-01'},{id:'6',folderId:'c',remoteDeletedAt:'2026-11-07'}];
assert.equal(F.folderPath('c',folders),'Ingredientes / Verduras / Hojas');
assert.deepEqual(F.ancestors('c',folders),['b','a']);
assert.deepEqual(F.descendants('a',folders).sort(),['b','c']);
assert.deepEqual(F.stats('a',folders,chats),{folderIds:['a','b','c'],subfolders:2,chats:3});
assert.equal(F.isSiblingNameTaken(folders,'Vérduras','a','x'),true);
assert.equal(F.isSiblingNameTaken(folders,'Verduras',null),false);
assert.equal(F.isSiblingNameTaken(folders,'Verduras','b'),false);
const t=F.tree(folders);assert.equal(t.length,5);
assert.equal(t.find(x=>x.folder.id==='c').depth,2);
// Legacy folders without parentId remain visible as roots.
assert.equal(t.find(x=>x.folder.id==='a').depth,0);
// Malformed cyclic hierarchy cannot lock up rendering or deletion.
const cyclic=[{id:'x',name:'X',parentId:'y'},{id:'y',name:'Y',parentId:'x'}];
assert.equal(F.tree(cyclic).length,2);
assert.deepEqual(F.descendants('x',cyclic),['y']);
console.log('PASS: folders, paths, nested tree, collisions, aggregates, cycles');
