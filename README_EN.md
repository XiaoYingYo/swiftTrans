# SwiftTrans - Full Page Translation Extension

[中文](README.md) | English

A lightweight Chrome browser extension for full-page translation, supporting Google and Bing translation engines.

## Features

- Real-time full-page translation with dynamic content support
- Dual engine support: Google Translate, Bing Translator
- Intelligent caching mechanism for faster translation
- Domain whitelist for automatic translation
- Custom node filtering rules
- Quick toggle via right-click context menu
- Support for 25+ target languages

## Quick Start

### Installation

1. Clone or download the project locally
2. Open Chrome browser and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Select the project root directory

### Usage

- Right-click menu to select "Translate Page"/"Restore Original" to toggle translation state
- Right-click menu "Auto Translate" to add current domain to whitelist
- Click extension icon to open settings page and configure options

## Core Modules

### background.js
Service Worker background script that handles:
- Translation API request forwarding
- Dynamic context menu management
- Tab state synchronization

### content.js
Content script injected into target pages, responsible for:
- DOM node collection and translation
- MutationObserver monitoring for dynamic content
- Translation state management

### lib/storage.js
Chrome Storage API wrapper:
- Configuration persistence
- Translation cache management
- Domain whitelist management

### lib/dom-processor.js
Core DOM processing class:
- TreeWalker traversing text nodes
- Filter rule matching
- Original text preservation and restoration

## Configuration

### General Settings
- **Translation Engine**: Google Translate / Bing Translator
- **Target Language**: Support for zh-CN, en, ja, ko and 25+ languages
- **Cache Management**: View cache size, clear with one click

### Website List
- Add domains to automatic translation whitelist
- Support batch addition: array format or line-by-line input
- Search and filter added domains

### Node Filters
- **Global Rules**: CSS selectors applied to all websites
- **Domain Rules**: Filter rules for specific domains
- Default rules: `.notranslate`, `[translate="no"]`, `code`

## Tech Stack

- Manifest V3
- Chrome Extension APIs
- Vanilla JavaScript
- Chrome Storage API
- TreeWalker API
- MutationObserver API

## Development

### Permission Description
- `storage`: Configuration and cache storage
- `unlimitedStorage`: Large capacity translation cache
- `contextMenus`: Context menu integration
- `host_permissions`: Access to all HTTP/HTTPS pages

### API Endpoints
- Google Translate: `https://translate.google.com/translate_a/t`
- Bing Translator: `https://www.bing.com/translator/api/translate/v3`

## License

Please refer to the LICENSE file

## Contributing

Issues and Pull Requests are welcome