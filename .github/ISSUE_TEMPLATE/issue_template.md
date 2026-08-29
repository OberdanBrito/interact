---
name: Issue Interact
about: Nova lacuna/feature do projeto Interact (funcional ou Infra)
title: "[I-16] "
labels: ""
assignees: ""
---

> **Requisito de implementação:** Respeitar estritamente a skill do fluxo da esteira de implementação.
> A conformidade é verificada pelo desenvolvedor dono do projeto.

<!-- Preencha abaixo. Os critérios de aceite são a spec delta (OpenSpec) da issue. -->

### Descrição
...

### Componentes
- [ ] backend
- [ ] frontend_admin
- [ ] frontend_pwa

### Pré-condições de integração entre componentes
<!-- Preencher se a issue tocar mais de uma componente. Evita spec delta contraditórios
     (lição I-02): ex. os campos obrigatórios na publicação precisam ser os MESMOS no
     backend e no admin. Especifique claramente cada pré-condição cruzada. -->
- [ ] ...

### Comportamento de campos opcionais/vazios
<!-- Como a UI deve exibir valores ausentes (ex.: autor de um rascunho sem autor).
     Convenção: vazio ou "—", NUNCA o literal "null"/"undefined" nem data epoch. -->
- [ ] ...

### Prioridade
Alta / Média / Baixa

### Esforço
S (≤ 1 dia) / M (2-3 dias) / L (1 semana+)

### Critérios de aceite
<!-- Definir obrigatoriedade POR AÇÃO, por componente (lição I-02). Ex.: "ao publicar,
     título, categoria, autor e corpo são obrigatórios; ao salvar rascunho, nenhum".
     Incluir cenário negativo explícito por componente. -->
- [ ] ...

### Definition of done (skill `esteira-implementacao`)
OpenSpec propose (sem código) → apply → testes (Mongo real + build) → QA visual
obrigatório (Playwright/Chrome DevTools) → commit/push por componente → archive →
registro de atividades na issue + Done no Projects v2 + fechar → docs na main → megamemory.