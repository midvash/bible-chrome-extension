# Privacy Policy — Texto canônico

Este é o **texto canônico** da política de privacidade da extensão Chrome do Midvash. A versão pública mora em **https://midvash.com/chrome-extension/privacy** (página `apps/web/src/pages/chrome-extension/privacy.astro` do monorepo do Midvash). Sem essa URL pública 200 OK, a extensão não passa no review da Chrome Web Store.

> Mudou este texto? Atualize o `Last updated` e a página pública junto.

---

# Midvash Chrome Extension — Privacy Policy

**Last updated: 2026-10-28**

## 1. Summary

The Midvash Chrome Extension does not collect, store, transmit, or sell any personal data. It does not track browsing activity, send page content to any server, use cookies, or include third-party analytics or advertising.

## 2. What the extension does

The extension scans the text of web pages you visit, locally on your device, looking for Bible scripture references (such as "John 3:16" or "Salmos 23"). When it finds a reference, it replaces that piece of text with a link to the corresponding passage on midvash.com, and shows the verse text in a hover preview when you point at the link.

## 3. Data the extension reads

To detect references, the content script reads visible text content on the pages you visit. **This reading happens entirely in your browser.** No page content, URLs, form fields, cookies, login state, or any other browsing information is ever transmitted to any server, written to disk, or shared with anyone.

## 4. Network requests

The only network requests the extension makes go to **`api.midvash.com`** — the official Midvash public API. These requests are limited to:

- Fetching the public list of Bible books and translations (cached locally for 7 days)
- Fetching the text of a specific Bible verse when you hover over a detected reference

Request payloads contain only Bible reference identifiers (book slug, chapter, verse number). They do **not** contain page content, page URL, your IP-related identifiers beyond those any HTTP request implicitly carries, or any user identifier provided by the extension.

## 5. Local storage

The extension uses `chrome.storage.local` to keep:

- **User preferences**: default Bible version per language, comparison version per language, list of sites where the extension is disabled, tooltip on/off setting, and where links open (new tab or side panel).
- **Cache of public Bible content**: the book index and the version list, refreshed weekly to avoid hitting the API on every page.

This data is stored only on your device. It is not uploaded, shared, or transmitted.

## 6. Permissions

The extension requests the minimum permissions required for its single purpose:

| Permission | Why |
|---|---|
| `storage` | Save preferences and the local cache of public Bible content. |
| `alarms` | Trigger a weekly background refresh of the cached book/version index. |
| `activeTab` | Read the hostname of the current tab when you open the popup, to offer the "disable on this site" toggle. |
| `sidePanel` | Show a passage in Chrome's side panel when you choose to open references there. The panel fetches the text from the API described in §4. |
| `host_permissions: https://api.midvash.com/*` | Make the API requests described in §4. |
| `content_scripts: <all_urls>` | Run the local-only reference detector on any page you read. |

## 7. Third parties

The extension does **not** integrate any third-party SDK, analytics provider, ad network, or telemetry service.

## 8. Children

The extension does not knowingly collect any information from anyone, including children under 13.

## 9. Security

Because the extension does not collect or transmit personal data, there is no personal data to leak in case of an incident. Source code, cached content, and preferences are protected by the standard Chrome extension sandbox.

## 10. Changes

If this policy materially changes, the updated version will be published at the same URL with a new `Last updated` date. A summary of changes will accompany any extension update that affects data handling.

## 11. Contact

For questions or requests related to this policy, contact contact@midvash.com.
