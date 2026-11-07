/* Manual standalone Markdown / HTML / JSON and multichat ZIP with store compression. */
(function(root){
'use strict';
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function safeFilename(title,extension){let s=String(title||'chat').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[<>:"/\\|?*\x00-\x1f]/g,'').trim().slice(0,100);return (s||'chat')+'.'+extension;}
function markdown(meta,messages){const out=[`# ${meta.title}`,`\n- ID: ${meta.id}`,`- Creación: ${meta.createdAt||'Desconocida'}`,`- Última modificación: ${meta.updatedAt||'Desconocida'}`,`- Fuente: ${meta.source||'desconocida'}`,`- Avisos: ${(meta.warnings||[]).join(' | ')||'Ninguno'}`,`\n---\n`];
 for(const msg of messages){out.push(`## ${msg.role==='user'?'Usuario':'Asistente'}`);if(msg.createdAt)out.push(`_${msg.createdAt}_`);out.push('',msg.text,'\n---\n');}return out.join('\n');}
function html(meta,messages){return '<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><title>'+escapeHtml(meta.title)+'</title><style>body{max-width:860px;margin:3rem auto;padding:0 1rem;color:#20242b;font:16px/1.6 system-ui}article{border-bottom:1px solid #ddd;padding:20px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}small{color:#555}</style></head><body><h1>'+escapeHtml(meta.title)+'</h1><p><small>Archivo textual local; las imágenes y adjuntos externos pueden no estar incluidos.</small></p>'+messages.map(m=>'<article><strong>'+(m.role==='user'?'Usuario':'Asistente')+'</strong><pre>'+escapeHtml(m.text)+'</pre></article>').join('')+'</body></html>';}
function content(meta,messages,fmt,raw){if(fmt==='json')return JSON.stringify(raw||{meta,messages,notice:'Copia textual local: los archivos adjuntos podrían no estar incluidos'},null,2);if(fmt==='html')return html(meta,messages);return markdown(meta,messages);}
const encoder=new TextEncoder();
const crcTable=(()=>{const a=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;a[i]=c>>>0;}return a;})();
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function concat(chunks){const total=chunks.reduce((s,b)=>s+b.length,0),out=new Uint8Array(total);let offset=0;for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.length;}return out;}
function dosTimestamp(date){const d=date||new Date();return {time:((d.getHours()&31)<<11)|((d.getMinutes()&63)<<5)|((d.getSeconds()/2|0)&31),date:((Math.max(1980,d.getFullYear())-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate()};}
function zip(entries){const chunks=[],central=[];let offset=0;for(const e of entries){const name=encoder.encode(e.name),data=encoder.encode(e.text),crc=crc32(data),t=dosTimestamp();if(data.length>0xffffffff||offset>0xffffffff)throw new Error('ZIP demasiado grande para el formato ZIP32');
 const head=new Uint8Array(30+name.length);let v=new DataView(head.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(8,0,true);v.setUint16(10,t.time,true);v.setUint16(12,t.date,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);head.set(name,30);chunks.push(head,data);
 const ch=new Uint8Array(46+name.length);v=new DataView(ch.buffer);v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint16(10,0,true);v.setUint16(12,t.time,true);v.setUint16(14,t.date,true);v.setUint32(16,crc,true);v.setUint32(20,data.length,true);v.setUint32(24,data.length,true);v.setUint16(28,name.length,true);v.setUint32(42,offset,true);ch.set(name,46);central.push(ch);offset+=head.length+data.length;
 }
 const centralBytes=concat(central),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,centralBytes.length,true);v.setUint32(16,offset,true);return new Blob([...chunks,centralBytes,end],{type:'application/zip'});
}
function download(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30_000);}
root.AOMExport={escapeHtml,safeFilename,markdown,html,content,zip,download};
})(globalThis);
