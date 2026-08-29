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

### Fase 6 — Commit/push (portão OBRIGATÓRIO)
Commit por componente por issue: português, estilo PLAIN, mensagem com id da issue
(ex.: `Implementa agendamento de publicação (I-01)`). `git push` para `origin/<componente>`,
incluindo o `openspec/`.

### Fase 7 — Archive OpenSpec
`opsx-archive` move a change aprovada para `openspec/specs/<capability>/`.

### Fase 8 — Encerramento da issue (no GitHub)
1. **Registrar atividades na issue**: comentário estruturado com resumo, atividades (com datas),
   evidências, decisões e critérios de aceite.
2. Mover a issue para **Done** no Projects v2 e **fechar** a issue.
3. Atualizar `ISSUES.md` e `AGENTS.md` na `main` (status, resumo, critérios reescritos se a
   implementação divergiu, conhecimento novo) e `git push origin main`.

### Fase 9 — Memória
Gravar conceitos/camadas/lacunas no megamemory (record) ao concluir.

## Regras de ouro (não-negociáveis)

1. **Nada de código antes do propose** (Fase 2).
2. **Validação visual é obrigatória** — nunca pular (Fase 5).
3. **Registro de atividades na issue antes de Done/fechar** (Fase 8.1).
4. **1 change por componente por issue; commit por issue; mensagens PLAIN em pt-BR com id.**
5. **Evidência sempre**: screenshots em `/tmp/opencode/`, hashes de commit no registro da issue.
6. Se um portão não foi cumprido: **parar e reportar ao dono**, não "fechar" mesmo assim.
7. Divergência entre o implementado e o planejado → registrar como **Decisão** na issue e
   reescrever o critério no ISSUES.md.

## Checklist de verificação do dono (conferir periodicamente)

Cada issue encerrada deve ter:
- [ ] Comentário de atividades na issue (resumo, atividades+datas, evidências, decisões, critérios [x]).
- [ ] Status Done no Projects v2 e issue fechada.
- [ ] Commits com hash nas branches vivas (e `origin/` atualizado).
- [ ] `ISSUES.md` coerente (status/resumo) e `AGENTS.md` refletindo o conhecimento novo.
- [ ] Specs aprovadas em `openspec/specs/` (archive feito) nas componentes afetadas.
- [ ] Screenshots/evidências de QA visual (ex.: `/tmp/opencode/`).

Causas de reprovação: faltou qualquer evidência acima, issue fechada sem registro de atividades,
QA visual inexistente, ou código fora do planejamento sem decisão registrada.

## Anti-padrões (proibidos)

- Codar antes do propose; pular QA visual; fechar issue sem registro de atividades.
- Ampliar escopo silenciosamente (sem spec/proposal e sem decisão do dono).
- Commit fora da branch viva da componente ou mensagem sem id da issue.
- "Fechou como concluído" sem evidência (sneak-through).

## Instrução final

Seja qual for o agente/modelo executando: cumpra as 9 fases em ordem, sem exceção, com evidência.
Se não der para cumprir algum portão, pare e reporte ao dono. Não silencie desvios.