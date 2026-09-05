# email-provider-tenant Specification

## Purpose

Permitir que cada tenant configure e gerencie, em runtime, o próprio provedor de envio de e-mail (SMTP ou API de terceiro), com o segredo do provedor cifrado em repouso e nunca exposto em texto puro; apenas administradores do tenant têm acesso.

## Requirements

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

### Requirement: Teste de conexão sem persistir

O sistema SHALL fornecer um endpoint `POST /api/tenant/settings/email-provider/test` que valida a configuração do provedor **sem persistir a configuração**, aceitando dois modos: `connect` (padrão) — valida a conexão/credencial (SMTP handshake ou validação estrutural de API) **sem enviar e-mail real**; e `send` — envia um **e-mail de teste real** pelo adaptador de envio único, para o endereço informado no payload.

#### Scenario: Modo connect com credencial válida

- **WHEN** um administrador envia `POST .../test` com `mode: "connect"` (ou sem `mode`) e credencial válida
- **THEN** o sistema retorna sucesso e não altera a configuração persistida

#### Scenario: Modo connect com credencial inválida

- **WHEN** um administrador envia `POST .../test` com `mode: "connect"` e credencial inválida
- **THEN** o sistema retorna falha com mensagem de erro e não altera a configuração persistida

#### Scenario: Modo send envia e-mail de teste real

- **WHEN** um administrador envia `POST .../test` com `mode: "send"`, `to` (destinatário válido) e configuração válida
- **THEN** o sistema envia um e-mail de teste real pelo adaptador de envio único com assunto e corpo de teste identificáveis, retorna sucesso e não altera a configuração persistida

#### Scenario: Modo send sem destinatário

- **WHEN** um administrador envia `POST .../test` com `mode: "send"` sem informar `to`
- **THEN** o sistema retorna `400` com mensagem indicando que o destinatário é obrigatório

#### Scenario: Modo send em dry-run

- **WHEN** um administrador envia `POST .../test` com `mode: "send"` e o tenant não possui provedor configurado
- **THEN** o sistema respeita o modo dry-run (loga o e-mail no console e retorna sucesso) ou responde erro claro conforme a política de ambiente

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
