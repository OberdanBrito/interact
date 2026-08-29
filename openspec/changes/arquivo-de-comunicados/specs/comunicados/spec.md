## ADDED Requirements

### Requirement: Filtrar comunicados por idade (ativos/arquivados)
O sistema SHALL permitir ao colaborador filtrar `GET /api/posts` pelo parâmetro opcional
`?archive`, separando comunicados ativos de antigos por idade. Um comunicado é considerado
"antigo" (arquivado) quando publicado há `ARCHIVE_AFTER_DAYS` dias ou mais (padrão 30), e
"ativo" quando publicado há menos de `ARCHIVE_AFTER_DAYS` dias.

- `archive=active` → somente comunicados ativos (`dateISO` há menos de `ARCHIVE_AFTER_DAYS` dias);
- `archive=archived` → somente comunicados arquivados (`dateISO` há `ARCHIVE_AFTER_DAYS` dias ou mais);
- ausência do parâmetro → comportamento atual preservado (retorna todos os elegíveis);
- o filtro SHALL se combinar com visibilidade por grupo (`?groupId`), categoria (`?category`) e
  busca (`?search`); o parâmetro SHALL ser ignorado para requisições de admin (que continuam
  vendo só o que publicaram, sem separação por idade).

#### Scenario: Listar apenas comunicados ativos
- **WHEN** um colaborador chama `GET /api/posts?archive=active`
- **THEN** a resposta contém somente comunicados com `dateISO` há menos de `ARCHIVE_AFTER_DAYS` dias

#### Scenario: Listar apenas comunicados arquivados
- **WHEN** um colaborador chama `GET /api/posts?archive=archived`
- **THEN** a resposta contém somente comunicados com `dateISO` há `ARCHIVE_AFTER_DAYS` dias ou mais

#### Scenario: Sem parâmetro preserva o comportamento atual
- **WHEN** um colaborador chama `GET /api/posts` sem `?archive`
- **THEN** a resposta contém todos os comunicados elegíveis (ativos e antigos), como antes

#### Scenario: Busca funciona dentro do arquivo
- **WHEN** um colaborador chama `GET /api/posts?archive=archived&search=aviso`
- **THEN** a resposta contém somente comunicados arquivados cujo título ou autor corresponda a
  "aviso"

#### Scenario: Visibilidade por grupo funciona dentro do arquivo
- **WHEN** um colaborador chama `GET /api/posts?archive=archived&groupId=<seu-grupo>`
- **THEN** a resposta respeita a visibilidade do grupo (broadcast + direcionados aos seus grupos)

#### Scenario: Admin ignora o filtro de arquivo
- **WHEN** um admin chama `GET /api/posts?archive=archived`
- **THEN** o admin continua recebendo somente o que publicou, sem separação por idade