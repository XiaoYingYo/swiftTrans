class Translator {
  constructor(engine) {
    this.engine = engine;
  }
  async translateMany(texts, from = 'auto', to = 'zh-CN') {
    const response = await chrome.runtime.sendMessage({
      type: 'TRANSLATE',
      engine: this.engine,
      texts,
      from,
      to
    });
    if (response.error) {
      throw new Error(response.error);
    }
    return response.translations;
  }
}