class StorageManager {
  static domainCache = null;
  static filterCache = null;
  static async loadDomains() {
    if (!this.domainCache) {
      const { config } = await chrome.storage.local.get('config');
      this.domainCache = config?.domains || {};
    }
    return this.domainCache;
  }
  static async loadFilters() {
    if (this.filterCache) {
      return this.filterCache;
    }
    const { config } = await chrome.storage.local.get('config');
    this.filterCache = config?.filters || { global: [], domains: {} };
    return this.filterCache;
  }
  static isDomainEnabled(domain) {
    return this.domainCache?.[domain] === true;
  }
  static async getConfig() {
    const { config } = await chrome.storage.local.get('config');
    return config || { engine: 'google', language: 'zh-CN', domains: {}, filters: { global: [], domains: {} } };
  }
  static async setConfig(config) {
    await chrome.storage.local.set({ config });
    this.domainCache = config.domains;
    this.filterCache = config.filters || { global: [], domains: {} };
  }
  static async addDomain(domain) {
    const config = await this.getConfig();
    config.domains[domain] = true;
    await this.setConfig(config);
  }
  static async removeDomain(domain) {
    const config = await this.getConfig();
    delete config.domains[domain];
    await this.setConfig(config);
  }
  static async getCachedTranslation(text) {
    const key = `cache:${this.hash(text)}`;
    const result = await chrome.storage.local.get(key);
    return result[key]?.translation;
  }
  static async saveCachedTranslation(text, translation) {
    const key = `cache:${this.hash(text)}`;
    await chrome.storage.local.set({
      [key]: { text, translation, timestamp: Date.now() },
    });
  }
  static async clearAllCache() {
    const all = await chrome.storage.local.get(null);
    const cacheKeys = Object.keys(all).filter((k) => k.startsWith('cache:'));
    await chrome.storage.local.remove(cacheKeys);
  }
  static async getCacheStats() {
    const all = await chrome.storage.local.get(null);
    const cacheKeys = Object.keys(all).filter((k) => k.startsWith('cache:'));
    const sizeBytes = JSON.stringify(all).length;
    return {
      count: cacheKeys.length,
      sizeMB: (sizeBytes / 1024 / 1024).toFixed(2),
    };
  }
  static hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h = h & h;
    }
    return `${str.length}_${Math.abs(h).toString(36)}`;
  }
  static async getLastTab() {
    const { lastTab } = await chrome.storage.local.get('lastTab');
    return lastTab || 'general-tab';
  }
  static async setLastTab(tabId) {
    await chrome.storage.local.set({ lastTab: tabId });
  }
}
