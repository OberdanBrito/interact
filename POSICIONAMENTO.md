# INTERACT — POSICIONAMENTO DE PRODUTO

> **O que este documento é:** o registro do raciocínio de posicionamento de
> mercado do Interact — por que o produto existe, contra quais categorias de
> ferramenta ele se diferencia, e qual espaço ele ocupa que hoje não é
> ocupado por ninguém. Serve como referência para decisões de escopo
> futuras: o que aceitar como feature, o que recusar por descaracterizar o
> produto.
>
> **O que este documento NÃO é:** uma decisão de arquitetura ou uma issue.
> Não define *como* implementar nada — define o que o Interact É e o que ele
> NÃO é, para orientar as decisões já registradas em `DECISOES_FUTURAS.md` e
> `ISSUES.md`.

---

## 1. O problema estrutural que origina o produto

O cenário atual nas organizações é que a informação entre empresa e
colaborador não é canalizada num único ponto de interação. Isso não é um
problema novo — memorandos em papel, listas de comunicação, reuniões,
e-mails, apps de chat e CMS já tentaram resolvê-lo, cada um à sua forma.

O que praticamente nenhum desses veículos resolve bem é a outra metade do
circuito: **o feedback**. Não a apuração de quantas pessoas a informação
alcançou, mas o quanto ela foi de fato compreendida e o quanto mobilizou
(direcionou/engajou) as pessoas. Sem essa apuração, a organização não tem
como calibrar a próxima comunicação — ela repete canal, tom e cadência por
hábito, não por evidência.

A tese central do produto: **um veículo só é de fato interativo quando
fecha o circuito falar → ouvir → interpretar → responder.** A maioria das
ferramentas do mercado resolve bem o "falar". Poucas resolvem o "ouvir" com
rigor, e praticamente nenhuma liga esse ouvir a um processo organizacional
específico.

---

## 2. Mapa competitivo — três categorias, três lacunas

### Categoria A — Infraestrutura de comunicação genérica
**Exemplos:** Slack, Microsoft Teams, WhatsApp.

- **Força:** comunicação bidirecional completa (o "poder do chat"),
  integrações com o mercado, familiaridade do usuário.
- **Lacuna:** são protocolos neutros. Um onboarding pode "acontecer" dentro
  de um canal do Slack, mas o Slack não sabe que aquilo é um onboarding —
  não tem noção de etapa, não sabe em que ponto do processo a pessoa está,
  não mede se ela entendeu o que precisava entender naquele momento. É
  bidirecional, mas cego ao contexto organizacional que gerou a conversa.

### Categoria B — Orquestração de processo / workflow
**Exemplos:** ferramentas de onboarding baseadas em workflow, BPM,
plataformas de gestão de processo (ex.: ServiceNow e afins).

- **Força:** excelentes em dividir papéis, responsáveis, prazos e
  dependências — "quem faz o quê, quando, e o que trava o quê".
- **Lacuna:** a percepção de quem está *dentro* do processo é tratada como
  subproduto — um checklist, uma notificação de tarefa pendente. Ninguém
  pergunta ali "essa etapa fez sentido pra você?" ou mede se o conteúdo de
  cada etapa foi compreendido. A gestão de papéis é madura; a gestão de
  percepção é praticamente inexistente.

### Categoria D — Plataformas de escuta/engajamento organizacional
**Exemplos:** Culture Amp, Officevibe, Glint, pesquisas de clima e eNPS.

- **Força:** medem impressão geral da empresa, satisfação com liderança,
  intenção de sair — em profundidade e com metodologia consolidada.
- **Lacuna (do ponto de vista do Interact):** a medição é **desconectada de
  qualquer comunicado ou fluxo específico**. São pesquisas periódicas
  genéricas, disparadas sem relação com nada que a pessoa efetivamente
  viveu no dia a dia de comunicação. Medem o vínculo com a empresa, não a
  qualidade do canal pelo qual a empresa se comunica.

### Categoria C — O espaço vazio (onde o Interact mira)
Comunicação **vinculada ao processo organizacional** e **medida por
percepção/impacto, etapa a etapa** — não é chat genérico (A) nem apenas
orquestração de tarefa (B). É a interseção dos dois: cada etapa de um
processo carrega sua própria comunicação, e essa comunicação é avaliada
pelas mesmas camadas do circuito falar/ouvir:

| Camada | Pergunta que responde |
|---|---|
| Alcance confirmado | A informação chegou e foi vista? |
| Reação | Qual foi a resposta emocional imediata? |
| Compreensão | A mensagem central foi entendida? |
| Mobilização/ação | A informação gerou a ação esperada? |
| Resposta/diálogo | Existe canal de volta para dúvida ou objeção? |

Nenhuma ferramenta das categorias A ou B responde a isso de forma
sistemática e amarrada ao processo. Esse é o espaço que o Interact ocupa.

---

## 3. Onde o Interact está hoje x onde mira

| Camada | Estado atual no Interact | Equivalente mais próximo no mercado |
|---|---|---|
| Fala (emissão) | Maduro — publicação, rascunho, agendamento, segmentação por grupo, validade, fixação, anexos | CMS / e-mail marketing |
| Alcance confirmado | Maduro — leitura por *dwell*/scroll ou confirmação explícita, tempo real (SSE), badge | Nenhuma das três categorias mede isso nativamente |
| Reação | Mínima — só "curtir" (binário) | Categoria A (reações de chat), mas sem vínculo a processo |
| Compreensão | Ausente | Nenhuma categoria resolve isso hoje |
| Mobilização/ação | Planejada, não construída (cobrança de leitura) | Categoria B (cobrança de tarefa), sem medir entendimento |
| Resposta/diálogo | Fora de escopo no marco atual (ver `DECISOES_FUTURAS.md`) | Categoria A |
| Comunicação atrelada a processo/etapa | Não existe como conceito de 1ª classe no modelo de dados | Categoria B (mas sem percepção) |

---

## 4. O que o Interact NÃO é (anti-posicionamento)

- **Não é** um substituto de chat corporativo (Slack/Teams/WhatsApp) — não
  compete em mensageria livre, DM, threads de conversa.
- **Não é** uma ferramenta de gestão de processo genérica (BPM) — não
  gerencia aprovações, SLAs entre times, ou fluxos de trabalho que não
  envolvam comunicação com o colaborador.
- **Não é** uma plataforma de escuta/engajamento organizacional (Categoria
  D) — não mede satisfação geral com a empresa, clima organizacional, nem
  intenção de saída. Qualquer instrumento de pulso/escuta do Interact
  precisa estar ancorado a um comunicado, framework ou ao canal de
  comunicação em si — nunca a "você é feliz aqui" ou "você pensa em sair".
  Se essa medição um dia correlacionar com retenção, é efeito colateral
  observável, não o propósito declarado da funcionalidade.
- **É** o elo que falta entre as categorias: comunicação **de** processo
  organizacional, com **medição de percepção e impacto sobre o próprio ato
  de comunicar** — não apenas registro de que a etapa foi concluída, e não
  um diagnóstico do vínculo geral entre colaborador e empresa.

Se uma feature proposta puxa o produto na direção de "virar um chat" (DM,
threads, conversa livre), de "virar um BPM" (gestão de tarefas entre times
sem componente de comunicação/percepção), ou de "virar uma pesquisa de
clima/retenção" (medir vínculo com a empresa em vez de qualidade do canal),
ela deve ser sinalizada como desvio de posicionamento antes de entrar em
`ISSUES.md`.

---

## 5. Sequenciamento (relação com o roadmap)

- **Marco 1 (atual):** comunicação unidirecional sólida — fala + alcance
  confirmado + reação mínima + métrica agregada (dashboard). Este marco
  precisa estar maduro e validado antes de abrir o canal de volta.
- **Marco 2 (próximo, declarado):** comunicação bidirecional plena,
  construída sobre a infraestrutura já validada no Marco 1 (segmentação,
  tempo real, métricas agregadas viram reaproveitáveis quando a resposta do
  colaborador precisar ser processada e medida também).
- Este posicionamento **não exige antecipar o Marco 2** — mas orienta que,
  quando ele vier, o alvo não é "virar um Slack": é aprofundar compreensão e
  resposta **dentro do contexto de um processo organizacional**, mantendo a
  diferenciação da Categoria C.

---

## 6. Perguntas em aberto (antes de virar decisão de arquitetura)

- [ ] **"Processo" vira conceito de 1ª classe no modelo de dados** (ex.:
      "Onboarding — Dia 1", "Onboarding — Dia 7"), ou continua emergindo de
      categorização/tags de comunicados soltos?
- [ ] **Quais processos são o alvo inicial?** Onboarding foi o exemplo
      usado na discussão, mas há outros candidatos naturais: desligamento,
      mudança de política, campanha de segurança/compliance.
- [ ] **Relação com a decisão em maturação #1** (`DECISOES_FUTURAS.md` —
      ranking por relevância/tags): tags de processo e tags de interesse
      pessoal são a mesma dimensão de dado, ou duas coisas diferentes que
      convivem no mesmo comunicado?
- [ ] **Métrica de sucesso do posicionamento**: como validar, com dado real
      (não suposição), que clientes escolhem o Interact por causa da
      Categoria C, e não porque substitui um Slack mal utilizado?
