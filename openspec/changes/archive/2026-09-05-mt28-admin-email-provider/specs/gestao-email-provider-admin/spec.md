## Purpose

Permitir que o gestor (admin) do tenant configure e valide, pelo painel administrativo, o provedor de e-mail do próprio tenant — com o segredo sempre write-only, teste de conexão antes de salvar e exibição de auditoria — restrito a `role: admin`.

## ADDED Requirements

### Requirement: Tela de gestão do provedor de e-mail

O sistema SHALL oferecer uma tela administrativa (rota `#/settings/email-provider`) para o gestor configurar o provedor de e-mail do tenant, com campos para tipo (`smtp`/`api`), host, porta, `secure` (toggle), usuário, segredo e remetente (nome/e-mail).

#### Scenario: Admin abre a tela

- **WHEN** um usuário `role: admin` navega para `#/settings/email-provider`
- **THEN** o sistema renderiza o formulário com os campos do provedor

### Requirement: Segredo sempre write-only

O sistema SHALL exibir o segredo como campo **write-only**: nunca mostra o valor existente; quando já houver credencial salva, o placeholder indica `•••• (configurado)` e o campo pode ser deixado em branco para reter a credencial.

#### Scenario: Credencial já salva

- **WHEN** há um provedor configurado e o admin abre a tela
- **THEN** o campo de segredo mostra placeholder `•••• (configurado)` e não contém o valor real

#### Scenario: Salvar sem alterar o segredo

- **WHEN** o admin salva deixando o segredo em branco
- **THEN** a credencial existente é mantida (o backend retém `secretEncrypted`)

### Requirement: Testar conexão antes de salvar

O sistema SHALL oferecer um botão "Testar conexão" que chama `POST /api/tenant/settings/email-provider/test`, exibindo feedback visual de sucesso ou falha, e avisa claramente quando o salvamento ocorre sem um teste bem-sucedido.

#### Scenario: Teste de conexão com sucesso

- **WHEN** o admin preenche a config e clica "Testar conexão" com credencial válida
- **THEN** o sistema exibe feedback de sucesso

#### Scenario: Teste de conexão com falha

- **WHEN** o admin clica "Testar conexão" com credencial inválida
- **THEN** o sistema exibe feedback de falha e não salva

### Requirement: Auditoria visível na tela

O sistema SHALL exibir na tela a informação de auditoria "última atualização por {nome} em {data}", derivada de `updatedBy`/`updatedAt` fornecidos pelo backend.

#### Scenario: Config já atualizada

- **WHEN** há uma configuração salva com `updatedBy`/`updatedAt`
- **THEN** a tela exibe o nome do último autor e a data da última alteração

### Requirement: Acesso restrito a administradores

O sistema SHALL restringir a tela e o item de menu a usuários com `role: admin`; usuários de outros papéis não veem a entrada no menu e, ao acessar a rota, são redirecionados.

#### Scenario: Menu oculto para não-admin

- **WHEN** um usuário com papel diferente de `admin` está autenticado
- **THEN** o item de menu "Provedor de e-mail" não é exibido

#### Scenario: Não-admin acessa a rota

- **WHEN** um usuário com papel diferente de `admin` navega para `#/settings/email-provider`
- **THEN** o sistema o redireciona para uma rota permitida (ex.: `#/posts`)
