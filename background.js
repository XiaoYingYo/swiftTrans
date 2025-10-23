importScripts('lib/storage.js');
let menuState = {};
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TRANSLATE') {
    handleTranslation(request).then(sendResponse);
    return true;
  }
  if (request.type === 'UPDATE_MENU_STATE') {
    if (sender.tab) {
      menuState[sender.tab.id] = request.isTranslating;
      updateContextMenu(sender.tab.id);
    }
    return false;
  }
});
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  updateContextMenu(activeInfo.tabId);
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateContextMenu(tabId);
  }
});
async function updateContextMenu(tabId) {
  const isTranslating = menuState[tabId] || false;
  const title = isTranslating ? chrome.i18n.getMessage('contextMenuRestore') : chrome.i18n.getMessage('contextMenuTranslate');
  chrome.contextMenus.update('swiftTrans-toggle', { title }, () => {
    if (chrome.runtime.lastError) {
      chrome.contextMenus.create({
        id: 'swiftTrans-toggle',
        title: title,
        contexts: ['all'],
      });
    }
  });
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (tab?.url) {
    const hostname = new URL(tab.url).hostname;
    const config = await StorageManager.getConfig();
    const isInList = config.domains[hostname] === true;
    const domainTitle = (isInList ? '✓ ' : '') + chrome.i18n.getMessage('contextMenuAddDomain');
    chrome.contextMenus.update('swiftTrans-add-domain', { title: domainTitle });
  }
}
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'swiftTrans-toggle') {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_TRANSLATION' });
  } else if (info.menuItemId === 'swiftTrans-add-domain' && tab?.url) {
    const hostname = new URL(tab.url).hostname;
    const config = await StorageManager.getConfig();
    if (config.domains[hostname] === true) {
      await StorageManager.removeDomain(hostname);
    } else {
      await StorageManager.addDomain(hostname);
      if (!menuState[tab.id]) {
        chrome.tabs.sendMessage(tab.id, { type: 'START_TRANSLATION_NOW' });
      }
    }
    updateContextMenu(tab.id);
  }
});
chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: 'swiftTrans-toggle',
    title: chrome.i18n.getMessage('contextMenuTranslate'),
    contexts: ['all'],
  });
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  let domainTitle = chrome.i18n.getMessage('contextMenuAddDomain');
  if (tabs[0]?.url) {
    const hostname = new URL(tabs[0].url).hostname;
    const config = await StorageManager.getConfig();
    if (config.domains[hostname] === true) {
      domainTitle = '✓ ' + chrome.i18n.getMessage('contextMenuAddDomain');
    }
  }
  chrome.contextMenus.create({
    id: 'swiftTrans-add-domain',
    title: domainTitle,
    contexts: ['all'],
  });
});
async function handleTranslation(request) {
  const { engine, texts, from, to } = request;
  try {
    if (engine === 'google') {
      return await translateGoogle(texts, from, to);
    } else if (engine === 'bing') {
      return await translateBing(texts, from, to);
    }
    return { error: 'Unknown engine' };
  } catch (err) {
    return { error: err.message };
  }
}
async function translateGoogle(texts, from, to) {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: from,
    tl: to,
  });
  const body = new URLSearchParams(texts.map((text) => ['q', text]));
  const response = await fetch(`https://translate.google.com/translate_a/t?${params}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  if (!response.ok) {
    throw new Error(`Google Translate API error: ${response.status}`);
  }
  const data = await response.json();
  let translations = [];
  if (Array.isArray(data)) {
    translations = data.map((item) => {
      if (Array.isArray(item)) {
        return item[0];
      }
      return item;
    });
  }
  return { translations };
}
async function translateBing(texts, from, to) {
  const fromLang = from === 'auto' ? '' : from;
  const params = new URLSearchParams({
    from: fromLang,
    to: to,
  });
  const body = texts.map((text, i) => ({
    Text: text,
  }));
  const response = await fetch(`https://www.bing.com/translator/api/translate/v3?${params}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Bing Translator API error: ${response.status}`);
  }
  const data = await response.json();
  const translations = data.map((item) => item.translations[0].text);
  return { translations };
}
