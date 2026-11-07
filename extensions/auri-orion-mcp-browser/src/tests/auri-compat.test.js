const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const worker=read("browser-extension/service-worker.js");
const server=read("mcp-server/index.js");
const manifest=JSON.parse(read("browser-extension/manifest.json"));
const allTools=["connection_status","browser_select","navigate","snapshot","read","click","type","press_key","evaluate","screenshot","scroll","tabs_list","tab_select","wait"];
test("paridad MCP: se conservan las 14 herramientas y métodos de extensión",()=>{
  for(const tool of allTools){
    assert.ok(server.includes('name: "'+tool+'"'),"el servidor no declara "+tool);
    if(!["connection_status","browser_select"].includes(tool))
      assert.ok(worker.includes('case "'+tool+'":'),"la extensión no implementa "+tool);
  }
});
test("permisos de referencia y manifiesto MV3",()=>{
  assert.equal(manifest.manifest_version,3);
  assert.equal(manifest.name,"Auri–Orion MCP Browser");
  assert.deepEqual(manifest.permissions,["tabs","scripting","storage","alarms","nativeMessaging"]);
  assert.deepEqual(manifest.host_permissions,["<all_urls>"]);
});
test("puerto compartido 9777 por defecto; servidor independiente y host nativo aislados",()=>{
  assert.ok(worker.includes("const DEFAULT_PORT = 9777;"));
  assert.ok(read("browser-extension/popup.html").includes('value="9777"'));
  assert.ok(read("browser-extension/popup.js").includes("st?.port || 9777"));
  assert.ok(worker.includes('const NATIVE_HOST = "auri_orion_mcp_browser";'));
  assert.ok(server.includes('intEnv("BSM_PORT", "BML_PORT", 9778'));
  const bridge=read("native-messaging-host/bridge.js");
  assert.ok(bridge.includes("ws://127.0.0.1:9778"));
  const installer=read("native-messaging-host/install.js");
  assert.ok(installer.includes('const HOST_NAME = "auri_orion_mcp_browser";'));
  assert.ok(installer.includes("auri_orion_mcp_browser.chrome.json"));
  assert.ok(!installer.includes('const LEGACY_HOST_NAME'));
  assert.ok(!installer.includes('const HOST_NAME = "browser_session_mcp";'));
});
