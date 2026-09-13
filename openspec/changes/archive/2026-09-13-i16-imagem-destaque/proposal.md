## Why

Comunicados no feed do colaborador exibem capa quando disponível, mas o recurso de imagem de destaque ainda carece de definição clara sobre quais imagens podem ser usadas, como são carregadas e como o fallback se comporta quando não há capa. Esta issue busca completar e formalizar o comportamento do campo `coverImage` que já existe no modelo, mas cuja experiência do usuário e regras de negócio ainda estão parcialmente implementadas.

## What Changes

- Formalizar regras de validção e exibição do `coverImage` nos comunicados
- Melhorar a experiência do administrador ao adicionar/editar capa no formulário
- Garantir fallback consistente quando não houver capa (ícone padrão ou mensagem)
- Capabilities: nenhum requisito de espec behavior muda (cobertura existente); este change foca em conclusão e polimento de UX. Por definição do fluxo spec-driven, este change declarará `skip_specs: true` em `.openspec.yaml` visto que não há requisito de spec-level behavior change — apenas conclusão de UX e conclusão de features já parcialmente implementadas.

## Capabilities

### New Capabilities

*(nenhuma — não há requisito de spec-level behavior change)*

### Modified Capabilities

*(nenhuma — não há requisito de spec-level behavior change)*

## Impact

- **Código**: sem alteração no contrato de API ou schema de banco; ajustes menores de UX no frontend admin e no fallback de card do PWA.
- **API**: nenhuma mudança (o campo `coverImage` já existe no payload `toPost` e as rotas de upload já estão implementadas).
- **Dependências**: nenhuma nova (nodemailer/crypto já existentes).
- **Specs**: `skip_specs: true` (behavior não muda em nível de spec; change foca em conclusão/UX).
- **Testes**: build (`npm run build`) + QA visual (Playwright) com card com capa, sem capa, capa inválida e upload de nova capa.