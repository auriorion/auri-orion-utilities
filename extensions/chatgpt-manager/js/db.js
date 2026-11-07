/* IndexedDB local-only. Separate metadata and messages to keep file listings responsive. */
(function(root){
'use strict';
const NAME='auri-orion-chatgpt-manager',VERSION=2;
// Remote deletion confirmation remains as an invisible ID tombstone.
function visible(meta){return !!meta&&!meta.remoteDeletedAt;}
let promise;
function request(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function open(){
 if(!promise) promise=new Promise((resolve,reject)=>{
  const req=indexedDB.open(NAME,VERSION);
  req.onupgradeneeded=()=>{const db=req.result;
   if(!db.objectStoreNames.contains('chats')){const s=db.createObjectStore('chats',{keyPath:'id'});s.createIndex('updatedAt','updatedAt');}
   if(!db.objectStoreNames.contains('messages'))db.createObjectStore('messages',{keyPath:'id'});
   if(!db.objectStoreNames.contains('raw'))db.createObjectStore('raw',{keyPath:'id'});
   if(!db.objectStoreNames.contains('folders'))db.createObjectStore('folders',{keyPath:'id'});
  };
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
 return promise;
}
async function all(store){const db=await open();return request(db.transaction(store,'readonly').objectStore(store).getAll());}
async function get(store,id){const db=await open();return request(db.transaction(store,'readonly').objectStore(store).get(id));}
async function put(store,value){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
async function remove(store,id){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
async function saveBatch(entries,preserveRaw=false){const db=await open();return new Promise((resolve,reject)=>{
 const tx=db.transaction(['chats','messages','raw'],'readwrite');const c=tx.objectStore('chats'),m=tx.objectStore('messages'),r=tx.objectStore('raw');
 for(const entry of entries){const meta=entry.meta;const old=c.get(meta.id);
  old.onsuccess=()=>{const prev=old.result||{};
   c.put({...meta,folderId:prev.folderId||meta.folderId||null,manualClass:prev.manualClass||null,deletedAt:prev.deletedAt||null,lastExportedAt:prev.lastExportedAt||null,remoteDeletedAt:prev.remoteDeletedAt||null,remoteDeleteEvidence:prev.remoteDeleteEvidence||null,liveDetectedAt:prev.liveDetectedAt||meta.liveDetectedAt||null});
  };
  m.put({id:meta.id,messages:entry.messages});
  if(preserveRaw&&entry.raw!=null)r.put({id:meta.id,data:entry.raw});
 }
 tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
});}
async function updateMeta(id,patch){const db=await open();return new Promise((resolve,reject)=>{
 const tx=db.transaction('chats','readwrite');const s=tx.objectStore('chats');const req=s.get(id);req.onsuccess=()=>{if(req.result)s.put({...req.result,...patch});};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
});}
async function purge(id){const db=await open();return new Promise((resolve,reject)=>{
 const tx=db.transaction(['chats','messages','raw'],'readwrite');for(const store of ['chats','messages','raw'])tx.objectStore(store).delete(id);
 tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
});}

async function mergeHistoryMetadata(items,stamp){
 const db=await open();return new Promise((resolve,reject)=>{
  const tx=db.transaction('chats','readwrite'),store=tx.objectStore('chats');
  let inserted=0,updated=0;
  for(const incoming of items){
   const req=store.get(incoming.id);
   req.onsuccess=()=>{
    const prev=req.result;
    if(prev){updated++;
     if(!visible(prev))return; // Keep remote-deletion tombstone intact across resync.
     // Never erase existing content counts, original source, folders or user decisions.
     store.put({...prev,
      title:incoming.title||prev.title,
      createdAt:incoming.createdAt||prev.createdAt||null,
      updatedAt:incoming.updatedAt||prev.updatedAt||null,
      projectId:incoming.projectId||prev.projectId||null,
      isArchived:incoming.archived,
      liveDetectedAt:stamp,
      indexSyncedAt:stamp,
      warnings:(prev.messageCount||0)>0?prev.warnings:['Metadatos de índice de ChatGPT; mensajes no descargados.']
     });
    } else {inserted++;
     store.put({...incoming,source:'ChatGPT sincronizado',messageCount:0,
      liveDetectedAt:stamp,indexSyncedAt:stamp,
      folderId:null,manualClass:null,deletedAt:null,remoteDeletedAt:null,
      warnings:['Metadatos de índice de ChatGPT; mensajes no descargados.']
     });
    }
   };
  }
  tx.oncomplete=()=>resolve({inserted,updated});
  tx.onerror=()=>reject(tx.error);
 });
}
async function deleteFolderTree(folderIds){
 const ids=new Set(folderIds);if(!ids.size)return {removed:0,unassigned:0};
 const db=await open();return new Promise((resolve,reject)=>{
  const tx=db.transaction(['folders','chats'],'readwrite'),fs=tx.objectStore('folders'),cs=tx.objectStore('chats');let count=0;
  const req=cs.getAll();req.onsuccess=()=>{
   for(const c of req.result){if(ids.has(c.folderId)){cs.put({...c,folderId:null});count++;}}
   for(const id of ids)fs.delete(id);
  };
  tx.oncomplete=()=>resolve({removed:ids.size,unassigned:count});tx.onerror=()=>reject(tx.error);
  tx.onabort=()=>reject(tx.error||new Error('La operación no se pudo completar.'));
 });
}
root.AOMDB={open,all,get,put,remove,saveBatch,updateMeta,purge,mergeHistoryMetadata,deleteFolderTree,visible};
})(globalThis);
