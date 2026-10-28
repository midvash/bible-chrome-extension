# Bible Chrome Extension

> 🌐 **English** · [Português (BR)](./README.pt-BR.md) · [Español](./README.es.md)

Chrome extension (Manifest V3) that scans web pages for Bible references and links them to [midvash.com](https://midvash.com), with a hover-preview tooltip of the verse.

All detection/preview logic runs against the [public Midvash API](https://api.midvash.com/v1) — `/v1/books`, `/v1/versions`, `/v1/{version}/{book}/{chapter}/{verse}`.

## Stack

- Manifest V3
- Vite 8 + `@crxjs/vite-plugin`
- React 19 + TypeScript (popup + options)
- Native `chrome.i18n` for Midvash's 9 languages

## Structure

```
bible-chrome-extension/
├── .github/workflows/ci.yml    # typecheck + test:parser
├── manifest.config.ts          # MV3 declared in TS (read by crxjs)
├── public/
│   ├── _locales/<lang>/        # native chrome.i18n messages
│   └── icons/                  # 16/32/48/128
└── src/
    ├── background.ts           # SW: weekly refresh of /v1/books and /v1/versions
    ├── content/                # parser + walker + linker + tooltip
    ├── popup/                  # active toggle, version, link to options
    ├── options/                # default version per locale + blacklist
    ├── sidepanel/              # mini reader in Chrome's side panel
    ├── lib/                    # api, storage, books-cache, locale, url
    └── types.ts
scripts/test-parser.ts          # parser tests (npm run test:parser)
```

## Local development

```bash
npm ci
npm run dev
```

Vite builds/updates the bundle in `dist/` in watch mode. Load it as **Load unpacked**:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and point it at `dist/`
4. Edit code → reload the extension via the circular button on the card

## Production build

```bash
npm run build
npm run zip   # generates midvash-extension.zip
```

## Checks

```bash
npm run typecheck
npm run test:parser
```

CI (`.github/workflows/ci.yml`) runs both on every push and PR.

## Chrome Web Store release (manual in v1)

1. Bump `package.json` → `version`
2. `npm run build && npm run zip`
3. Upload `midvash-extension.zip` to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
4. Wait for review (3–7 days on first submission; hours for updates)

## Permissions

| Permission | Why |
|---|---|
| `storage` | store prefs (version per locale, blacklist) and the `/v1/books` cache |
| `alarms` | weekly refresh of the book index via service worker |
| `activeTab` | read the active tab's hostname when the popup opens ("disable on this site") |
| `sidePanel` | open a reference in Chrome's side panel (popup setting or Alt+click) |
| `host_permissions: api.midvash.com` | fetch the public API (never sends page content) |
| `content_scripts: <all_urls>` | run on any site, but the script runs entirely on the client |

## Plugin key (optional)

`src/lib/plugin-key.ts` has `MIDVASH_PLUGIN_KEY`, empty in this repo. Empty, the extension uses only the openly licensed versions. With a key, every API call sends `X-Midvash-Plugin-Key`, `/v1/versions` also lists the versions with reserved rights (marked with © in the selectors) and the API serves them as asked. A key inside a browser extension is readable by anyone who opens the package.

## Privacy

The extension **never sends page content** anywhere. It only makes a `GET` to `api.midvash.com` with the detected reference (e.g. `john 3:16`) to fetch the verse text. User prefs live in `chrome.storage.local` and never leave the browser.

Canonical privacy-policy text (published at [midvash.com/chrome-extension/privacy](https://midvash.com/chrome-extension/privacy)): [`docs/PRIVACY.md`](./docs/PRIVACY.md).

## Chrome Web Store submission

Everything needed to submit is in `docs/`:

- **[`docs/SUBMISSION.md`](./docs/SUBMISSION.md)** — all the copy ready to paste into the dashboard (title, descriptions, permission justifications, single purpose statement, screenshot spec).
- **[`docs/PRIVACY.md`](./docs/PRIVACY.md)** — canonical privacy-policy text, published at https://midvash.com/chrome-extension/privacy.
- **[`docs/CHECKLIST.md`](./docs/CHECKLIST.md)** — final checklist before clicking "Submit for Review".

The extension is live on the [Chrome Web Store](https://chromewebstore.google.com/detail/pfgneahhammonobdfheebefijejhcaej). Homepage: https://midvash.com/chrome-extension.

## The Midvash ecosystem

Part of [**Midvash**](https://midvash.com) — a free Bible reading & study platform. Everything is open and interlinks:

| | |
|---|---|
| 📖 **Reader (web)** | [midvash.com](https://midvash.com) — 9 languages |
| 📱 **iOS app** | [midvash.com/ios](https://midvash.com/ios) |
| 🔌 **API** | [api.midvash.com](https://api.midvash.com) · [`bible-api`](https://github.com/midvash/bible-api) |
| 🤖 **MCP server** | [mcp.midvash.com](https://mcp.midvash.com) · [`bible-mcp`](https://github.com/midvash/bible-mcp) |
| 🧩 **WordPress plugin** | [midvash.com/wordpress-plugin](https://midvash.com/wordpress-plugin) · [`bible-wordpress-plugin`](https://github.com/midvash/bible-wordpress-plugin) |
| 🧩 **EmDash plugin** | [midvash.com/emdash-plugin](https://midvash.com/emdash-plugin) · [`emdash-plugin-bible`](https://github.com/midvash/emdash-plugin-bible) |
| 🌐 **Chrome extension** | [midvash.com/chrome-extension](https://midvash.com/chrome-extension) · [`bible-chrome-extension`](https://github.com/midvash/bible-chrome-extension) |
| 📦 **Open data** | [`bible-data`](https://github.com/midvash/bible-data) · [`bible-data-js`](https://github.com/midvash/bible-data-js) · [`bible-cross-references`](https://github.com/midvash/bible-cross-references) |

<sub>Free & open, built by [Midvash](https://midvash.com) · [midvash.com](https://midvash.com)</sub>
