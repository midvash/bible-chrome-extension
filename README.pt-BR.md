# Bible Chrome Extension

> 🌐 [English](./README.md) · **Português (BR)** · [Español](./README.es.md)

Extensão Chrome (Manifest V3) que escaneia páginas web em busca de referências bíblicas e linka pro [midvash.com](https://midvash.com), com tooltip de preview do versículo ao passar o mouse.

Toda a lógica de detecção/preview consome a [API pública do Midvash](https://api.midvash.com/v1) — `/v1/books`, `/v1/versions`, `/v1/{version}/{book}/{chapter}/{verse}`.

## Stack

- Manifest V3
- Vite 6 + `@crxjs/vite-plugin`
- React 19 + TypeScript (popup + options)
- `chrome.i18n` nativo para os 9 idiomas do Midvash

## Estrutura

```
apps/chrome-extension/
├── manifest.config.ts          # MV3 declarado em TS (lido pelo crxjs)
├── public/
│   ├── _locales/<lang>/        # mensagens nativas chrome.i18n
│   └── icons/                  # 16/32/48/128
└── src/
    ├── background.ts           # SW: refresh semanal de /v1/books e /v1/versions
    ├── content/                # parser + walker + linker + tooltip
    ├── popup/                  # toggle ativo, versão, link p/ options
    ├── options/                # versão default por locale + blacklist
    ├── lib/                    # api, storage, books-cache, locale, url
    └── types.ts
```

## Desenvolvimento local

```bash
pnpm install
npm run dev
```

O Vite gera/atualiza o bundle em `dist/` em modo watch. Carregue como **Load unpacked**:

1. Abra `chrome://extensions`
2. Ative **Developer mode**
3. Clique em **Load unpacked** e aponte para `apps/chrome-extension/dist`
4. Edite código → recarregue a extensão pelo botão circular no card

## Build de produção

```bash
npm run build
npm run zip   # gera midvash-extension.zip
```

## Release na Chrome Web Store (manual no v1)

1. Bump em `apps/chrome-extension/package.json` → `version`
2. `npm run build && npm run zip`
3. Upload do `apps/chrome-extension/midvash-extension.zip` no [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
4. Aguardar review (3-7 dias na primeira submissão; horas em updates)

## Permissões

| Permissão | Por quê |
|---|---|
| `storage` | guardar prefs (versão por locale, blacklist) e cache de `/v1/books` |
| `alarms` | refresh semanal do índice de livros via service worker |
| `host_permissions: api.midvash.com` | fetch da API pública (não envia conteúdo da página) |
| `content_scripts: <all_urls>` | rodar em qualquer site, mas o script roda inteiramente no cliente |

## Privacidade

A extensão **não envia conteúdo da página** pra lugar nenhum. Só faz `GET` em `api.midvash.com` com a referência detectada (ex: `joao 3:16`) pra buscar o texto do versículo. Prefs do usuário ficam em `chrome.storage.local`, não saem do navegador.

Texto canônico da política de privacidade (a publicar em `midvash.app`): [`docs/PRIVACY.md`](./docs/PRIVACY.md).

## Submissão à Chrome Web Store

Tudo que precisa pra submeter está em `docs/`:

- **[`docs/SUBMISSION.md`](./docs/SUBMISSION.md)** — todos os textos prontos pra colar no dashboard (title, descriptions, justificativas de permissão, single purpose statement, especificação dos screenshots).
- **[`docs/PRIVACY.md`](./docs/PRIVACY.md)** — texto canônico da política de privacidade pra publicar em `midvash.app`.
- **[`docs/CHECKLIST.md`](./docs/CHECKLIST.md)** — checklist final antes de clicar "Submit for Review".

### Pendências antes da primeira submissão

1. Privacy Policy publicada em URL pública de `midvash.app` (texto pronto em `PRIVACY.md`)
2. `homepage_url` em `manifest.config.ts` atualizada pra `https://midvash.app`
3. 5 screenshots 1280×800 + small promo tile 440×280 (especificações em `SUBMISSION.md` §4)
4. Conta Chrome Web Store Developer ($5) com 2FA ativado

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

