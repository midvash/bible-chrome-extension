# Bible Chrome Extension

> 🌐 **English** · [Português (BR)](./README.pt-BR.md) · [Español](./README.es.md)

Chrome extension (Manifest V3) that scans web pages for Bible references and links them to [midvash.com](https://midvash.com), with a hover-preview tooltip of the verse.

All detection/preview logic runs against the [public Midvash API](https://api.midvash.com/v1) — `/v1/books`, `/v1/versions`, `/v1/{version}/{book}/{chapter}/{verse}`.

## Stack

- Manifest V3
- Vite 6 + `@crxjs/vite-plugin`
- React 19 + TypeScript (popup + options)
- Native `chrome.i18n` for Midvash's 9 languages

## Structure

```
apps/chrome-extension/
├── manifest.config.ts          # MV3 declared in TS (read by crxjs)
├── public/
│   ├── _locales/<lang>/        # native chrome.i18n messages
│   └── icons/                  # 16/32/48/128
└── src/
    ├── background.ts           # SW: weekly refresh of /v1/books and /v1/versions
    ├── content/                # parser + walker + linker + tooltip
    ├── popup/                  # active toggle, version, link to options
    ├── options/                # default version per locale + blacklist
    ├── lib/                    # api, storage, books-cache, locale, url
    └── types.ts
```

## Local development

```bash
pnpm install
npm run dev
```

Vite builds/updates the bundle in `dist/` in watch mode. Load it as **Load unpacked**:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and point it at `apps/chrome-extension/dist`
4. Edit code → reload the extension via the circular button on the card

## Production build

```bash
npm run build
npm run zip   # generates midvash-extension.zip
```

## Chrome Web Store release (manual in v1)

1. Bump `apps/chrome-extension/package.json` → `version`
2. `npm run build && npm run zip`
3. Upload `apps/chrome-extension/midvash-extension.zip` to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
4. Wait for review (3–7 days on first submission; hours for updates)

## Permissions

| Permission | Why |
|---|---|
| `storage` | store prefs (version per locale, blacklist) and the `/v1/books` cache |
| `alarms` | weekly refresh of the book index via service worker |
| `host_permissions: api.midvash.com` | fetch the public API (never sends page content) |
| `content_scripts: <all_urls>` | run on any site, but the script runs entirely on the client |

## Privacy

The extension **never sends page content** anywhere. It only makes a `GET` to `api.midvash.com` with the detected reference (e.g. `john 3:16`) to fetch the verse text. User prefs live in `chrome.storage.local` and never leave the browser.

Canonical privacy-policy text (to be published at `midvash.app`): [`docs/PRIVACY.md`](./docs/PRIVACY.md).

## Chrome Web Store submission

Everything needed to submit is in `docs/`:

- **[`docs/SUBMISSION.md`](./docs/SUBMISSION.md)** — all the copy ready to paste into the dashboard (title, descriptions, permission justifications, single purpose statement, screenshot spec).
- **[`docs/PRIVACY.md`](./docs/PRIVACY.md)** — canonical privacy-policy text to publish at `midvash.app`.
- **[`docs/CHECKLIST.md`](./docs/CHECKLIST.md)** — final checklist before clicking "Submit for Review".

### Before the first submission

1. Privacy Policy published at a public `midvash.app` URL (text ready in `PRIVACY.md`)
2. `homepage_url` in `manifest.config.ts` updated to `https://midvash.app`
3. 5 screenshots 1280×800 + small promo tile 440×280 (specs in `SUBMISSION.md` §4)
4. Chrome Web Store Developer account ($5) with 2FA enabled

## The Midvash ecosystem

Part of [**Midvash**](https://midvash.com) — a free Bible reading & study platform. Everything is open and interlinks:

| | |
|---|---|
| 📖 **Reader (web)** | [midvash.com](https://midvash.com) — 9 languages |
| 📱 **iOS app** | [midvash.app/ios](https://midvash.app/ios) |
| 🔌 **API** | [api.midvash.com](https://api.midvash.com) · [`bible-api`](https://github.com/midvash/bible-api) |
| 🤖 **MCP server** | [mcp.midvash.com](https://mcp.midvash.com) · [`bible-mcp`](https://github.com/midvash/bible-mcp) |
| 🧩 **WordPress plugin** | [midvash.app/wordpress-plugin](https://midvash.app/wordpress-plugin) · [`bible-wordpress-plugin`](https://github.com/midvash/bible-wordpress-plugin) |
| 🧩 **EmDash plugin** | [midvash.app/emdash-plugin](https://midvash.app/emdash-plugin) · [`emdash-plugin-bible`](https://github.com/midvash/emdash-plugin-bible) |
| 🌐 **Chrome extension** | [midvash.app/chrome-extension](https://midvash.app/chrome-extension) · [`bible-chrome-extension`](https://github.com/midvash/bible-chrome-extension) |
| 📦 **Open data** | [`bible-data`](https://github.com/midvash/bible-data) · [`bible-data-js`](https://github.com/midvash/bible-data-js) · [`bible-cross-references`](https://github.com/midvash/bible-cross-references) |

<sub>Free & open, built by [Midvash](https://midvash.com) · [midvash.com](https://midvash.com) · [midvash.app](https://midvash.app)</sub>
