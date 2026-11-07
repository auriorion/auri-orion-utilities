/* Virtual folder tree helpers. No destructive ChatGPT operations. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.AOMFolders=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function idOf(f){return String(f?.id||'');}
  function normalizedName(v){return String(v||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');}
  function mapOf(folders){return new Map(folders.map(f=>[idOf(f),f]).filter(([id])=>id));}
  function parentOf(folder,byId){const pid=folder?.parentId;return pid&&byId.has(pid)&&pid!==folder.id?pid:null;}
  function folderPath(id,folders){const byId=mapOf(folders),pieces=[],seen=new Set();let current=byId.get(id);
    while(current&&!seen.has(current.id)){seen.add(current.id);pieces.unshift(String(current.name||'Sin nombre'));const pid=parentOf(current,byId);current=pid?byId.get(pid):null;}
    return pieces.join(' / ');
  }
  function descendants(id,folders){const byId=mapOf(folders);if(!byId.has(id))return [];
    const visited=new Set([id]),out=[],stack=[id];while(stack.length){const parent=stack.pop();for(const f of folders){if(f.parentId===parent&&!visited.has(f.id)){visited.add(f.id);out.push(f.id);stack.push(f.id);}}}return out;
  }
  function ancestors(id,folders){const byId=mapOf(folders),out=[],seen=new Set([id]);let folder=byId.get(id);
    while(folder){const pid=parentOf(folder,byId);if(!pid||seen.has(pid))break;seen.add(pid);out.push(pid);folder=byId.get(pid);}return out;
  }
  function tree(folders){const byId=mapOf(folders),children=new Map(),roots=[];
    for(const f of folders){const parent=parentOf(f,byId);if(!parent)roots.push(f);else{if(!children.has(parent))children.set(parent,[]);children.get(parent).push(f);}}
    const sort=arr=>arr.sort((a,b)=>String(a.name).localeCompare(String(b.name),'es'));
    sort(roots);for(const list of children.values())sort(list);
    const visited=new Set(),out=[];
    function walk(f,depth){if(visited.has(f.id))return;visited.add(f.id);out.push({folder:f,depth,hasChildren:(children.get(f.id)||[]).length>0});for(const child of children.get(f.id)||[])walk(child,depth+1);}
    for(const f of roots)walk(f,0);
    // Safely expose an orphaned or cyclic legacy folder as a root, without infinite recursion.
    for(const f of sort([...folders]))if(!visited.has(f.id))walk(f,0);
    return out;
  }
  function isSiblingNameTaken(folders,name,parentId,exceptId=null){const key=normalizedName(name),parent=parentId||null;
    return folders.some(f=>f.id!==exceptId&&(f.parentId||null)===parent&&normalizedName(f.name)===key);
  }
  function stats(id,folders,chats){const ids=new Set([id,...descendants(id,folders)]);return {folderIds:[...ids],subfolders:ids.size-1,chats:chats.filter(c=>!c.deletedAt&&!c.remoteDeletedAt&&ids.has(c.folderId)).length};}
  return {normalizedName,folderPath,descendants,ancestors,tree,isSiblingNameTaken,stats};
});
