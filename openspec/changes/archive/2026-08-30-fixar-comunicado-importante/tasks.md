## 1. Model e payload

- [x] 1.1 Adicionar campo `pinned: { type: Boolean, default: false }` em `src/models/Comunicado.js`
- [x] 1.2 Expor `pinned: doc.pinned === true` no `toPost` de `src/routes/posts.js`

## 2. Ordenação no GET

- [x] 2.1 Alterar `Comunicado.find(filter).sort({ dateISO: -1 })` para `.sort({ pinned: -1, dateISO: -1 })` no `GET /api/posts`

## 3. PUT valida pin somente em publicado

- [x] 3.1 Incluir `pinned` no destructuring do body do `PUT /api/posts/:id`
- [x] 3.2 Antes do update parcial, se `pinned !== undefined` e `doc.published !== true`, retornar 400 "Apenas comunicados publicados podem ser fixados"
- [x] 3.3 Aplicar `doc.pinned = pinned === true` no update parcial (só quando `pinned` vier no body)

## 4. Teste de integração versionado (portão Fase 4)

- [x] 4.1 Criar `scripts/qa-i04.mjs` cobrindo: payload expõe `pinned` (default false); pin em publicado OK; pin em rascunho/agendado → 400; GET ordena pinned primeiro; múltiplos pinned por recência
- [x] 4.2 Adicionar script `qa:i04` no `package.json` e registrar `test:integration` que roda os QA versionados
- [x] 4.3 Rodar `npm run qa:i04` contra o MongoDB real (docker) com 100% de passagem
- [x] 4.4 Rodar `node --check` nos arquivos alterados

## 5. QA visual (portão Fase 5 — a executar no apply)

- [x] 5.1 Validar no Playwright :5173 que comunicado fixado aparece primeiro no feed do colaborador (vence urgente) com selo "Fixado"