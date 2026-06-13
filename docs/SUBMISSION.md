# Chrome Web Store — Submission Pack

Tudo que precisa ser **copiado e colado** no [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) na hora de submeter a extensão.

> **Antes de submeter, garanta:**
> 1. Conta de Developer ($5 lifetime fee paga)
> 2. **2-Step Verification ativado** na conta Google (exigência da CWS)
> 3. ZIP de produção pronto: `npm run build && npm run zip`
> 4. URL pública da Privacy Policy ativa (ver `PRIVACY.md`)
> 5. Os 5 ativos visuais em `assets/store/` (ver §4)

---

## 1. Listing fields

### Title
```
Midvash — Bible Links
```

### Short description (max 132 chars — já vem dos `_locales/*/messages.json`)
- **en**: `Detects Bible references on any page and links them to Midvash with a hover preview.`
- **pt_BR**: `Detecta referências bíblicas em qualquer página e linka pro Midvash com preview ao passar o mouse.`
- **es**: `Detecta referencias bíblicas en cualquier página y las enlaza a Midvash con vista previa al pasar el cursor.`
- **de**: `Erkennt Bibelstellen auf jeder Seite und verlinkt sie zu Midvash mit Vorschau beim Überfahren mit der Maus.`
- **fr**: `Détecte les références bibliques sur toute page et les lie à Midvash avec un aperçu au survol.`
- **it**: `Rileva i riferimenti biblici su qualsiasi pagina e li collega a Midvash con anteprima al passaggio del mouse.`
- **zh_CN**: `在任何网页上识别圣经引用,并链接到 Midvash,鼠标悬停可预览经文。`
- **ru**: `Распознаёт библейские ссылки на любой странице и связывает их с Midvash, показывая предпросмотр стиха при наведении.`
- **ko**: `어떤 페이지에서든 성경 참조를 감지하여 Midvash로 연결하고, 마우스를 올리면 구절을 미리 보여줍니다.`

### Detailed description (cole no campo "Description" do dashboard)

```
Midvash makes Bible references on any web page clickable. Reading a sermon, blog post, or article and bumped into "John 3:16" or "Salmos 23"? The extension detects references in 9 languages, links them to midvash.com, and shows the verse text in an elegant hover preview — without leaving the page.

WHAT IT DOES
• Detects Bible references in plain text on any web page
• Links them to the corresponding chapter/verse on midvash.com
• Hover preview shows the verse text inline (or the first verses of the chapter)
• Works in 9 languages: English, Portuguese, Spanish, German, French, Italian, Chinese, Russian, Korean
• Choose your default Bible version per language
• Block specific sites with one click
• Toggle on/off per site from the popup

PRIVACY-FIRST
• 100% client-side detection — page content never leaves your browser
• No tracking, no analytics, no ads, no third-party SDKs
• The only network requests go to api.midvash.com to fetch public Bible content for the preview
• User preferences live in chrome.storage.local and never leave the device

OPEN AND TRANSPARENT
The extension is built on the public Midvash API (api.midvash.com) which serves Bible content from public-domain and licensed translations. Source code is part of the open Midvash project.

PRIVACY POLICY
See the privacy policy at https://midvash.app/chrome-extension/privacy/
```

### Category
**Productivity** (alternativa: *Accessibility*)

### Language
Listing primary language: **English**. Traduções automáticas da Web Store usam o `_locales/`.

### Support URL
```
https://midvash.com/contact   (ou URL de suporte do Midvash)
```

### Homepage URL
```
https://midvash.app/chrome-extension
```

---

## 2. Privacy practices tab

### Single purpose statement (campo "Single purpose")

```
Detect Bible scripture references on web pages the user reads and link them to the corresponding passage on Midvash, optionally showing the verse text in a hover preview. The extension performs no other function.
```

### Permission justifications

| Permission | Justification (cole exatamente) |
|---|---|
| `storage` | Stores user preferences (default Bible version per language, blocked sites, tooltip toggle) and a 7-day cache of the public book/version index from api.midvash.com. All data stays in chrome.storage.local and never leaves the browser. |
| `alarms` | Schedules a weekly background refresh of the public book/version index from api.midvash.com so the reference parser stays up to date when new translations are added. |
| `activeTab` | When the user opens the extension popup, the popup needs to know the hostname of the active tab in order to offer a contextual "Block references on this site" / "Enable on this site" button. This permission is used only to read the active tab's URL when the popup is invoked by the user — no other tab data is accessed and no scripts are injected via this permission. |
| `host_permissions` (`https://api.midvash.com/*`) | The extension fetches public Bible content (book list, version list, individual verses) from the official Midvash public API to render the hover preview. No other host is contacted. |
| Remote code use | None. All code is bundled in the extension package; the extension does not load or execute remote scripts. |

### `<all_urls>` content script — justificativa

A Web Store pergunta especificamente sobre o uso de host permissions amplas / `<all_urls>` em content scripts. Cole:

```
The extension's single purpose is to enhance any web page the user reads by detecting Bible scripture references in the page text. By definition this requires running on every site the user chooses to visit. The content script reads page text only on the client; no page content is ever transmitted to any server. Reference detection is performed entirely locally using a cached index of book names from api.midvash.com.

The extension does NOT:
- Read or store form data, passwords, cookies, or any user input
- Track browsing activity
- Modify or inject content beyond replacing detected reference text spans with anchor elements
- Communicate with any third-party host
```

### Data usage disclosures (checkboxes)

Marcar **APENAS** estas opções (todas as outras desmarcadas):

- ✅ **Website content** → marque ONLY se a CWS interpretar nossa leitura local de DOM como "uso de website content". A leitura é exclusivamente client-side e nada é transmitido. Se o formulário oferecer uma sub-opção de "stays on device", marcar.

> **Tudo o resto** (Personally identifiable info, Health info, Financial info, Authentication info, Personal communications, Location, Web history, User activity, etc.) → **DESMARCAR**.

### Limited Use certifications (checkboxes obrigatórias — marcar todas)

- ✅ I do not sell user data to third parties.
- ✅ I do not use or transfer user data for purposes unrelated to the extension's single purpose.
- ✅ I do not use or transfer user data to determine creditworthiness or for lending purposes.
- ✅ I do not allow humans to read user data unless: I have obtained user consent, it is necessary for security, it is required by law, or the data is aggregated and used for internal operations following anonymization.

### Privacy policy URL

```
https://midvash.app/chrome-extension/privacy/
```

> URL canônica e estável. Página pública servida por `apps/site/src/pages/chrome-extension/privacy.astro`. NÃO mudar o path sem coordenar com a CWS.

---

## 3. Visibility & distribution

- **Visibility**: Public
- **Distribution**: All regions
- **Mature content**: Not present
- **Pricing**: Free

---

## 4. Store assets (gerar separadamente — não posso fazer eu)

Coloque em `apps/chrome-extension/assets/store/` (não-versionado se quiser, ou versione se for útil).

| Asset | Dimensão | Formato | O que mostrar |
|---|---|---|---|
| Store icon | 128×128 | PNG, fundo transparente, **96×96 de arte centralizada** | Logo Midvash. Já temos versão correta em `public/icons/icon-128.png`. |
| Screenshot 1 | 1280×800 | PNG | Antes/depois: blog teológico em texto puro vs. mesmo blog com refs sublinhadas em cobre |
| Screenshot 2 | 1280×800 | PNG | Tooltip aberto em "John 3:16" — mostrando versículo |
| Screenshot 3 | 1280×800 | PNG | Tooltip de capítulo inteiro — "Romans 8" com 4 primeiros versículos numerados |
| Screenshot 4 | 1280×800 | PNG | Popup aberto sobre uma página, com toggles e seletor de versão |
| Screenshot 5 | 1280×800 | PNG | Mesmo blog em pt-br/en/es lado a lado, mostrando i18n |
| Small promo tile | 440×280 | PNG | Logo Midvash + tagline "Bible references on every page" |
| Marquee tile (opcional) | 1400×560 | PNG | Layout horizontal pra ser featured |

### Captions sugeridas (overlay nos screenshots)

1. *Bible references become links on any site*
2. *Hover to read the verse without leaving the page*
3. *Chapter previews show the opening verses*
4. *Per-site control and version selection*
5. *Works in 9 languages with locale-aware book names*

---

## 5. Tempos esperados

- **Primeira submissão**: 3–7 dias úteis (review manual rigoroso por causa do `<all_urls>`)
- **Updates posteriores** (sem mudar permissions): horas a 1 dia
- **Updates que mudam permissions ou metadata**: 1–3 dias

## 6. Se for rejeitado

A rejeição vem por e-mail com motivo. Casos prováveis e fallback:

| Motivo | Ação |
|---|---|
| `<all_urls>` não justificado | Adicionar mais detalhes na justificativa, citando exemplos de sites onde refs aparecem (Wikipedia, blogs cristãos, sermões em PDF). Se persistir, fallback é mudar pro modelo `activeTab` (usuário clica no ícone em cada site). |
| Privacy policy URL inacessível | Garantir que retorna 200 público sem login |
| Screenshots genéricos | Refazer mostrando feature real em uso |
| Detailed description "spammy" | Reescrever em tom mais factual |

## 7. Após aprovação

URL pública (publicada em jun/2026, v1.1.0):
- https://chromewebstore.google.com/detail/midvash-links-b%C3%ADblicos/pfgneahhammonobdfheebefijejhcaej
- Item ID: `pfgneahhammonobdfheebefijejhcaej`

Linkar a partir de:
- `midvash.com` rodapé
- `midvash.app`
- README do projeto
- Posts em redes sociais

Updates: bump `version` em `package.json`, rebuild, zip, upload, submit. Auto-update nos usuários em até ~24h após aprovação.
