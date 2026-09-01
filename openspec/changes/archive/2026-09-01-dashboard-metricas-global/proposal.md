## Why

O endpoint `GET /api/interactions/summary` já agrega as métricas de leitura/curtida de todos os
comunicados em uma única chamada (`{ [postId]: { reads, likes } }`), mas hoje agrega tudo sem
nenhum filtro. O partner "Dashboard global de métricas" precisa filtrar por período e por grupo
para o admin analisar o engajamento por recorte — sem re-implementar o endpoint, apenas
adicionando filtros opcionais retrocompatíveis.

## What Changes

- Adicionar filtros opcionais ao `GET /api/interactions/summary`:
  - `desde` / `ate` (ISO) — recorte por data da interação (`readAt`/`likedAt`).
  - `groupId` — restringe a interações de colaboradores pertencentes ao grupo.
- Manter o formato de resposta `{ [postId]: { reads, likes } }` como base (retrocompatível:
  sem filtros, o comportamento atual é preservado).
- Comunicados sem interações no recorte continuam representados como `reads: 0`/`likes: 0`
  quando o contrato de agregação os incluir (a tela do admin complementa com 0).
- Não é **BREAKING**: parâmetros são opcionais e o formato de resposta não é alterado.

## Capabilities

### New Capabilities

_(nenhuma capacidade nova no backend)_

### Modified Capabilities

- `interactions` (existe em `openspec/specs/interactions/spec.md`): o requisito do endpoint
  `summary` passa a aceitar filtros de período (`desde`/`ate`) e de grupo (`groupId`),
  mantendo o contrato de resposta existente.

## Impact

- `backend/src/routes/interactions.js` — rota `GET /api/interactions/summary`: aplicar filtros
  opcionais no query antes de agregar.
- Modelo `Interaction` (campos `readAt`/`likedAt`/`userId`) — usado na filtragem, sem mudança de
  schema.
- Consumidores existentes do `summary` (admin `frontend_admin`) continuam válidos, pois o formato
  de resposta e a ausência de filtros preservam o comportamento atual.
