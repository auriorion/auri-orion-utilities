from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
from pathlib import Path

ID='6f9096ed-224c-8394-8c9d-062503d43d46'
TITLE='Humedad en el pan'
ROOT=Path(__file__).resolve().parents[1]
HTML='''<!DOCTYPE html><html><head><title>Humedad en el pan - ChatGPT</title></head><body>
 <div id="fixture"></div><script>
 const id='''+repr(ID)+''';
 const mode=new URLSearchParams(location.search).get('layout');
 const row='<aside><div class="chat-row"><a href="/c/'+id+'">Humedad en el pan</a><button id="opts" aria-haspopup="menu" aria-label="Más opciones">···</button></div></aside>';
 const header='<main><header data-testid="conversation-header"><button id="opts" aria-haspopup="menu" aria-label="Más opciones">···</button></header><h1>Humedad en el pan</h1></main>';
 const ambiguous='<main><header data-testid="conversation-header"><button aria-haspopup="menu">Modelos</button><button aria-haspopup="menu">Perfil</button></header><h1>Humedad en el pan</h1></main>';
 document.getElementById('fixture').innerHTML = mode==='row'?row:(mode==='header'?header:ambiguous);
 window.__clicked=0;
 if(document.querySelector('#opts'))document.querySelector('#opts').onclick=()=>{
   const existing=document.getElementById('menu');if(existing){existing.remove();return;}
   let menu=document.createElement('div');menu.setAttribute('role','menu');menu.id='menu';
   menu.innerHTML='<div role="menuitem" id="delete">Eliminar</div>';
   document.body.appendChild(menu);
   menu.querySelector('#delete').onclick=()=>{window.__clicked++;menu.remove();
    let d=document.createElement('div');d.setAttribute('role','alertdialog');
    d.innerHTML='<p>¿Eliminar conversación?</p><button id="confirm">Eliminar</button>';
    document.body.appendChild(d);d.querySelector('#confirm').onclick=()=>{window.__confirmed++;d.remove();};};
 };
 window.__confirmed=0;
 </script></body></html>'''
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body=HTML.encode();self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
    def log_message(self,*args):pass

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
    Thread(target=server.serve_forever,daemon=True).start()
    try:
      with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        for mode in ('row','header','ambiguous'):
          page=browser.new_page()
          page.set_content(HTML.replace("const mode=new URLSearchParams(location.search).get('layout');","const mode="+repr(mode)+";"))
          page.add_script_tag(path=str(ROOT/'js/batch.js'))
          result=page.evaluate('async ([id,title]) => {const location={pathname:"/c/"+id,origin:"https://chatgpt.com"};const fn=eval("("+AOMBatch.onChatPage.toString()+")");return await fn(id,{title},"locate")}',[ID,TITLE])
          if mode in ('row','header'):
            assert result['ok'] is True,(mode,result)
            assert page.evaluate('window.__clicked')==0
            assert page.evaluate('window.__confirmed')==0
          else:assert not result['ok'] and result['stage']=='menu',(mode,result)
          page.close()
        # Full deletion through *mocked* UI only, never a real account.
        page=browser.new_page()
        page.set_content(HTML.replace("const mode=new URLSearchParams(location.search).get('layout');","const mode='header';"))
        page.add_script_tag(path=str(ROOT/'js/batch.js'))
        result=page.evaluate('async ([id,title]) => {const location={pathname:"/c/"+id,origin:"https://chatgpt.com"};const fn=eval("("+AOMBatch.onChatPage.toString()+")");return await fn(id,{title},"delete")}',[ID,TITLE])
        assert result['ok'] and result['stage']=='enviado',result
        assert page.evaluate('window.__clicked')==1
        assert page.evaluate('window.__confirmed')==1
        browser.close()
        print('PASS v0.6.3: row menu, active header menu, ambiguous menus fail-closed, mocked delete confirmation')
    finally:server.shutdown()

if __name__=='__main__':run()
