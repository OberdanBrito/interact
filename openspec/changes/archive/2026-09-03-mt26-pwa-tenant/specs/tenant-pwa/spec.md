## Purpose

Tornar o PWA do colaborador tenant-aware: resolver o tenant a partir do subdomínio no bootstrap, isolar o armazenamento local (sessão, dados do usuário, fila offline) e o cache IndexedDB por tenant, resolver a base da API em runtime por tenant e refletir o tenant no manifest/personalização do app.

## ADDED Requirements

### Requirement: Resolver o tenant pelo subdomínio no init

O PWA DEVE (SHALL) resolver o tenant a partir do `location.hostname` (subdomínio) no bootstrap, antes de restaurar a sessão, definindo o slug e a base da API do tenant corrente. Sem subdomínio (dev), DEVE (SHALL) usar um fallback para o tenant default.

#### Scenario: Subdomínio define o tenant e a API base

- **WHEN** o PWA é aberto em `acme.interact.app`
- **THEN** o tenant corrente tem `slug = "acme"` e usa a base da API do domínio de produção

#### Scenario: Sem subdomínio usa o fallback de dev

- **WHEN** o PWA é aberto em `localhost` (dev) sem subdomínio
- **THEN** o tenant corrente usa o slug default de dev

### Requirement: Armazenamento local isolado por tenant

O PWA DEVE (SHALL) usar chaves de `localStorage` compostas pelo tenant para sessão, dados do usuário (curtidas/leituras), fila offline e preferências (instalação dispensada, último grupo), de modo que dois tenants no mesmo browser não compartilhem nem sobrescrevam esses dados.

#### Scenario: Dois tenants não compartilham dados locais

- **WHEN** um colaborador usa o PWA no tenant A e depois no tenant B no mesmo browser
- **THEN** a sessão, os dados de leitura/curtida, a fila offline e as preferências de cada tenant permanecem separados

### Requirement: Cache IndexedDB (Dexie) por tenant

O PWA DEVE (SHALL) usar um banco IndexedDB (Dexie) cujo nome inclui o tenant, inicializado de forma lazy por tenant; o cache de posts de um tenant DEVE ser isolado do de outro.

#### Scenario: Cache isolado por tenant

- **WHEN** o PWA carrega posts do tenant A e depois do tenant B
- **THEN** cada um usa um banco Dexie distinto (`interact-cache-<tenant>`), sem misturar posts

### Requirement: Base da API resolvida em runtime por tenant

O PWA DEVE (SHALL) obter a base da API em runtime (`getApiBase()` a partir do tenant), e não de uma constante build-time, usando-a nas requisições autenticadas e no canal SSE.

#### Scenario: Requisições usam a base da API do tenant

- **WHEN** o PWA faz login e busca posts do tenant corrente
- **THEN** as requisições usam a base da API resolvida em runtime para o tenant

### Requirement: Manifest e Service Worker conforme o tenant

O PWA DEVE (SHALL) refletir o tenant no manifest (nome/short_name/start_url/scope personalizáveis) e isolar o Service Worker por origem/scope (cada subdomínio é uma origem própria, mantendo o cache do SW por tenant).

#### Scenario: Manifest reflete o tenant

- **WHEN** o PWA é servido para um tenant
- **THEN** o manifest aplicado/registrado usa nome e escopo do tenant, e o Service Worker roda por origem/scope do subdomínio
