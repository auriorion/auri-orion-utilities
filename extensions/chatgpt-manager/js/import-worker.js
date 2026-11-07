/* Parse huge top-level JSON arrays incrementally without loading the export into RAM. */
importScripts('db.js','parser.js');
const BATCH_SIZE=20;
async function consumeFile(file,preserveRaw){
 let count=0,invalid=0,batch=[];
 async function commit(raw){
  try{const entry=AOMParser.normalizeConversation(raw,{source:'Exportación OpenAI',preserveRaw});if(entry){batch.push(entry);count++;if(batch.length>=BATCH_SIZE){await AOMDB.saveBatch(batch,preserveRaw);batch=[];}}else invalid++;}catch(_){invalid++;}
 }
 const small=file.size<8*1024*1024;
 if(small){let json;try{json=JSON.parse(await file.text());}catch(error){throw new Error('JSON inválido: '+error.message);}
  if(Array.isArray(json)){for(const obj of json)await commit(obj);}else await commit(json);
 }else{
  const decoder=new TextDecoder();const reader=file.stream().getReader();let depth=0,inString=false,escaped=false,parts=[],start=-1,bytes=0,lastNotice=0,seenArray=false;
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;
   const chunk=decoder.decode(value,{stream:true});
   if(depth>0)start=0;
   for(let i=0;i<chunk.length;i++){
    const ch=chunk[i];
    if(depth===0){if(ch==='[')seenArray=true;if(ch==='{'){depth=1;start=i;}continue;}
    if(inString){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')inString=false;continue;}
    if(ch==='"'){inString=true;continue;}
    if(ch==='{')depth++;else if(ch==='}'){
     depth--;if(depth===0){const raw=parts.join('')+chunk.slice(start,i+1);parts=[];start=-1;
      try{await commit(JSON.parse(raw));}catch(_){invalid++;}
     }
    }
   }
   if(depth>0)parts.push(chunk.slice(Math.max(0,start)));
   if(bytes-lastNotice>=2*1024*1024){postMessage({type:'progress',file:file.name,bytes,total:file.size,count});lastNotice=bytes;}
  }
  if(!seenArray)throw new Error('Se esperaba una lista JSON de conversaciones de OpenAI');
  if(depth!==0)throw new Error('JSON incompleto al finalizar la lectura');
 }
 if(batch.length)await AOMDB.saveBatch(batch,preserveRaw);
 postMessage({type:'progress',file:file.name,bytes:file.size,total:file.size,count});
 return {count,invalid};
}
onmessage=async(e)=>{if(e.data?.type!=='import')return;
 let total=0,invalid=0;
 try{for(const file of e.data.files){const r=await consumeFile(file,!!e.data.preserveRaw);total+=r.count;invalid+=r.invalid;postMessage({type:'file-complete',file:file.name,...r});}
 postMessage({type:'complete',total,invalid});}catch(error){postMessage({type:'error',message:error.message||String(error),total,invalid});}
};
