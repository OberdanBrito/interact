## MODIFIED Requirements

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