# Submission Checklist — Chrome Web Store

Use isso como checklist final antes de submeter.

## Pré-submissão

- [ ] Conta de Developer da Chrome Web Store criada (US$5 lifetime fee paga)
- [ ] **2-Step Verification** ativado na conta Google associada
- [ ] Privacy Policy publicada em URL pública (200 OK, sem auth) — ver `PRIVACY.md`
- [ ] `homepage_url` em `manifest.config.ts` apontando pra URL final (`midvash.app`)
- [ ] Versão em `package.json` bumped (sem letras, formato `X.Y.Z`)
- [ ] `pnpm typecheck` ✓
- [ ] `npm run build` ✓
- [ ] Testado local via Load unpacked numa página real com refs em PT, EN, ES

## Ativos visuais

- [ ] Store icon 128×128 (96×96 de arte com 16px de padding transparente cada lado) — temos em `public/icons/icon-128.png`
- [ ] Screenshot 1: antes/depois, 1280×800
- [ ] Screenshot 2: tooltip de versículo único, 1280×800
- [ ] Screenshot 3: tooltip de capítulo inteiro, 1280×800
- [ ] Screenshot 4: popup aberto, 1280×800
- [ ] Screenshot 5: multi-idioma, 1280×800
- [ ] Small promo tile 440×280
- [ ] (Opcional) Marquee 1400×560

## Conteúdo do dashboard

- [ ] Title: `Midvash — Bible Links`
- [ ] Short description: copiada do `_locales/en/messages.json`
- [ ] Detailed description: copiada de `SUBMISSION.md` §1, com `<PRIVACY_POLICY_URL>` substituído
- [ ] Category: `Productivity`
- [ ] Language: English
- [ ] Support URL preenchida
- [ ] Homepage URL preenchida

## Privacy practices tab

- [ ] Single purpose statement: cole do `SUBMISSION.md` §2
- [ ] Justificativa para `storage`: cole
- [ ] Justificativa para `alarms`: cole
- [ ] Justificativa para `host_permissions`: cole
- [ ] Justificativa para `<all_urls>` content script: cole o texto longo do §2
- [ ] Marcação de "Remote code use": **No** (não usamos código remoto)
- [ ] Data usage disclosures: tudo desmarcado, exceto possivelmente "Website content" se a CWS interpretar leitura local de DOM como tal
- [ ] Limited Use certifications: 4 checkboxes marcadas
- [ ] Privacy policy URL preenchida com URL pública 200 OK

## ZIP final

- [ ] `npm run zip` gerou `midvash-extension.zip`
- [ ] Tamanho razoável (< 1 MB esperado, sem sourcemaps)
- [ ] Upload no dashboard concluído
- [ ] Preview de versão verificado (Chrome Web Store mostra preview do ZIP antes de submeter)

## Submit

- [ ] **Submit for Review** clicado
- [ ] E-mail de confirmação recebido
- [ ] Aguardar 3–7 dias úteis (primeira submissão); horas–1d em updates posteriores

## Pós-aprovação

- [x] URL pública anotada: https://chromewebstore.google.com/detail/midvash-links-b%C3%ADblicos/pfgneahhammonobdfheebefijejhcaej (publicada em jun/2026, v1.1.0)
- [ ] Linkar em midvash.com / midvash.app / README / redes sociais
- [ ] Próximos updates: bump version → build → zip → upload → submit (sem refazer todo o checklist; só re-submit basta)
