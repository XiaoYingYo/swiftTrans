(async function () {
  function i18n(key) {
    return chrome.i18n.getMessage(key);
  }
  function loadI18n() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = i18n(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = i18n(el.getAttribute('data-i18n-placeholder'));
    });
    document.title = i18n('settingsTitle');
  }
  loadI18n();
  const tablist = document.querySelector('[role="tablist"]');
  const tabs = tablist.querySelectorAll('[role="tab"]');
  function switchTab(tabId) {
    const tabToActivate = document.getElementById(tabId);
    if (!tabToActivate) {
      return;
    }
    tabs.forEach((tab) => {
      tab.setAttribute('aria-selected', 'false');
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (panel) {
        panel.hidden = true;
      }
    });
    tabToActivate.setAttribute('aria-selected', 'true');
    const activePanel = document.getElementById(tabToActivate.getAttribute('aria-controls'));
    if (activePanel) {
      activePanel.hidden = false;
    }
  }
  tablist.addEventListener('click', (e) => {
    if (e.target.matches('[role="tab"]')) {
      const tabId = e.target.id;
      switchTab(tabId);
      StorageManager.setLastTab(tabId);
    }
  });
  const lastTab = await StorageManager.getLastTab();
  switchTab(lastTab);
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      const domain = new URL(tab.url).hostname;
      if (domain) {
        document.getElementById('domainForFilter').value = domain;
      }
    }
  } catch (e) {
    console.warn('[SwiftTrans] Could not get current tab for auto-fill:', e);
  }
  const config = await StorageManager.getConfig();
  document.querySelector(`input[name="engine"][value="${config.engine}"]`).checked = true;
  document.getElementById('targetLanguage').value = config.language;
  document.querySelectorAll('input[name="engine"]').forEach((radio) => {
    radio.addEventListener('change', async (e) => {
      config.engine = e.target.value;
      await StorageManager.setConfig(config);
    });
  });
  document.getElementById('targetLanguage').addEventListener('change', async (e) => {
    config.language = e.target.value;
    await StorageManager.setConfig(config);
  });
  async function renderDomains(filter = '') {
    const config = await StorageManager.getConfig();
    let domains = Object.keys(config.domains);
    if (filter) {
      domains = domains.filter((d) => d.toLowerCase().includes(filter.toLowerCase()));
    }
    const list = document.getElementById('domainList');
    if (domains.length === 0) {
      list.innerHTML = `<p style="color:#999;padding:20px;text-align:center;">${filter ? i18n('msgNoMatchDomains') : i18n('msgNoDomains')}</p>`;
      return;
    }
    list.innerHTML = domains
      .map(
        (domain) => `
      <div class="domain-item">
        <span>${domain}</span>
        <button data-domain="${domain}">${i18n('btnDelete')}</button>
      </div>
    `,
      )
      .join('');
    list.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const domain = e.target.dataset.domain;
        await StorageManager.removeDomain(domain);
        const filterInput = document.getElementById('domainFilter');
        await renderDomains(filterInput ? filterInput.value.trim() : '');
      });
    });
  }
  document.getElementById('addDomainBtn').addEventListener('click', async () => {
    const input = document.getElementById('newDomain');
    const value = input.value.trim();
    if (!value) {
      return;
    }
    let domains = [];
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        domains = JSON.parse(value).filter((d) => d && typeof d === 'string');
      } catch (e) {
        alert(i18n('msgArrayError'));
        return;
      }
    } else {
      domains = value
        .split('\n')
        .map((d) => d.trim())
        .filter((d) => d);
    }
    for (const domain of domains) {
      await StorageManager.addDomain(domain);
    }
    input.value = '';
    const filterInput = document.getElementById('domainFilter');
    if (filterInput) {
      filterInput.value = '';
    }
    await renderDomains();
  });
  document.getElementById('addCurrentBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      const domain = new URL(tab.url).hostname;
      await StorageManager.addDomain(domain);
      await renderDomains();
    }
  });
  document.getElementById('clearCacheBtn').addEventListener('click', async () => {
    await StorageManager.clearAllCache();
    await updateCacheSize();
  });
  async function updateCacheSize() {
    const stats = await StorageManager.getCacheStats();
    document.getElementById('cacheSize').textContent = `${stats.sizeMB} MB (${stats.count} 条记录)`;
  }
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }
  const filterInput = document.getElementById('domainFilter');
  if (filterInput) {
    filterInput.addEventListener(
      'input',
      debounce((e) => {
        renderDomains(e.target.value.trim());
      }, 300),
    );
  }
  async function renderGlobalFilters() {
    const config = await StorageManager.getConfig();
    const filters = config.filters?.global || [];
    const list = document.getElementById('globalFiltersList');
    list.innerHTML = filters
      .map(
        (selector, index) => `
      <div class="domain-item">
        <span>${selector}</span>
        <button data-index="${index}">${i18n('btnDelete')}</button>
      </div>
    `,
      )
      .join('');
    list.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const index = parseInt(e.target.dataset.index, 10);
        const cfg = await StorageManager.getConfig();
        if (cfg.filters?.global?.[index] !== undefined) {
          cfg.filters.global.splice(index, 1);
        }
        await StorageManager.setConfig(cfg);
        await renderGlobalFilters();
      });
    });
  }
  async function renderDomainFilters(domain) {
    const config = await StorageManager.getConfig();
    const filters = config.filters?.domains?.[domain] || [];
    const list = document.getElementById('domainFiltersList');
    list.innerHTML = filters
      .map(
        (selector, index) => `
      <div class="domain-item">
        <span>${selector}</span>
        <button data-index="${index}" data-domain="${domain}">${i18n('btnDelete')}</button>
      </div>
    `,
      )
      .join('');
    list.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const index = parseInt(e.target.dataset.index, 10);
        const domain = e.target.dataset.domain;
        const cfg = await StorageManager.getConfig();
        if (cfg.filters?.domains?.[domain]?.[index] !== undefined) {
          cfg.filters.domains[domain].splice(index, 1);
          if (cfg.filters.domains[domain].length === 0) {
            delete cfg.filters.domains[domain];
          }
        }
        await StorageManager.setConfig(cfg);
        await renderDomainFilters(domain);
      });
    });
  }
  document.getElementById('addGlobalFilterBtn').addEventListener('click', async () => {
    const input = document.getElementById('newGlobalFilter');
    const selectors = input.value
      .trim()
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s);
    if (selectors.length === 0) return;
    const config = await StorageManager.getConfig();
    if (!config.filters) config.filters = { global: [], domains: {} };
    if (!config.filters.global) config.filters.global = [];
    config.filters.global = [...new Set([...config.filters.global, ...selectors])];
    await StorageManager.setConfig(config);
    input.value = '';
    await renderGlobalFilters();
  });
  document.getElementById('addDomainFilterBtn').addEventListener('click', async () => {
    const domainInput = document.getElementById('domainForFilter');
    const domain = domainInput.value.trim();
    if (!domain) {
      alert(i18n('msgDomainRequired'));
      return;
    }
    const filterInput = document.getElementById('newDomainFilter');
    const selectors = filterInput.value
      .trim()
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s);
    if (selectors.length === 0) return;
    const config = await StorageManager.getConfig();
    if (!config.filters) config.filters = { global: [], domains: {} };
    if (!config.filters.domains) config.filters.domains = {};
    config.filters.domains[domain] = [...new Set([...(config.filters.domains[domain] || []), ...selectors])];
    await StorageManager.setConfig(config);
    filterInput.value = '';
    await renderDomainFilters(domain);
  });
  document.getElementById('addDefaultRulesBtn').addEventListener('click', async () => {
    const domainInput = document.getElementById('domainForFilter');
    const domain = domainInput.value.trim();
    if (!domain) {
      alert(i18n('msgDomainRequired'));
      return;
    }
    const defaultRules = ['.notranslate', '[translate="no"]', 'code'];
    const config = await StorageManager.getConfig();
    if (!config.filters) config.filters = { global: [], domains: {} };
    if (!config.filters.domains) config.filters.domains = {};
    config.filters.domains[domain] = [...new Set([...(config.filters.domains[domain] || []), ...defaultRules])];
    await StorageManager.setConfig(config);
    await renderDomainFilters(domain);
  });
  document.getElementById('domainForFilter').addEventListener(
    'input',
    debounce((e) => {
      renderDomainFilters(e.target.value.trim());
    }, 300),
  );
  await renderDomains();
  await updateCacheSize();
  await renderGlobalFilters();
  await renderDomainFilters(document.getElementById('domainForFilter').value.trim());
})();
