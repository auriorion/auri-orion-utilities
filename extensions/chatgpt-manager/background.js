// Abrir una pestaña independiente; nunca inyectar scripts automáticamente en ChatGPT.
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('manager.html') });
});
