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

- Reaproveita a arquitetura de ordenação que a **I-10 (Paginação)** já vai
  mexer — se I-10 mover a lógica de ordenação para o backend (decisão já
  tomada nela), esta ideia deveria ser desenhada em cima dessa mesma
  mudança, não antes dela. **Não iniciar esta ideia antes da I-10 estar
  concluída.**
