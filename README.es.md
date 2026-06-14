# Bible Chrome Extension

> 🌐 [English](./README.md) · [Português (BR)](./README.pt-BR.md) · **Español**

Extensión de Chrome (Manifest V3) que analiza páginas web en busca de referencias bíblicas y las enlaza con [midvash.com](https://midvash.com), con un tooltip de vista previa del versículo al pasar el cursor.

Toda la lógica de detección/vista previa se ejecuta contra la [API pública de Midvash](https://api.midvash.com/v1) — `/v1/books`, `/v1/versions`, `/v1/{version}/{book}/{chapter}/{verse}`.

## Stack

- Manifest V3
- Vite 6 + `@crxjs/vite-plugin`
- React 19 + TypeScript (popup + opciones)
- `chrome.i18n` nativo para los 9 idiomas de Midvash

## Estructura

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

## Desarrollo local

```bash
pnpm install
npm run dev
```

Vite compila/actualiza el bundle en `dist/` en modo watch. Cárgalo como **Load unpacked**:

1. Abre `chrome://extensions`
2. Activa el **Modo de desarrollador**
3. Haz clic en **Load unpacked** y apúntalo a `apps/chrome-extension/dist`
4. Edita el código → recarga la extensión con el botón circular de la tarjeta

## Compilación de producción

```bash
npm run build
npm run zip   # generates midvash-extension.zip
```

## Publicación en la Chrome Web Store (manual en v1)

1. Incrementa `apps/chrome-extension/package.json` → `version`
2. `npm run build && npm run zip`
3. Sube `apps/chrome-extension/midvash-extension.zip` al [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
4. Espera la revisión (3–7 días en el primer envío; horas para las actualizaciones)

## Permisos

| Permiso | Por qué |
|---|---|
| `storage` | guardar preferencias (versión por locale, blacklist) y la caché de `/v1/books` |
| `alarms` | actualización semanal del índice de libros vía service worker |
| `host_permissions: api.midvash.com` | consultar la API pública (nunca envía el contenido de la página) |
| `content_scripts: <all_urls>` | ejecutarse en cualquier sitio, pero el script corre completamente en el cliente |

## Privacidad

La extensión **nunca envía el contenido de la página** a ningún lugar. Solo hace un `GET` a `api.midvash.com` con la referencia detectada (p. ej. `john 3:16`) para obtener el texto del versículo. Las preferencias del usuario viven en `chrome.storage.local` y nunca salen del navegador.

Texto canónico de la política de privacidad (que se publicará en `midvash.app`): [`docs/PRIVACY.md`](./docs/PRIVACY.md).

## Envío a la Chrome Web Store

Todo lo necesario para el envío está en `docs/`:

- **[`docs/SUBMISSION.md`](./docs/SUBMISSION.md)** — todo el texto listo para pegar en el dashboard (título, descripciones, justificaciones de permisos, declaración de propósito único, especificación de capturas de pantalla).
- **[`docs/PRIVACY.md`](./docs/PRIVACY.md)** — texto canónico de la política de privacidad para publicar en `midvash.app`.
- **[`docs/CHECKLIST.md`](./docs/CHECKLIST.md)** — checklist final antes de hacer clic en "Submit for Review".

### Antes del primer envío

1. Política de Privacidad publicada en una URL pública de `midvash.app` (texto listo en `PRIVACY.md`)
2. `homepage_url` en `manifest.config.ts` actualizado a `https://midvash.app`
3. 5 capturas de pantalla 1280×800 + mosaico promocional pequeño 440×280 (especificaciones en `SUBMISSION.md` §4)
4. Cuenta de Chrome Web Store Developer ($5) con 2FA activado

## El ecosistema Midvash

Parte de [**Midvash**](https://midvash.com) — una plataforma gratuita de lectura y estudio bíblico. Todo es abierto y se interconecta:

| | |
|---|---|
| 📖 **Lector (web)** | [midvash.com](https://midvash.com) — 9 idiomas |
| 📱 **App iOS** | [midvash.app/ios](https://midvash.app/ios) |
| 🔌 **API** | [api.midvash.com](https://api.midvash.com) · [`bible-api`](https://github.com/midvash/bible-api) |
| 🤖 **Servidor MCP** | [mcp.midvash.com](https://mcp.midvash.com) · [`bible-mcp`](https://github.com/midvash/bible-mcp) |
| 🧩 **Plugin de WordPress** | [midvash.app/wordpress-plugin](https://midvash.app/wordpress-plugin) · [`bible-wordpress-plugin`](https://github.com/midvash/bible-wordpress-plugin) |
| 🧩 **Plugin de EmDash** | [midvash.app/emdash-plugin](https://midvash.app/emdash-plugin) · [`emdash-plugin-bible`](https://github.com/midvash/emdash-plugin-bible) |
| 🌐 **Extensión de Chrome** | [midvash.app/chrome-extension](https://midvash.app/chrome-extension) · [`bible-chrome-extension`](https://github.com/midvash/bible-chrome-extension) |
| 📦 **Datos abiertos** | [`bible-data`](https://github.com/midvash/bible-data) · [`bible-data-js`](https://github.com/midvash/bible-data-js) · [`bible-cross-references`](https://github.com/midvash/bible-cross-references) |

<sub>Gratuito y abierto, hecho por [Midvash](https://midvash.com) · [midvash.com](https://midvash.com) · [midvash.app](https://midvash.app)</sub>
