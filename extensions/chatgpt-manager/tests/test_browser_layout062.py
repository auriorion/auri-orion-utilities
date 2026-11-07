from playwright.sync_api import sync_playwright
import os
path='file:///mnt/data/manager_v062/manager.html'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--no-first-run'])
    page=browser.new_page(viewport={'width':1280,'height':800},color_scheme='dark')
    page.goto(path,wait_until='domcontentloaded',timeout=12000)
    # Open dialogs programmatically: their layout should never overflow the viewport.
    result=[]
    for dialog in ['remote-dialog','folder-dialog']:
        page.evaluate('(id) => document.getElementById(id).showModal()',dialog)
        dims=page.locator('#'+dialog).evaluate('el=>({x:el.getBoundingClientRect().x,w:el.getBoundingClientRect().width,c:el.clientWidth,scroll:el.scrollWidth,inner:el.querySelector(".dialog-body")?.getBoundingClientRect().width})')
        result.append((dialog,dims))
        assert dims['x']>=0 and dims['x']+dims['w']<=1281, result
        assert dims['scroll']<=dims['c']+4, result
        page.locator('#'+dialog).evaluate('el=>el.close()')
    # Mobile case
    page.set_viewport_size({'width':390,'height':750})
    page.evaluate('() => document.getElementById("remote-dialog").showModal()')
    dims=page.locator('#remote-dialog').evaluate('el=>({x:el.getBoundingClientRect().x,w:el.getBoundingClientRect().width,c:el.clientWidth,scroll:el.scrollWidth})')
    assert dims['x']>=0 and dims['x']+dims['w']<=391 and dims['scroll']<=dims['c']+4, dims
    print('PASS Chromium visual:',result,'mobile:',dims)
    browser.close()
