class DOMProcessor {
  static SKIP_TAGS = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'SVG'];
  constructor(filterSelectors = []) {
    this.originalText = new WeakMap();
    this.filterSelectors = filterSelectors;
    this.styleInjected = false;
  }
  injectSpinnerStyles() {
    if (this.styleInjected) {
      return;
    }
    const style = document.createElement('style');
    style.textContent = `
      .swift-trans-loading {
        position: relative;
      }
      .swift-trans-loading::before {
        content: '';
        position: absolute;
        top: 0.15em;
        left: -1em;
        width: 0.8em;
        height: 0.8em;
        border: 1.5px solid rgba(0, 0, 0, 0.2);
        border-top-color: #000;
        border-radius: 50%;
        animation: swift-trans-spinner 0.6s linear infinite;
      }
      @keyframes swift-trans-spinner {
        to {
          transform: rotate(360deg);
        }
      }
    `;
    document.head.appendChild(style);
    this.styleInjected = true;
  }
  addIndicator(node) {
    if (node && node.parentElement) {
      node.parentElement.classList.add('swift-trans-loading');
    }
  }
  removeIndicator(node) {
    if (node && node.parentElement) {
      node.parentElement.classList.remove('swift-trans-loading');
    }
  }
  collectNodes(rootElem = document.body) {
    const nodes = [];
    const walker = document.createTreeWalker(rootElem, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: (node) => {
        if (node instanceof HTMLElement) {
          if (node.shadowRoot) {
            nodes.push(...this.collectNodes(node.shadowRoot));
          }
          const skipByTag = DOMProcessor.SKIP_TAGS.includes(node.tagName);
          if (skipByTag) {
            return NodeFilter.FILTER_REJECT;
          }
        }
        if (node instanceof Text) {
          const elem = node.parentElement;
          if (!elem || DOMProcessor.SKIP_TAGS.includes(elem.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (this.filterSelectors.length > 0) {
            let current = elem;
            while (current && current !== document.documentElement) {
              try {
                if (this.filterSelectors.some((selector) => current.matches(selector))) {
                  return NodeFilter.FILTER_REJECT;
                }
              } catch (e) {
                console.warn(`[SwiftTrans] Invalid selector: ${e.message}`);
              }
              current = current.parentElement;
            }
          }
          if (elem.isContentEditable || elem instanceof HTMLInputElement || elem instanceof HTMLTextAreaElement) {
            return NodeFilter.FILTER_REJECT;
          }
          const text = node.textContent.trim();
          if (text && /\p{L}/u.test(text)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_SKIP;
      },
    });
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node instanceof Text) {
        this.originalText.set(node, node.textContent);
        nodes.push(node);
      }
    }
    return nodes;
  }
  updateNode(node, translation) {
    if (node instanceof Text) {
      const original = this.originalText.get(node);
      if (original) {
        const leadingSpaces = original.match(/^\s*/)[0];
        const trailingSpaces = original.match(/\s*$/)[0];
        node.nodeValue = `${leadingSpaces}${translation}${trailingSpaces}`;
      } else {
        node.nodeValue = translation;
      }
    }
  }
  restoreNode(node) {
    if (node instanceof Text) {
      const original = this.originalText.get(node);
      if (original) {
        node.nodeValue = original;
      }
    }
  }
  restoreAllNodes(nodes) {
    nodes.forEach((node) => this.restoreNode(node));
  }
}
