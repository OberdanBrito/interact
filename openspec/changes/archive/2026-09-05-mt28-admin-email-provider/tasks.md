## 1. Módulo de dados

- [x] 1.1 Criar `src/data/email-provider.js` com `getEmailProvider()`, `updateEmailProvider(payload)`, `testEmailProvider(payload)` usando os helpers de `src/data/http.js`. Verificar com `npm run build` (exit 0) e `node --check`.

## 2. View da tela

- [x] 2.1 Criar `src/features/settings/email-provider-view.js` exportando `render(root)` — formulário (tipo smtp/api, host, porta, secure toggle, usuário, segredo write-only, remetente nome/e-mail). Verificar com `npm run build` (exit 0).
- [x] 2.2 Ao carregar, chamar `getEmailProvider()`; se `configured`, placeholder `•••• (configurado)` no segredo e exibir auditoria ("última atualização por {nome} em {data}"). Verificar que o campo de segredo nunca é preenchido com o valor real.
- [x] 2.3 Implementar botão "Testar conexão" chamando `testEmailProvider()` com os valores do form, exibindo toast de sucesso/falha; avisar claramente quando salvar sem um teste bem-sucedido. Verificar via build + QA visual.

## 3. Rota e navegação

- [x] 3.1 Em `src/app/router.js`, adicionar `parseRoute` para `#/settings/email-provider` e `AUTH_ROUTES` (`title: "Provedor de e-mail"`, `active: "settings"`), importando a view. Verificar `npm run build` (exit 0).
- [x] 3.2 Em `renderRoute()`, antes de renderizar, checar `state.user.role === "admin"` — se não for, `location.replace("#/posts")`. Verificar via QA visual (não-admin redirecionado).
- [x] 3.3 Em `src/ui/templates.js::shellHTML`, adicionar item de nav "Provedor de e-mail" condicional a `role === "admin"`. Verificar via QA visual (item visível para admin, oculto para não-admin).

## 4. Validação

- [x] 4.1 Rodar `npm run build` (frontend_admin) → exit 0 (sem erros de lint/import).
- [x] 4.2 QA visual (dev): login admin → item "Provedor de e-mail" no menu; abrir `#/settings/email-provider`; preencher, "Testar conexão" (feedback), salvar → toast; auditoria exibida; segredo nunca em texto puro. Login como não-admin (colaborador) → item oculto e rota redireciona.
- [x] 4.3 Validar `openspec validate --changes` → 1 passed.
