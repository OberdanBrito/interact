## Purpose

Permitir que cada tenant configure e gerencie, em runtime, o próprio provedor de envio de e-mail (SMTP ou API de terceiro), com o segredo do provedor cifrado em repouso e nunca exposto em texto puro; apenas administradores do tenant têm acesso.

## ADDED Requirements

### Requirement: Configuração armazenada no tenant

O sistema SHALL armazenar a configuração do provedor de e-mail do tenant em `Tenant.settings.emailProvider`, persistindo os campos `type` (`"smtp"` ou `"api"`), `host`, `port`, `secure`, `authUser`, `secretEncrypted` (cifrado), `fromAddress`, `fromName`, `updatedBy` e `updatedAt`.

#### Scenario: Config retornada com campos esperados

- **WHEN** um administrador consulta a configuração do provedor
- **THEN** a resposta contém `type`, `host`, `port`, `secure`, `authUser`, `fromAddress`, `fromName`, `updatedBy` e `updatedAt`

### Requirement: Segredo nunca em texto puro

O sistema SHALL cifrar o segredo (senha SMTP ou API key) antes de persistir, e SHALL NUNCA devolvê-lo em texto puro nas respostas da API — sempre mascarado (por exemplo, `••••1234` exibindo apenas os últimos caracteres).

#### Scenario: Segredo salvo é cifrado em repouso

- **WHEN** um administrador salva uma senha/API key
- **THEN** o valor persistido no banco está cifrado (não é o texto claro enviado)

#### Scenario: Segredo mascarado na leitura

- **WHEN** um administrador lê a configuração do provedor
- **THEN** a resposta exibe o segredo mascarado (últimos 4 caracteres visíveis) e nunca o texto claro completo

### Requirement: Acesso restrito a administradores

O sistema SHALL permitir que apenas usuários autenticados com `role: "admin"` do tenant acessem e alterem a configuração do provedor; os demais papéis recebem `403`.

#### Scenario: Admin consulta e altera

- **WHEN** um usuário autenticado com `role: "admin"` do tenant faz `GET` ou `PUT` na configuração
- **THEN** a operação é processada com sucesso

#### Scenario: Não-admin recebe 403

- **WHEN** um usuário autenticado com papel diferente de `admin` tenta `GET` ou `PUT` na configuração
- **THEN** o sistema responde `403 Acesso restrito a administradores`

### Requirement: Teste de conexão sem persistir nem enviar e-mail

O sistema SHALL fornecer um endpoint `POST /api/tenant/settings/email-provider/test` que valida a credencial do provedor (conexão de teste) sem persistir a configuração e sem enviar e-mail real, retornando sucesso ou falha.

#### Scenario: Credencial válida

- **WHEN** um administrador envia `POST .../test` com uma credencial válida
- **THEN** o sistema retorna sucesso e não altera a configuração persistida

#### Scenario: Credencial inválida

- **WHEN** um administrador envia `POST .../test` com credencial inválida
- **THEN** o sistema retorna falha com mensagem de erro e não altera a configuração persistida

### Requirement: Auditoria mínima da configuração

O sistema SHALL registrar `updatedBy` (identificador do usuário que alterou) e `updatedAt` (data/hora da alteração) a cada atualização da configuração do provedor.

#### Scenario: Alteração registra auditoria

- **WHEN** um administrador salva a configuração do provedor
- **THEN** `updatedBy` e `updatedAt` são gravados com o usuário atual e a data/hora da operação

### Requirement: Escopo por tenant na configuração

O sistema SHALL aplicar a configuração do provedor somente ao tenant resolvido na requisição, de modo que um tenant nunca leia nem altere a configuração de outro.

#### Scenario: Tenant vê apenas a própria configuração

- **WHEN** um administrador autenticado em um tenant consulta ou altera a configuração do provedor
- **THEN** as operações se referem exclusivamente ao `Tenant` do tenant resolvido (`req.tenantId`)
