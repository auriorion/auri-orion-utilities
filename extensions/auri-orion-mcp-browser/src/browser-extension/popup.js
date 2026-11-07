const dot = document.getElementById("dot");
const statusText = document.getElementById("statusText");
const portEl = document.getElementById("port");
const connectBtn = document.getElementById("connect");
const disconnectBtn = document.getElementById("disconnect");
const versionEl = document.getElementById("version");

function render(st) {
  if (!st) return;
  dot.className = "dot";

  let text;
  if (st.disabled) {
    dot.classList.add("off");
    text = "Desconectado";
  } else if (st.connected) {
    dot.classList.add("on");
    const transport = st.transport === "native" ? "Mensajería nativa" : "WebSocket";
    text = `Conectado（${transport}）`;
  } else if (st.connecting) {
    text = "Conectando…";
  } else {
    dot.classList.add("off");
    text = "Sin conexión (reintentará)";
  }

  statusText.textContent = text;
  statusText.title = st.clientId ? `${st.browser} · ${st.clientId}` : "";
  if (document.activeElement !== portEl) portEl.value = st.port;
  connectBtn.disabled = !st.disabled && (st.connected || st.connecting);
  disconnectBtn.disabled = st.disabled;
}

function refresh() {
  chrome.runtime.sendMessage({ type: "status" }, render);
}

connectBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "connect" }, refresh);
});
disconnectBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "disconnect" }, refresh);
});
document.getElementById("save").addEventListener("click", () => {
  const port = Number(portEl.value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    statusText.textContent = "El puerto debe ser un número entero entre 1 y 65535";
    return;
  }
  chrome.runtime.sendMessage({ type: "setPort", port }, (result) => {
    if (result?.ok === false) statusText.textContent = result.error;
    else refresh();
  });
});

// Browser popups may cancel a normal target=_blank navigation when they close.
document.getElementById("ghLink").addEventListener("click", (event) => {
  event.preventDefault();
  chrome.tabs.create({ url: event.currentTarget.href });
});

// "Copy for agent": hands the agent a self-contained setup + behavior contract
// instead of making the user transcribe INSTALL.md by hand.
const copyAgentBtn = document.getElementById("copyAgent");

function agentGuideText(port) {
  const extId = chrome.runtime.id;
  return [
    "Auri–Orion MCP Browser — agent setup and operating contract",
    "Repo: https://github.com/auriorion/auri-orion-utilities/tree/main/extensions/auri-orion-mcp-browser (full guide: INSTALL.md)",
    "",
    `1. The extension is already installed in this browser (id ${extId}) and connects on port ${port}.`,
    "2. If an MCP server already listens on this port, reuse it; do NOT start a second server on the same port.",
    "   Only when none exists, register the stdio MCP server in your client (merge, do not overwrite existing servers):",
    '   {"mcpServers":{"auri-orion-mcp-browser":{"command":"node","args":["<repo absolute path>/extensions/auri-orion-mcp-browser/src/mcp-server/index.js"],"env":{"BSM_PORT":"' + port + '"}}}}',
    "   Replace <repo absolute path> with the real clone location. Node 22+; no npm install needed. Do NOT also run npm start — the client manages the server.",
    "3. Reconnect the MCP server in the client, then verify with connection_status until it reports state=connected (retry up to 3 times after the popup shows Conectado). Stop once connected.",
    "4. Workflow: tabs_list → pick the user's tab and pass explicit tabId → snapshot → act via fresh ref with click/type/press_key. Pass snapshot's revision as expectRevision to refuse acting on a changed page; check result.effect (navigation/dom_changed/input_dispatched/scrolled/no_visible_change).",
    "5. tabs_list origin=agent marks tabs opened via navigate newTab; leave origin=user tabs' content and lifecycle to the user unless asked.",
    "6. Never auto-retry an action whose outcome is uncertain (RESPONSE_TIMEOUT, BROWSER_DISCONNECTED). Call connection_status: lateResponses records whether a timed-out action completed late.",
    "7. On CSP/eval failures use read/snapshot instead of evaluate; do not touch cookies, passwords or unrelated browser data.",
  ].join("\n");
}

copyAgentBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "status" }, async (st) => {
    const text = agentGuideText(st?.port || 9777);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    const label = copyAgentBtn.textContent;
    copyAgentBtn.textContent = "Copiado";
    setTimeout(() => (copyAgentBtn.textContent = label), 1500);
  });
});

const manifest = chrome.runtime.getManifest();
versionEl.textContent = `v${manifest.version_name || manifest.version}`;
refresh();
setInterval(refresh, 1500);
