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
