## Context

O recurso de imagem de destaque (coverImage) nos comunicados já possui infraestrutura parcial implementada:

- **Backend**: Modelo `Comunicado` com campo `coverImage`, rota `POST /api/posts/:id/cover-image` (I-03) que recebe upload via multer e serve a imagem em `/api/posts/:id/cover-image`
- **Frontend PWA**: Componente `postCardHTML` em `feed/templates.js` já renderiza a capa quando disponível (linha 64-69), com fallback `style.display='none'` quando `onerror` dispara
- **Frontend Admin**: Formulário de comunicado em `form-view.js` já tem referência a `coverImage` (linha 347), mas a integração com o upload do backend pode ser melhorada

**Estado atual**: O usuário pode subir uma capa, mas a experiência não está polida — pode haver imagens quebradas, fallback inconsistente, e o admin pode não ter feedback claro sobre o status da capa.

## Goals / Non-Goals

**Goals:**
- Garantir fallback visual consistente quando não houver capa (ícone placeholder ou mensagem "sem capa")
- Melhorar o upload e preview de capa no formulário admin
- Validar tipos e tamanhos de imagem no upload
- Manter compatibilidade com o comportamento existente (coverImage já existe no payload e cards)

**Non-Goals:**
- Mudança de schema de banco de dados (coverImage já existe)
- Novas dependências externas
- Reescrita completa do sistema de upload (já existe em I-03)

## Decisions

1. **Fallback de imagem**: Quando `coverImage` estiver vazio ou inválido, exibir um estado placeholder com o ícone de "sem capa" e a mensagem "Sem capa". Isso evita imagens quebradas e melhora a consistência visual.

2. **Validação no upload**: Manter os limites existentes do backend (`MAX_COVER_MB` de `upload.js`) e tipos permitidos (definidos em `EXT_BY_MIME`). Não adicionar novas restrições para não quebrar o fluxo já existente.

3. **Experiência do upload no admin**: O formulário já tem o campo `coverImage`, mas não tem preview visual nem feedback de sucesso/erro. O design foca em adicionar preview e mensagens de status sem mudar a lógica de upload do backend.

4. **Migração de dados existentes**: Comunicados já existentes sem `coverImage` continuarão exibindo o estado placeholder. Não há dado antigo para migrar.

## Risks / Trade-offs

- **[Risk]**: Upload de imagem muito grande pode bloquear o formulário. **Mitigation**: Os limites já estão no backend (`MAX_COVER_MB`); o frontend pode adicionar preview desabilitado se o arquivo for grande, mas não bloqueia o envio.
- **[Risk]**: Imagens com dimensões inadequadas podem ficar distorcidas nos cards. **Mitigation**: O backend serve a imagem original; o frontend já tem `onerror` para esconder a imagem quebrada. Não há resize no frontend atualmente.
- **[Trade-off]**: Addicionar validação no frontend aumenta complexidade, mas melhora a UX. Decisão: mantemos o validation no backend como fonte de verdade e opcionalmente adicionamos preview no frontend sem validação rigorosa.

## Open Questions

- O preview de capa no formulário admin deve ser obrigatório antes do submit, ou o usuário pode enviar sem preview?
- Deve haver um limite de dimensões da imagem (largura/altura) ou apenas o limite de tamanho (MB) já existente?

**Referências**: proposal.md — Why; specs (skip_specs: true); feed/templates.js — renderização de card; backend upload.js — limites de upload.