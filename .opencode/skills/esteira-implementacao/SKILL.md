---
name: esteira-implementacao
description: Fluxo OBRIGATÓRIO de implementação de features do projeto Interact (e modelo de referência para qualquer feature). Use SEMPRE que houver requisição de implementar/planejar/fechar feature ou mudança no código — termos de gatilho: esteira, fluxo de implementação, implementação de feature, pipeline de features, workflow de feature, opsx, proposta/change OpenSpec, validação visual, encerrar/concluir issue. Não é opcional: todas as fases e portões abaixo devem ser executados integralmente, em ordem, com evidência.
---

# Esteira de Implementação de Features

Skill canônico do fluxo de implementação. **Não-negociável, sem exceção, sem pular etapa.**
A responsabilidade final pela verificação é do desenvolvedor dono do projeto; a esteira existe
para dar rastreabilidade e consistência — desvios devem ser reportados, nunca silenciados.

## Quando se aplica

- Toda implementação, planejamento ou encerramento de feature do Interact (issues I-01…I-15 e
  issues do projeto Infra #10).
- Modelo de referência para qualquer outra mudança de código acordada pelo usuário.

## Contexto do projeto

- Repo `OberdanBrito/interact`: `main` = documentação/estado; código em branches vivas por
  componente (`backend`, `frontend_admin`, `frontend_pwa`) extraídas como worktrees em
  `/home/oberdan/WebstormProjects/interact/<componente>/`.
- GitHub Projects v2 é a fonte de verdade de status: #8 (funcional), #10 (Infra).
- OpenSpec (CLI `openspec`) configurado nas 3 componentes (`openspec/` + comandos `opsx-*`).
- Validação visual obrigatória via MCP `playwright` (PWA :5173) e `chrome-devtools` (admin :5174),
  screenshots em `/tmp/opencode/`.

## Fases da esteira (ordem obrigatória)

### Fase 1 — Contexto
Antes de qualquer código: consultar o knowledge graph (megamemory) e o estado da issue no
GitHub (Projects v2). Não implementar "no escuro".

### Fase 2 — Planejamento (OpenSpec propose) — SEM CÓDIGO
Por componente afetada: `opsx-propose` na worktree respectiva. Gera
`proposal.md`, `specs/<capability>/spec.md` (delta = critérios de aceite da issue),
`design.md`, `tasks.md`. **Proibido codar antes disso.** Ambiguidade material de escopo →
perguntar ao usuário antes de criar o change. Mantém-se 1 change por componente por issue.
Aplicável também a issues de Infra (deploy/CI/perf/dependências/segurança).

**Consistência entre changes (lição I-02):** quando a issue toca mais de uma componente, os
spec delta devem ser **confrontados entre si ANTES do apply** — pré-condições cruzadas precisam
ser idênticas nos dois lados (ex.: os campos obrigatórios na publicação devem ser os mesmos no
backend e no admin). Se um critério do admin contradiz o spec do backend, resolver com o dono
na fase de planejamento, não no QA.

### Fase 3 — Implementação (OpenSpec apply)
`opsx-apply` implementa task a task a partir de `tasks.md`. Mudanças somente nas worktrees das
componentes afetadas. Não ampliar escopo além do spec/proposal (reportar se precisar).

### Fase 4 — Testes (portão OBRIGATÓRIO)
- Integração no **MongoDB real** (docker), exercitando o comportamento da feature.
- Build/check: `npm run build` e `node --check` nos arquivos alterados.

### Fase 5 — Validação visual (portão OBRIGATÓRIO)
Cobrir o fluxo real do usuário nos dois lados (admin e colaborador) com os navegadores MCP;
salvar screenshots/evidências em `/tmp/opencode/`. Só seguir se o comportamento confere com o
especificado.

**Confrontar com TODOS os spec delta da issue, não só da componente sob teste (lição I-02).**
Ex.: publicar um rascunho no admin deve ser validado contra o que o spec do backend determina.
Campos nulos/opcionais precisam ser renderizados de forma legível ao usuário (vazio ou "—",
NUNCA o literal "null" nem datas epoch como 1969-12-31). Divergência spec↔comportamento → parar
e decidir com o dono; a decisão vira **Decisão** registrada no registro da issue e reflete no
spec da componente afetada.

### Fase 6 — Commit/push (portão OBRIGATÓRIO)
Commit por componente por issue: português, estilo PLAIN, mensagem com id da issue
(ex.: `Implementa agendamento de publicação (I-01)`). `git push` para `origin/<componente>`,
incluindo o `openspec/`.

### Fase 7 — Archive OpenSpec
`opsx-archive` move a change aprovada para `openspec/specs/<capability>/`.

**Antes do commit de archive (lição I-02):** converter o spec delta em spec principal usando a
skill `openspec-sync-specs` (delta usa `## ADDED Requirements`; spec principal exige
`## Purpose` + `## Requirements` — o formato delta não valida em `openspec validate --specs
--strict`). Rodar `openspec validate --specs --strict` e conferir `openspec list` (nenhuma
change ativa restante) como portão, antes do commit.

### Fase 8 — Encerramento da issue (no GitHub)
1. **Registrar atividades na issue**: comentário estruturado com resumo, atividades (com datas),
   evidências, decisões e critérios de aceite.
2. Mover a issue para **Done** no Projects v2 e **fechar** a issue.
3. Atualizar `ISSUES.md` e `AGENTS.md` na `main` (status, resumo, critérios reescritos se a
   implementação divergiu, conhecimento novo) e `git push origin main`.

**Bloco de decisões (lição I-02):** toda decisão tomada durante a execução que diverja do
planejado (spec/proposal) — ou que resolva ambiguidade — deve constar como **Decisão** no
registro de atividades E ser refletida no spec da componente afetada antes do archive. Exemplos
reais da I-02: gate de publicação ampliado (backend passou a exigir autor+corpo ao publicar
rascunho) e convenção de não expor "null" na UI.

### Fase 9 — Memória
Gravar conceitos/camadas/lacunas no megamemory (record) ao concluir.

## Regras de ouro (não-negociáveis)

1. **Nada de código antes do propose** (Fase 2).
2. **Validação visual é obrigatória** — nunca pular (Fase 5).
3. **Registro de atividades na issue antes de Done/fechar** (Fase 8.1).
4. **1 change por componente por issue; commit por issue; mensagens PLAIN em pt-BR com id.**
5. **Evidência sempre**: screenshots em `/tmp/opencode/`, hashes de commit no registro da issue.
6. **Ao criar qualquer issue nova**: incluir no corpo o requisito `Respeitar estritamente a
   skill do fluxo da esteira de implementação` (usar o template
   `.github/ISSUE_TEMPLATE/issue_template.md` da `main`; nunca criar issue sem o bloco).
7. Se um portão não foi cumprido: **parar e reportar ao dono**, não "fechar" mesmo assim.
8. Divergência entre o implementado e o planejado → registrar como **Decisão** na issue e
   reescrever o critério no ISSUES.md.
9. **Nunca expor o literal "null"/"undefined" (ou datas epoch) na UI** — valores ausentes
   renderizam como vazio ou "—", para qualquer usuário (admin ou colaborador).
10. **Confrontar os spec delta entre componentes** antes do apply e no QA (pré-condições
    cruzadas idênticas); spec principal exige `## Purpose` + `## Requirements` e deve ser
    validada com `openspec validate --specs --strict` antes do commit de archive.
11. **Testes de integração versionados**: o portão de testes (Fase 4) usa scripts versionados no
    repo (ex.: `backend/scripts/qa-*.mjs` + `npm run test:integration`); arquivos temporários em
    /tmp não contam como evidência para o checklist. Divergência menor entre tasks/design e a
    implementação também é registrada como **Decisão** na issue (não só as grandes).
12. **QA: aguardar re-render assíncrono e verificar estado real**: após ações que disparam
    `renderFeed()`/re-render assíncrono, aguardar antes de ler o DOM; estado de leitura (lido/não
    lido) é verificado via DOM (`unread-dot`) e localStorage (`userData.read`), não só pelo
    snapshot de a11y; fechar sheets/modais antes de interagir com filtros (backdrop intercepta
    cliques).
13. **Gotchas de CLI (I-12)**: `openspec validate` usa `--changes` (não `--change`); `openspec
    archive <nome>` é posicional e, quando o spec já foi sincronizado manualmente via
    `openspec-sync-specs`, usar `-y --skip-specs` (sem isso o archive aborta com "already
    exists"). No `gh api graphql`, option ids de Projects v2 vão com `-f` (string bruta); `-F`
    converte números e quebra o coerce de `String!`. Playwright: a sheet é `<div>`, não
    `<dialog>` (usar `#sheet .js-*`); sessão pode já estar ativa no QA (login form oculto).
14. **Testes sequenciais com estado (I-04)**: cenários de QA que mutam estado compartilhado
    (ex.: fixar/desfixar pin) não assumem "estado limpo" entre cenários — criar o conjunto
    completo de dados/controles ANTES das asserções (ex.: um post não-fixado de controle) ou
    resetar o estado explicitamente. Falha no 1º run do teste NÃO é necessariamente bug de
    código: registrar a causa (autoria do teste vs implementação). Playwright: screenshot com
    caminho absoluto fora das raízes permitidas falha — salvar relativo (`.playwright-mcp/`) e
    copiar para `/tmp/opencode`. Restart do backend: `setsid nohup … & disown` roda ISOLADO
    (encadear com `&&`+curl no mesmo bash pode travar o shell até timeout); verificar saúde em
    chamada separada. Após mutation GraphQL com warnings de "variável não usada", confirmar o
    resultado com query de verificação.
15. **Gotchas de ferramentas, ambiente e MCP (I-05)**:
    - **Testes**: `node_modules` de worktree pode vir incompleto → rodar `npm install` antes do
      portão Fase 4 (`qa-*.mjs` falha com `ERR_MODULE_NOT_FOUND` de dep já listada no
      package.json).
    - **Tool global sem sudo**: `npm config set prefix ~/.npm-global` + `export
      PATH="$HOME/.npm-global/bin:$PATH"` no `~/.bashrc`; conferir exec bit no binário
      (`chmod +x` — npm pode não setar); em config de MCP usar **caminho absoluto** do binário
      (o instalador grava só o nome e o PATH do opencode ≠ PATH do shell).
    - **MCP recém-instalado não carrega na sessão corrente** (só após restart do opencode):
      contorno = cliente MCP mínimo via stdio (spawn do binário + JSON-RPC por linha:
      `initialize` → `tools/list` → `tools/call`), tolerando linhas de log no stdout do servidor
      (parse linha a linha, ignorando não-JSON). Útil para gravar conceitos no megamemory sem
      esperar restart.
    - **`gh issue view --comments` quebra** (GraphQL de projectCards em deprecação) → ler
      comentários via REST: `gh api repos/{owner}/{repo}/issues/{n}/comments`.
    - **Projects v2**: token default do `gh` pode não ter `read:project` (erro
      `INSUFFICIENT_SCOPES`) → usar `GH_TOKEN` do `.env` (`GITHUB_API_TOKEN` tem scope
      `project`); REST `/projects/{id}/items` → 404 (só GraphQL funciona). **Antes de mutation
      de status, consultar o estado atual** — a issue pode já estar em Done (movimento manual
      do dono).
    - **Playwright MCP**: não existe `fill` isolado → usar `fill_form`; `navigate
      {type:"reload"}` é inválido → navegar com a URL explícita; screenshots salvam na raiz da
      sessão (`.playwright-mcp/` da main, **não** no worktree da componente) → `cp` para
      `/tmp/opencode`.
    - **Modelo sem suporte a imagem**: validação visual por **snapshot de a11y (DOM)** é
      conclusiva; salvar PNG como artefato mesmo assim.
    - **LSP não cobre worktrees fora da cwd** ("LSP file path must be inside request cwd") →
      gates JS da Fase 4 = `node --check` + `npm run build` + testes versionados.
    - **Hook de comentários/docstrings vs convenção do repo**: manter comentário que documenta
      regra de negócio não óbvia (ex.: `expiresAt` aceita passado = expiração imediata; limpar
      mantém o estado) ou segue a convenção de bloco por issue do arquivo; remover o redundante
      (código auto-explicativo).
    - **`ISSUES.md` pode estar defasado**: antes de atualizar o resumo/tabela, conferir a
      contagem REAL de status por prioridade (lendo cada seção `### I-XX`), não confiar na
      tabela — a Baixa dizia 5/1 quando a realidade era 4/2 (I-11/I-12 concluídas sem registro).
    - **Arquivo trackeado mas gitignorado**: `.opencode/` está no `.gitignore` do
      `frontend_admin` mesmo com a skill trackeada — `git add` rejeita o caminho; usar
      `git add -f <caminho>` (trackeado vence o ignore) e confirmar com `git status`.
    - **Gravação no megamemory deve ser idempotente**: reexecutar um script de `record`
      recria conceitos em duplicata no top-level (os módulos falham com "already exists", mas
      os filhos são recriados sem parent) — conferir existência antes de criar ou verificar o
      grafo após a gravação (`list_roots`) e remover duplicatas com `remove_concept`.

## Checklist de verificação do dono (conferir periodicamente)

Cada issue encerrada deve ter:
- [ ] Comentário de atividades na issue (resumo, atividades+datas, evidências, decisões, critérios [x]).
- [ ] Status Done no Projects v2 e issue fechada.
- [ ] Commits com hash nas branches vivas (e `origin/` atualizado).
- [ ] `ISSUES.md` coerente (status/resumo) e `AGENTS.md` refletindo o conhecimento novo.
- [ ] Specs aprovadas em `openspec/specs/` (archive feito) nas componentes afetadas, validadas com `openspec validate --specs --strict`.
- [ ] Screenshots/evidências de QA visual (ex.: `/tmp/opencode/`).
- [ ] Nenhum "null"/"undefined"/data epoch exposto na UI (regra 9).
- [ ] Decisões da execução registradas como **Decisão** na issue (se houve divergência do planejado).

Causas de reprovação: faltou qualquer evidência acima, issue fechada sem registro de atividades,
QA visual inexistente, código fora do planejamento sem decisão registrada, ou UI expondo termos
técnicos de valor nulo.

## Anti-padrões (proibidos)

- Codar antes do propose; pular QA visual; fechar issue sem registro de atividades.
- Ampliar escopo silenciosamente (sem spec/proposal e sem decisão do dono).
- Commit fora da branch viva da componente ou mensagem sem id da issue.
- "Fechou como concluído" sem evidência (sneak-through).
- Expor o literal "null"/"undefined" (ou datas epoch) em qualquer tela do produto.
- Espec delta de componentes diferentes da mesma issue com pré-condições contraditórias,
  sem resolver antes do apply.

## Instrução final

Seja qual for o agente/modelo executando: cumpra as 9 fases em ordem, sem exceção, com evidência.
Se não der para cumprir algum portão, pare e reporte ao dono. Não silencie desvios.