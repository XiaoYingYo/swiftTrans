let isTranslating = false;
let translatedNodes = [];
let processedNodes = null;
let mutationObserver = null;
let domProcessor = null;
let translator = null;
let config = null;
async function ensureModulesInitialized() {
  if (translator) {
    return;
  }
  const currentDomain = location.hostname;
  config = await StorageManager.getConfig();
  const filters = await StorageManager.loadFilters();
  const domainFilters = filters.domains[currentDomain] || [];
  const allFilters = [...new Set([...filters.global, ...domainFilters])];
  domProcessor = new DOMProcessor(allFilters);
  translator = new Translator(config.engine);
}
async function init() {
  await StorageManager.loadDomains();
  const currentDomain = location.hostname;
  if (StorageManager.isDomainEnabled(currentDomain)) {
    await startTranslation();
  } else {
    chrome.runtime.sendMessage({ type: 'UPDATE_MENU_STATE', isTranslating: false });
  }
}
async function translateNodes(nodes) {
  const textsToTranslate = [];
  const nodesToUpdate = [];
  for (const node of nodes) {
    if (processedNodes.has(node)) {
      continue;
    }
    processedNodes.add(node);
    const text = node.textContent.trim();
    if (!text) {
      continue;
    }
    const cached = await StorageManager.getCachedTranslation(text);
    if (cached) {
      domProcessor.updateNode(node, cached);
      processedNodes.delete(node);
      translatedNodes.push(node);
    } else {
      textsToTranslate.push(text);
      nodesToUpdate.push(node);
      // domProcessor.addIndicator(node);
    }
  }
  if (textsToTranslate.length) {
    try {
      const translations = await translator.translateMany(textsToTranslate, 'auto', config.language);
      for (let i = 0; i < translations.length; i++) {
        const text = textsToTranslate[i];
        const translation = translations[i];
        await StorageManager.saveCachedTranslation(text, translation);
        const node = nodesToUpdate[i];
        // domProcessor.removeIndicator(node);
        domProcessor.updateNode(node, translation);
        processedNodes.delete(node);
        translatedNodes.push(node);
      }
    } catch (err) {
      console.error('[SwiftTrans] Translation failed:', err);
      // nodesToUpdate.forEach((node) => domProcessor.removeIndicator(node));
    }
  }
}
async function startTranslation() {
  if (isTranslating) {
    return;
  }
  await ensureModulesInitialized();
  isTranslating = true;
  translatedNodes = [];
  processedNodes = new WeakSet();
  domProcessor.injectSpinnerStyles();
  mutationObserver = new MutationObserver(async (mutations) => {
    const freshNodes = [];
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          freshNodes.push(...domProcessor.collectNodes(node));
        }
      });
    }
    if (freshNodes.length) {
      // await translateNodes(freshNodes);
      translateNodes(freshNodes);
    }
  });
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
  const initialNodes = domProcessor.collectNodes();
  translateNodes(initialNodes);
  chrome.runtime.sendMessage({ type: 'UPDATE_MENU_STATE', isTranslating: true });
}
function stopTranslation() {
  if (!isTranslating) {
    return;
  }
  isTranslating = false;
  processedNodes = null;
  if (domProcessor) {
    domProcessor.restoreAllNodes(translatedNodes);
  }
  translatedNodes = [];
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
  chrome.runtime.sendMessage({ type: 'UPDATE_MENU_STATE', isTranslating: false });
}
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'TOGGLE_TRANSLATION') {
    (async () => {
      if (isTranslating) {
        stopTranslation();
      } else {
        await startTranslation();
      }
      sendResponse({ success: true, isTranslating });
    })();
    return true;
  } else if (msg.type === 'START_TRANSLATION_NOW') {
    (async () => {
      if (!isTranslating) {
        await startTranslation();
      }
      sendResponse({ success: true, isTranslating });
    })();
    return true;
  }
});
init();
