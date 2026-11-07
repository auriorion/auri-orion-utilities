/* Auri–Orion ChatGPT Manager batch operations.
 * Visual deletion drives ChatGPT menus. Separately, the OPTIONAL session method
 * uses an undocumented web endpoint only after explicit consent to a named batch.
 * Both operations are fail-closed and validate the exact conversation ID.
 */
(function(root) {
  'use strict';
  const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  function eligible(meta, cls, age, now=Date.now()) {
    if (!meta || !UUID.test(String(meta.id||'')) || meta.deletedAt || meta.remoteDeletedAt) return false;
    if(!Number.isFinite(age)||age<0)return false;
    if(age===0)return true; // Age unknown only allowed when user selects 'Cualquier fecha'.
    const stamp=Date.parse(meta.updatedAt||meta.createdAt);
    return Number.isFinite(stamp) && stamp <= now-age*86400000;
  }
  function preferredMethod(accountFingerprint){
    return typeof accountFingerprint==='string'&&/^[a-f0-9]{64}$/i.test(accountFingerprint)?'session':'visual';
  }
  async function onChatPage(id, signature, action) {
    // Self-contained: chrome.scripting.executeScript serializes THIS function.
    const fail=(stage,reason)=>({ok:false,stage,reason});
    const text=(el)=>String(el?.innerText||el?.textContent||'').trim();
    const norm=(s)=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
    const exactId=String(id).toLowerCase();
    const path=decodeURIComponent(location.pathname).match(/(?:^|\/)c\/([a-f0-9-]{36})(?:\/|$)/i);
    if(!path||path[1].toLowerCase()!==exactId) return fail('url','El identificador de la conversación abierta no coincide.');
    // The UUID is the stable identifier. Titles can be renamed by anyone using
    // the account, and old sidebar titles are frequently stale. NEVER gate on title.
    // The tab must be a loaded conversation page rather than a load-error screen.
    const main=document.querySelector('main,[role="main"]');
    if(!main)return fail('carga','ChatGPT no ha cargado el contenido de la conversación.');
    const pageText=norm(text(main)).slice(0,300);
    if(/(?:no se ha podido cargar esta conversacion|could not load conversation|unable to load conversation)/.test(pageText))
      return fail('carga','ChatGPT informa que esta conversación no se ha podido cargar.');
    if(action==='identity') return {ok:true,stage:'identidad',reason:'ID exacto de la conversación verificado en la URL. El título no interviene.'};
    function visible(el){
      if(!el || el.disabled || el.getAttribute?.('aria-disabled')==='true')return false;
      // A chat row often hides its own menu until hover. A connected, non-display:none
      // button still belongs to that row and can be safely identified by DOM scope.
      if(el.getAttribute?.('hidden')!==null || el.closest?.('[hidden]'))return false;
      if(el.getClientRects?.().length===0){
        const st=typeof getComputedStyle==='function'?getComputedStyle(el):null;
        if(st?.display==='none')return false;
      }
      return true;
    }
    const chatIdOfHref=(value)=>{
      try{const path=new URL(value,location.origin).pathname;
        return path.match(/(?:^|\/)c\/([a-f0-9-]{36})(?:\/|$)/i)?.[1]?.toLowerCase()||null;
      }catch{return null;}
    };
    const description=(el)=>norm([
      el.getAttribute?.('aria-label'),el.getAttribute?.('title'),
      el.getAttribute?.('data-testid'),el.getAttribute?.('data-tooltip'),
      el.getAttribute?.('data-state'), el.querySelector?.('svg')?.getAttribute?.('class')
    ].filter(Boolean).join(' '));
    const excludedControl=/\b(?:share|compartir|profile|perfil|account|cuenta|settings|configuracion|model|modelo|tools|herramientas|voice|voz|attachments|adjuntos|stop|detener|close|cerrar)\b/;
    const namedMenu=/\b(?:more|mas|options|opciones|ellipsis|overflow|chat menu|conversation menu|chat options|conversation options|menu del chat|menu de la conversacion|menu de conversacion)\b/;
    function scoreMenuButton(button){
      if(!visible(button))return -1;
      const desc=description(button);
      if(excludedControl.test(desc))return -1;
      const popup=button.getAttribute?.('aria-haspopup')==='menu';
      const named=namedMenu.test(desc);
      const icon=/ellipsis|more horizontal|more vertical|dots horizontal|dots vertical/.test(desc);
      if(!popup&&!named&&!icon)return -1;
      return (named?20:0)+(popup?10:0)+(icon?3:0);
    }
    function uniqueBest(nodes,threshold=10){
      const seen=new Set();const candidates=[];
      for(const el of nodes){if(seen.has(el))continue;seen.add(el);
        const score=scoreMenuButton(el);if(score>=threshold)candidates.push({el,score});
      }
      candidates.sort((a,b)=>b.score-a.score);
      if(!candidates.length || (candidates[1]&&candidates[0].score===candidates[1].score))return null;
      return candidates[0].el;
    }
    // Strategy 1: strictly target the known conversation row (including /g/.../c/id links).
    // Never traverse to a sidebar ancestor containing more than one conversation.
    const rowAnchors=[...document.querySelectorAll('a[href]')]
      .filter(a=>chatIdOfHref(a.getAttribute('href'))===exactId);
    let opener=null;
    for(const anchor of rowAnchors){
      let parent=anchor.parentElement;
      for(let depth=0;parent&&depth<5;depth++,parent=parent.parentElement){
        const chatIds=new Set([...parent.querySelectorAll('a[href]')]
          .map(a=>chatIdOfHref(a.getAttribute('href'))).filter(Boolean));
        if(chatIds.size>1)break;
        const buttons=[...parent.querySelectorAll('button,[role="button"]')];
        opener=uniqueBest(buttons,10);
        if(opener)break;
      }
      if(opener)break;
    }
    // Strategy 2: active-chat header. Old conversations frequently are NOT mounted in
    // the recent sidebar, so row-based lookup cannot work for them.
    if(!opener){
      const headerRoots=[...document.querySelectorAll(
        '[data-testid="conversation-header"],[data-testid="chat-header"],main header,[role="main"] header'
      )];
      const options=headerRoots.flatMap(el=>[...el.querySelectorAll('button,[role="button"]')]);
      opener=uniqueBest(options,10);
    }
    // Strategy 3: a uniquely named conversation-options button outside the sidebar.
    // A generic popup button is insufficient here: it might be the profile/model menu.
    if(!opener){
      const global=[...document.querySelectorAll('button,[role="button"]')]
        .filter(el=>!el.closest?.('aside,nav,[data-testid="history"],[id^="history"]'))
        .filter(el=>namedMenu.test(description(el)));
      opener=uniqueBest(global,20);
    }
    if(!opener)return fail('menu','No se encontró el menú del chat activo. La conversación antigua puede no estar en el lateral y el encabezado no expone un control inequívoco. No se borró nada.');
    opener.click();
    await sleep(400);
    // Menus can be portaled outside the header; only inspect an OPEN menu and
    // require ONE destructive item with an exact action label.
    const menuRoots=[...document.querySelectorAll(
      '[role="menu"],[data-radix-menu-content],[data-slot="dropdown-menu-content"]'
    )].filter(visible);
    const matchDelete=(el)=>{
      const label=norm([text(el),el.getAttribute?.('aria-label')].filter(Boolean).join(' '));
      if(/\b(?:all|todos|todas|everything|proyecto|project|workspace)\b/.test(label))return false;
      return /^(?:eliminar|delete|borrar)(?: (?:este|esta|this|chat|conversation|conversacion|permanentemente|permanently))*$/.test(label);
    };
    let deletion=[];
    for(const menu of menuRoots){
      const items=[...menu.querySelectorAll('[role="menuitem"],[data-slot="dropdown-menu-item"]')].filter(visible);
      const targets=items.length?items:[...menu.querySelectorAll('button,[role="button"]')].filter(visible);
      for(const el of targets)if(matchDelete(el))deletion.push(el);
    }
    deletion=[...new Set(deletion)];
    if(action==='locate'){
      // Preflight opens the menu but never selects Delete. Close the menu again.
      try{opener.click();}catch(_){/* The preflight tab is closed by the caller. */}
      return deletion.length===1
        ? {ok:true,stage:'opcion',reason:'ID exacto, menú y opción Eliminar verificados; no se eliminó nada.'}
        : fail('opcion','Se abrió un menú, pero no apareció una única opción «Eliminar». No se borró nada.');
    }
    if(deletion.length!==1)return fail('opcion','No se encontró una única opción «Eliminar» en un menú de conversación abierto. No se borró nada.');
    deletion[0].click();
    await sleep(450);
    const dialogs=[...document.querySelectorAll('[role="alertdialog"],[role="dialog"]')].filter(visible);
    const confirmDialogs=dialogs.filter(d=>/(eliminar|delete|borrar)/.test(norm(text(d))));
    if(confirmDialogs.length!==1)return fail('confirmacion','No se pudo verificar el diálogo de confirmación de ChatGPT.');
    const confirmButtons=[...confirmDialogs[0].querySelectorAll('button')].filter(visible)
      .filter(b=>/^(eliminar|delete)( chat| conversation| conversacion)?$/.test(norm(text(b))));
    if(confirmButtons.length!==1)return fail('confirmacion','No hay un botón de confirmación inequívoco.');
    if(!decodeURIComponent(location.pathname).toLowerCase().endsWith(`/c/${exactId}`))return fail('url','La conversación cambió antes de confirmar.');
    confirmButtons[0].click();
    return {ok:true,stage:'enviado',reason:'Se pulsó «Eliminar» en el diálogo oficial; pendiente verificar el resultado.'};
  }
  // Optional, explicitly consented alternate action. Uses the same authenticated
  // ChatGPT website session as our read-only sync. This endpoint is undocumented,
  // can change without notice, and is NEVER called by the visual-delete path.
  // The injected function is self-contained; no session token leaves the tab.
  async function sessionConversationOperation(id, action, expectedFingerprint) {
    const fail=(stage,reason)=>({ok:false,stage,reason});
    const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    const requested=String(id||'').toLowerCase();
    if(location.hostname!=='chatgpt.com'||!uuid.test(requested))return fail('sesion','Dominio o identificador incorrecto.');
    const inUrl=decodeURIComponent(location.pathname).match(/(?:^|\/)c\/([a-f0-9-]{36})(?:\/|$)/i)?.[1]?.toLowerCase();
    if(inUrl!==requested)return fail('identidad','La URL del chat no coincide con el identificador seleccionado.');
    if(action!=='check'&&action!=='delete')return fail('accion','Operación no permitida.');
    if(typeof expectedFingerprint!=='string'||!/^[a-f0-9]{64}$/.test(expectedFingerprint))
      return fail('cuenta','Sin una cuenta sincronizada y vinculada, este método permanece bloqueado.');
    try {
      const auth=await fetch('/api/auth/session',{credentials:'include',cache:'no-store'});
      if(!auth.ok)return fail('sesion','ChatGPT no permite validar la sesión (HTTP '+auth.status+').');
      const session=await auth.json(), token=session?.accessToken;
      const account=String(session?.user?.id||session?.account?.id||'');
      if(!account||typeof token!=='string'||!token)return fail('sesion','No se puede verificar la identidad de cuenta.');
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(account));
      const fingerprint=Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,'0')).join('');
      if(fingerprint!==expectedFingerprint)return fail('cuenta','La cuenta autenticada es distinta de la sincronizada.');
      const requestUrl='/backend-api/conversation/'+encodeURIComponent(requested);
      const headers={Authorization:'Bearer '+token};
      const before=await fetch(requestUrl,{method:'GET',credentials:'include',cache:'no-store',headers});
      if(!before.ok)return fail('lectura','No se puede verificar el chat seleccionado (HTTP '+before.status+').');
      const data=await before.json();
      const remoteId=String(data?.conversation_id||data?.id||data?.conversation?.id||'').toLowerCase();
      if(remoteId!==requested)return fail('identidad','El identificador devuelto por ChatGPT no coincide.');
      const beforeVisible=data?.is_visible??data?.conversation?.is_visible;
      if(beforeVisible===false)return fail('estado','ChatGPT ya indica que el chat no está visible. No se repite la eliminación.');
      if(action==='check')return {ok:true,stage:'verificado',reason:'Cuenta autenticada y ID exacto de ChatGPT verificados. El título puede haber cambiado. No se eliminó nada.'};
      const response=await fetch(requestUrl,{
        method:'PATCH',credentials:'include',cache:'no-store',
        headers:{...headers,'Content-Type':'application/json'},
        body:JSON.stringify({is_visible:false})
      });
      if(!response.ok)return fail('solicitud','ChatGPT rechazó la eliminación (HTTP '+response.status+').');
      let acknowledgement=null;
      try { acknowledgement=await response.json(); } catch(_) { /* response may be empty */ }
      if(acknowledgement?.success===false)return fail('solicitud','ChatGPT respondió que la eliminación falló.');
      // Never repeat PATCH. Poll GET only, and count as confirmed only with
      // explicit is_visible=false, or an acknowledged success followed by 404/410.
      for(let attempt=0;attempt<6;attempt++){
        await new Promise(resolve=>setTimeout(resolve,attempt===0?350:650));
        const verify=await fetch(requestUrl,{method:'GET',credentials:'include',cache:'no-store',headers});
        if(verify.ok){
          let obj;try{obj=await verify.json();}catch(_){return fail('incierto','ChatGPT aceptó la solicitud, pero la verificación no devolvió JSON válido.');}
          const verifyId=String(obj?.conversation_id||obj?.id||obj?.conversation?.id||'').toLowerCase();
          if(verifyId!==requested)return fail('incierto','La respuesta posterior no corresponde al chat solicitado.');
          if((obj?.is_visible??obj?.conversation?.is_visible)===false)
            return {ok:true,stage:'confirmado',reason:'ChatGPT confirmó is_visible=false para el chat seleccionado.'};
          if((obj?.is_visible??obj?.conversation?.is_visible)===true&&attempt===5)
            return fail('incierto','ChatGPT continúa marcando el chat como visible tras la solicitud; no se reintenta.');
        }else if((verify.status===404||verify.status===410)&&acknowledgement?.success===true){
          return {ok:true,stage:'confirmado',reason:'ChatGPT confirmó la operación y dejó de servir la conversación.'};
        }else if(verify.status===429||verify.status===401||verify.status===403){
          return fail('incierto','Solicitud enviada, pero no se pudo comprobar el estado final (HTTP '+verify.status+').');
        }
      }
      return fail('incierto','Solicitud enviada sin evidencia inequívoca de eliminación. No se repetirá automáticamente.');
    } catch(e){return fail('error','Operación detenida: '+String(e?.message||e)+'. No se reintenta automáticamente.');}
  }
  async function executeSession(tabId,id,action,expectedFingerprint) {
    const result=await chrome.scripting.executeScript({target:{tabId},world:'MAIN',
      func:sessionConversationOperation,args:[id,action,expectedFingerprint]});
    return result?.[0]?.result||{ok:false,stage:'inyeccion',reason:'Sin respuesta de ChatGPT.'};
  }
  async function openChatTab(id, tabId=null) {
    const url=`https://chatgpt.com/c/${encodeURIComponent(id)}`;
    if(tabId===null){const t=await chrome.tabs.create({url,active:false});return t.id;}
    await chrome.tabs.update(tabId,{url});return tabId;
  }
  async function waitLoaded(tabId,timeout=30000){
    const start=Date.now();
    while(Date.now()-start<timeout){
      const tab=await chrome.tabs.get(tabId);
      if(!tab)throw new Error('Se cerró la pestaña de trabajo.');
      if(tab.status==='complete') {await new Promise(r=>setTimeout(r,1800));return;}
      await new Promise(r=>setTimeout(r,400));
    }
    throw new Error('Tiempo de carga agotado.');
  }
  async function confirmResult(tabId,id){
    // Polls a dedicated browser tab; does not click anything or send private API requests.
    for(let i=0;i<24;i++){
      await new Promise(resolve=>setTimeout(resolve,450));
      let tab;
      try{tab=await chrome.tabs.get(tabId);}catch(e){return {ok:false,stage:'incierto',reason:'La pestaña de trabajo se cerró antes de verificar la eliminación.'};}
      if(tab.url){
        try {const url=new URL(tab.url);if(url.origin==='https://chatgpt.com'&&!url.pathname.toLowerCase().endsWith(`/c/${id.toLowerCase()}`) && (url.pathname==='/' || /^\/g\/[^/]+\/?$/.test(url.pathname)))
          return {ok:true,stage:'confirmado',reason:'ChatGPT abandonó la conversación tras confirmar la eliminación.'};}
        catch(_){}
      }
      try{
        const out=await chrome.scripting.executeScript({target:{tabId},func:(expectedId)=>{
          const current=decodeURIComponent(location.pathname);
          const notices=[...document.querySelectorAll('[role="status"],[data-sonner-toast]')].map(e=>(e.innerText||e.textContent||'')).join(' ').toLowerCase();
          return {navigated:!current.toLowerCase().endsWith(`/c/${expectedId.toLowerCase()}`) && (current==='/' || /^\/g\/[^/]+\/?$/.test(current)),success:/(conversation deleted|chat deleted|conversación eliminada|chat eliminado)/i.test(notices)};
        },args:[id]});
        if(out?.[0]?.result?.navigated||out?.[0]?.result?.success)return {ok:true,stage:'confirmado',reason:'ChatGPT indicó que el chat fue eliminado.'};
      }catch(_){/* Loading navigation: check again; never assume success. */}
    }
    return {ok:false,stage:'incierto',reason:'Se solicitó eliminar, pero ChatGPT no confirmó el resultado en pantalla.'};
  }
  async function execute(tabId,id,signature,action='delete'){
    const results=await chrome.scripting.executeScript({target:{tabId},func:onChatPage,args:[id,signature,action]});
    return results?.[0]?.result||{ok:false,stage:'inyeccion',reason:'Sin respuesta de la pestaña de ChatGPT.'};
  }
  root.AOMBatch={eligible,preferredMethod,onChatPage,sessionConversationOperation,executeSession,openChatTab,waitLoaded,execute,confirmResult};
})(globalThis);
