# INTERACT — DECISÕES FUTURAS

> **O que este documento é:** um lugar para ideias em maturação — depois da
> conversa, antes de virar issue. Registra o raciocínio, as decisões já
> fechadas e as que ainda estão em aberto.
>
> **O que este documento NÃO é:** um backlog. Nada aqui é compromisso de
> implementação. Uma entrada aqui pode nunca virar issue.

## Regra de promoção (quando uma entrada vira issue de verdade)

Uma ideia sai deste documento e entra no board do GitHub (projeto
"Comunicação unidirecional", #8) **somente quando**:

1. Todas as decisões em aberto da entrada estiverem fechadas (sem "avaliar
   na implementação" pendente em ponto estrutural).
2. For possível escrever critérios de aceite verificáveis, no mesmo padrão
   já usado nas issues existentes (ver `ISSUES.md`).
3. Prioridade e esforço puderem ser estimados com informação real, não
   suposição.

Até lá, a ideia fica aqui — visível, mas não contando como esforço no board,
para não repetir o problema de "cada correção vira uma issue nova e o
esforço real vira invisível" identificado na governança do design system.

---

## #1 — Ranking por relevância (tags) em vez de ordem cronológica pura

**Status:** Em maturação. Não é issue.

### A ideia

Hoje a ordenação do feed (`sortFeed()` no PWA) é: fixado → urgente →
não-lido → data. É uniforme para todo mundo. A proposta é adicionar uma
dimensão de **relevância por interesse do colaborador**, usando tags livres
no comunicado (em vez de só a categoria fixa atual — Geral/RH/TI/Benefícios)
como peso no ranking, no mesmo espírito de personalização que sites como o
UOL usam para adaptar a página ao leitor.

### Por que isso não é só "mais uma feature de ordenação"

A personalização algorítmica de feed tem um risco documentado na literatura
de sistemas de recomendação: tende a criar "bolhas de conteúdo", onde a
pessoa só vê o que já demonstrou gostar. Isso é aceitável (até desejável) num
portal de notícias. **É um risco real numa ferramenta de comunicação
corporativa**, porque parte do conteúdo não é opcional — um comunicado de
RH sobre prazo de plano de saúde não pode "sumir" do feed de alguém só
porque o histórico dela mostra baixo engajamento com a categoria RH.

### Decisão já fechada

- **Modelo de duas camadas**, reaproveitando uma distinção que já existe no
  código: o `sortFeed()` atual já trata `pinned`/`urgent` como
  incondicionais (sempre no topo, sem exceção). A proposta estende esse
  mesmo princípio:
  - **Camada 1 — obrigatório.** Fixado, urgente, e uma futura flag
    `mandatory` para o admin marcar o que não pode ser deprioritizado por
    interesse. Nunca sujeito a ranking por relevância.
  - **Camada 2 — discricionário.** O restante do feed, ranqueado por peso
    de tag-interesse. Aqui sim vale a lógica de personalização.

### Decisões em aberto (o que falta fechar antes de virar issue)

- [ ] **Sinal de interesse: explícito, implícito, ou os dois?** Explícito
      (colaborador escolhe tags de interesse no perfil) é mais simples,
      mais transparente e sem problema de "cold start" para colaborador
      novo. Implícito (inferido de clique/leitura) é mais preciso a longo
      prazo, mas levanta questão de transparência sobre coleta de dados de
      comportamento — pesquisa recente mostra resistência de usuários a
      personalização baseada em dados que não perceberam estar sendo
      coletados. **Recomendação inicial (não decisão): começar só com
      explícito.**
  - [ ] **Quem define as tags de um comunicado — o admin livre ou uma lista
      controlada?** Tags 100% livres (folksonomia pura) tendem a fragmentar
      com o tempo (`#rh`, `#recursos-humanos`, `#rh-beneficios` como três
      tags diferentes para a mesma coisa). Precisa de alguma curadoria
      mínima (autocomplete de tags existentes, por exemplo).
  - [ ] **Categoria atual (Geral/RH/TI/Benefícios) é substituída por tags,
      ou convive com elas?** Convivência parece mais segura para não quebrar
      o que já existe (filtro por categoria já implementado no PWA).
  - [ ] **Como o admin marca algo como `mandatory`?** Precisa de regra de
      quem pode marcar (todo admin, ou só alguns perfis?) para não virar
      escape hatch que todo mundo usa "por garantia" e esvazia o conceito.
  - [ ] **Métrica de sucesso.** Como saber se isso reduziu fadiga de fato
      (objetivo original) e não só reorganizou a mesma fadiga de forma
      menos visível?

### Relação com outras issues/decisões

- Reaproveita a arquitetura de ordenação que a **I-10 (Paginação)** mexeu —
  a I-10 já concluiu e moveu a ordenação por fixado/urgente/não-lido para o
  backend (ver `ISSUES.md`). **A trava de sequenciamento foi removida** —
  esta ideia pode ser desenhada em cima do que a I-10 entregou. Ainda faltam
  as decisões em aberto acima antes de virar issue.

---

## #2 — Cadastro autosserviço de tenants (onboarding do cliente)

**Status:** Em maturação. Não é issue.

### O que já existe (fundação) e o que falta (governança)

O board Multi-Tenant (#12) entregou o **isolamento** — modelo `Tenant`,
`tenantId` em todos os dados, auth escopada. Não entregou **nenhuma forma de
um tenant passar a existir** fora de rodar `npm run seed` manualmente no
servidor. Não há tela, não há rota `POST /api/tenants`, não há conceito de
"quem é dono da plataforma" (ver issue de segurança **#30**, aberta a partir
desta mesma lacuna).

### Decisão já fechada

- **Modelo de negócio: autosserviço.** O cliente se cadastra sozinho — sem
  intervenção manual do dono do produto para provisionar cada tenant.

### Por que isso muda o tamanho do problema

Autosserviço não é "adicionar uma tela de cadastro" — é abrir a porta da
frente do sistema para desconhecidos, sem curadoria humana no meio. Isso
levanta responsabilidades que o modelo "gerido por mim" não teria:

- **Validação de identidade mínima** antes de ativar um tenant (e-mail do
  primeiro admin precisa ser confirmado antes do tenant operar de verdade —
  senão qualquer um cria um tenant com e-mail que não é dele).
- **Anti-abuso** no endpoint público de cadastro (rate limiting, captcha ou
  equivalente) — é a única rota do sistema que, por definição, precisa
  aceitar tráfego não-autenticado de origem desconhecida.
- **Disponibilidade de subdomínio em tempo real** — o cliente escolhe
  `acme` e o sistema precisa checar unicidade contra `Tenant.subdomain` na
  hora, com mensagem clara se já existe.
- **Plano padrão e limites** — todo tenant nasce em algum plano (`free`,
  hoje o único valor default do model). Sem cobrança implementada ainda,
  precisa decidir se autosserviço = só plano gratuito por ora, ou se
  cobrança é pré-requisito antes de abrir ao público.
- **Visibilidade/gestão do dono da plataforma** — autosserviço sem um painel
  de dono da plataforma (issue **#30**) significa tenants sendo criados sem
  ninguém saber, poder suspender abuso, ou ver quantos existem. **Esta ideia
  depende da #30 estar resolvida antes de ir ao ar — não antes de começar a
  desenhar, mas antes de publicar de verdade.**

### Decisões em aberto (o que falta fechar antes de virar issue)

- [ ] **Confirmação de e-mail é obrigatória antes do tenant operar, ou o
      cadastro já libera uso imediato?**
- [ ] **Plano único (free) para todo cadastro autosserviço, ou cobrança
      precisa existir primeiro?** (Hoje não há nenhuma integração de
      pagamento no código.)
- [ ] **Subdomínio é obrigatório no cadastro, ou pode ser definido depois?**
      (Model já suporta subdomínio nulo — hoje possível operar sem ele.)
- [ ] **O que acontece com um tenant abandonado no meio do cadastro** (e-mail
      nunca confirmado)? Precisa de expiração/limpeza, ou fica órfão para
      sempre?
- [ ] **Rate limiting/anti-abuso** — mecanismo concreto ainda não escolhido.

### Relação com outras issues/decisões

- **Depende da #30** (papel de dono da plataforma) antes de ir ao ar — sem
  isso, ninguém enxerga nem controla o que o autosserviço está criando.
- Complementa diretamente a **#17/#27/#28** (provedor de e-mail por tenant):
  um tenant recém-criado via autosserviço nasce sem provedor configurado —
  o modo *dry-run* já previsto na #17 cobre esse intervalo até o cliente
  configurar o próprio provedor.

---

## #3 — Processo e Framework (agrupamento, ciclo de vida e escuta transversal de comunicações)

**Status:** Em maturação. Não é issue.

### A ideia

Hoje o `Comunicado` é uma unidade atômica e isolada — sem relação formal com
nenhum outro. A proposta é introduzir "Processo" como uma **capacidade
horizontal do sistema**, não uma feature vertical: o Interact não vem com
tipos de processo pré-definidos (nada de "Onboarding" hardcoded). Cada
organização define os próprios processos, com os nomes e estruturas que
fizerem sentido pra ela, e pode ter quantos quiser do "mesmo assunto"
coexistindo (ex.: mais de um "Onboarding" ao mesmo tempo, para áreas
diferentes). A única coisa que o Interact garante é a **capacidade de
agrupar comunicações sob um modelo, orientado por essa ótica, e refinável
com o tempo** — o conteúdo e a taxonomia de negócio são inteiramente da
organização.

### Por que isso é diferente de uma ferramenta de workflow/BPM

As ferramentas de orquestração de processo do mercado (Categoria B do
`POSICIONAMENTO.md`) tendem a vir com processos genéricos pré-desenhados e
forçam a empresa a se encaixar neles. Ao tratar "processo" como capacidade
em vez de tipo, o Interact evita repetir esse erro — e mantém a
diferenciação da Categoria C (comunicação vinculada a processo + medição de
percepção), sem virar uma ferramenta de gestão de processo genérica.

### Decisões já fechadas

- **Processo é capacidade genérica, não taxonomia do sistema.** Sem tipos
  fixos (`Onboarding`, `Desligamento`, etc.) no código — o nome e a
  estrutura de cada processo são dados de configuração da organização, não
  enum do produto.
- **Separação Modelo x Instância.**
  - **Modelo**: a definição autoral do processo — a estrutura/sequência de
    comunicações que um caso desse tipo deve seguir. Criado e editado pelo
    admin da organização.
  - **Instância**: a aplicação real do modelo a um caso concreto (um
    colaborador específico, entrando numa data específica), com progresso
    próprio. Várias instâncias podem rodar em paralelo a partir do mesmo
    modelo.
- **Escada de maturidade (construção incremental, não tudo de uma vez):**
  1. **Agrupamento simples** — comunicados marcados como pertencentes ao
     mesmo processo nomeado pela organização, sem ordem nem estado por
     pessoa. Já habilita olhar métricas do grupo como um todo.
  2. **Sequência** — os comunicados do agrupamento ganham ordem/etapa,
     ainda igual para todo mundo (datas absolutas, sem relativizar por
     pessoa).
  3. **Instância com estado por pessoa** — cada execução do modelo passa a
     rastrear em que etapa cada indivíduo está, com datas relativas à
     entrada dele no processo (não ao calendário).
  4. **Modelo refinável/versionado** — o modelo pode ser editado depois de
     publicado, com alguma regra de como isso afeta instâncias já em curso.
- **A política de propagação de mudança do modelo (nível 4) é, ela também,
  uma decisão da organização — não uma regra fixa do Interact.** Ou seja,
  o próprio "instância continua na versão antiga até terminar" vs. "herda a
  mudança em tempo real" não é escolhido pelo produto: é uma configuração
  que cada organização define (possivelmente por modelo de processo). Isso
  é coerente com o princípio geral desta entrada — o Interact garante a
  capacidade, a organização decide como usá-la.
- **O Framework é o motor de ciclo de vida da Instância.** Uma Instância não
  é só um rótulo estático — ela **abre** num momento e **fecha** em outro,
  e percorre um trajeto reconhecível nesse intervalo. O vocabulário adotado
  para esse trajeto é **Início → Meio → Fim**, em vez de etapas numeradas
  fixas — porque nem todo framework tem etapas discretas e comparáveis (uma
  campanha de calendário comemorativo não tem "etapa 4" clara, mas tem
  claramente um início, um meio e um fim).
- **Toda mensagem se declara esporádica ou vinculada a um framework aberto.**
  - **Esporádica** — segue exatamente como o `Comunicado` funciona hoje:
    nasce, publica, expira, morre sozinha. Nenhuma mudança no que já existe.
  - **Vinculada a um framework** — herda a posição temporal do framework
    (início/meio/fim) e precisa de **agendamento relativo**, não absoluto:
    "mensagem do meio do onboarding" é relativa à abertura daquela instância
    específica, não uma data fixa de calendário.
- **Existem (pelo menos) dois tipos de framework, com propósitos de escuta
  diferentes** — o segundo tipo generaliza a ideia para além de jornadas
  individuais (ex.: onboarding) e cobre séries temáticas recorrentes que a
  organização mantém ao longo do ano (ex.: calendário comemorativo: Dia das
  Mães, Dia dos Pais, Carnaval, Black Friday, aniversário da empresa, festa
  de fim de ano):

  | | Jornada sequencial | Série temática recorrente |
  |---|---|---|
  | Relação entre mensagens | Dependente, ordenada | Independente, só compartilha categoria/tema |
  | Calendário | Relativo à pessoa (dia 1, dia 7 dela) | Absoluto, igual para todos (datas de calendário civil) |
  | O que a escuta mede | Compreensão/progresso numa trilha | Interferência na rotina e percepção acumulada da categoria |
  | Pergunta típica de pulso | "Você entendeu esta etapa?" | "Esse conjunto de mensagens tem atrapalhado sua rotina, ou passou a impressão de cuidado sem interferir no trabalho?" |

- **A escuta transversal tem dois instrumentos distintos, com relógios e
  escopos diferentes — não devem ser fundidos:**
  - **Termômetro geral do canal** — pulso periódico, desacoplado de
    qualquer framework específico, medindo a aderência ao **conjunto geral**
    de comunicados que a pessoa recebe (esporádicos + todos os frameworks
    juntos).
  - **Pulso de framework** — escopado a um framework aberto específico,
    atravessando-o continuamente enquanto ele está em curso (não só
    disparado no fechamento) — como alguém que interrompe brevemente para
    perguntar "está tudo bem?" no meio do fluxo, sem esperar o fim dele.
- **O Framework cura o catálogo de níveis de pulso; o planejador do fluxo
  escolhe o quê e quando, dentro desse catálogo.** Separação de
  responsabilidade: o **conteúdo** da pergunta (o quê perguntar) é do
  planejador, que conhece o contexto de negócio do fluxo; a **governança de
  uso** (quando é apropriado perguntar, com que frequência, dentro de que
  escopo temático) é do Framework — para evitar os erros que qualquer
  planejador, sem essa camada, acabaria cometendo: perguntar demais,
  perguntar cedo demais, ou perguntar fora do escopo temático do framework.
  Exemplos de níveis que o catálogo poderia oferecer: **interferência
  operacional** ("isso atrapalhou seu trabalho?" — cabe em série temática,
  raramente em jornada sequencial), **compreensão de etapa** ("você
  entendeu o que essa etapa pedia?" — cabe em jornada sequencial, sem
  sentido numa série temática solta), **percepção/cuidado** ("você sente
  que a empresa se importa em comunicar isso pra você?" — cabe nos dois,
  com peso diferente).
- **Fronteira de escopo (decisão de negócio, não técnica): esta capacidade
  não pode se tornar um instrumento de clima organizacional ou retenção.**
  Toda pergunta de pulso — termômetro geral ou pulso de framework — precisa
  estar ancorada ao canal de comunicação ou a um framework específico, nunca
  a "satisfação com a empresa" ou "intenção de sair". Se essa métrica um dia
  correlacionar com retenção, é efeito colateral observável, não o
  propósito declarado da funcionalidade. Isso complementa a **Categoria D**
  de anti-posicionamento (plataformas de escuta/engajamento organizacional
  tipo Culture Amp, Officevibe, Glint, eNPS) a ser registrada no
  `POSICIONAMENTO.md`.

### Decisões em aberto (o que falta fechar antes de virar issue)

- [ ] **Quais são as opções concretas de política de versionamento
      oferecidas?** "Decisão da organização" precisa de um conjunto finito
      de opções reais no produto (ex.: manter versão da criação da
      instância / herdar mudança imediatamente / aplicar só a partir da
      próxima etapa não iniciada) — não pode ficar em aberto para sempre.
- [ ] **Essa configuração vive no nível do modelo de processo, ou no nível
      do tenant (todos os processos da organização seguem a mesma regra)?**
- [ ] **Um comunicado pode pertencer a mais de um processo ao mesmo tempo,
      ou só a um?** Afeta diretamente o desenho do nível 1 (agrupamento).
- [ ] **Quem pode criar/editar modelos de processo?** Todo admin, ou um
      perfil específico — mesma pergunta de governança já levantada na
      entrada #1 para o flag `mandatory`.
- [ ] **Relação com `targetGroups` (segmentação de pessoas) e com tags de
      interesse (entrada #1).** Processo agrupa *comunicações*; `Group`
      agrupa *pessoas*; tags de interesse ranqueiam *relevância*. São três
      dimensões ortogonais ou se sobrepõem em algum ponto? Precisa ficar
      claro na nomenclatura do sistema para não confundir "Grupo" (pessoas)
      com "Processo" (comunicados agrupados).
- [ ] **Nível mínimo viável para validar o conceito antes de investir nos
      níveis 3/4** — provavelmente o nível 1 (agrupamento simples) sozinho,
      mas isso precisa ser confirmado antes de comprometer esforço com
      estado por pessoa e versionamento, que são bem mais caros de
      construir.
- [ ] **Métrica de sucesso.** Como validar que "processo" resolveu o
      problema de diagnóstico por etapa (onde as pessoas mais se perdem)
      e não só reorganizou os mesmos comunicados sob um rótulo novo?
- [ ] **O que dispara a abertura e o fechamento de um framework?** Manual
      (admin abre/fecha na mão), por evento (ex.: data de admissão aciona
      abertura de um onboarding), ou por tempo (campanha com datas
      pré-definidas)? Provavelmente os três precisam coexistir, cada um
      fazendo mais sentido para um tipo de framework.
- [ ] **Início/Meio/Fim é atribuído explicitamente a cada mensagem na
      criação, ou calculado dinamicamente pela duração do framework** (ex.:
      primeiros 20% da duração = início, últimos 20% = fim)? A segunda
      opção é mais elegante mas exige duração estimada desde a abertura —
      nem sempre conhecida de antemão (uma campanha pode não ter data de
      fim definida ao nascer).
- [ ] **Um framework pode reabrir depois de fechado, ou fechamento é
      definitivo?** (Ex.: colaborador com onboarding fechado que muda de
      cargo — reabre a mesma instância, ou cria uma nova?)
- [ ] **Séries temáticas recorrentes "fecham" de fato, ou apenas reiniciam
      a cada ciclo?** Um calendário comemorativo é anual e perpétuo —
      talvez nunca tenha um "Fim" no mesmo sentido que uma jornada de
      onboarding tem. Muda o que "fechamento" significa para esse tipo de
      framework.
- [ ] **O catálogo de níveis de pulso é fixo (curado pelo Interact) ou
      extensível (organização cria os próprios níveis)?** Fixo protege
      contra desvio de escopo (ver fronteira anti-retenção acima);
      extensível é mais flexível, mas reabre o risco de virar pesquisa de
      clima genérica se mal curado.
- [ ] **A guardrail de frequência de pulso é por framework isolado, ou soma
      o "ruído" de todos os frameworks simultâneos que uma mesma pessoa
      está vivendo?** Alguém pode estar, ao mesmo tempo, dentro de um
      onboarding e recebendo mensagens de uma série temática — os pulsos de
      ambos podem se acumular e causar a fadiga que a guardrail deveria
      evitar.

### Relação com outras issues/decisões

- Responde diretamente à pergunta em aberto #1 do `POSICIONAMENTO.md`
  ("Processo vira conceito de 1ª classe no modelo de dados, ou continua
  emergindo de categorização/tags?") — a resposta desta entrada é: vira
  conceito próprio, mas como capacidade genérica, não como taxonomia fixa.
- Depende de decisões da **entrada #1** (ranking por tags) para não
  duplicar mecanismo de tagging — ver pergunta em aberto acima sobre
  sobreposição entre processo, grupo e tag de interesse.
- Reaproveita a infraestrutura de métricas já entregue pela **I-13**
  (dashboard), que precisaria evoluir para agregar por processo/etapa, não
  só por comunicado individual.
- A fronteira anti-retenção desta entrada depende de virar posicionamento
  formal — ver **Categoria D** a ser adicionada ao `POSICIONAMENTO.md`
  (seção 2, mapa competitivo) e ao anti-posicionamento (seção 4).
