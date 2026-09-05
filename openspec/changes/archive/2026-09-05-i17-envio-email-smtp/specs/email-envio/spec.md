## Purpose

Enviar e-mails reais por tenant através de um adaptador de envio único, com provedor SMTP genérico, sem acoplamento do restante do sistema ao provedor escolhido.

## ADDED Requirements

### Requirement: Adaptador de envio único

O sistema SHALL expor um adaptador único de envio de e-mail (`sendEmail({ to, subject, html, tenantId })`) que resolve o provedor configurado do tenant e envia a mensagem, de modo que rotas, filas e demais consumidores chamem sempre o mesmo adaptador, sem conhecimento da implementação do provedor.

#### Scenario: Envio com provedor SMTP configurado

- **WHEN** o adaptador é chamado para um tenant com provedor `type: "smtp"` configurado e credencial válida
- **THEN** o e-mail é enviado via SMTP usando o host, porta, autenticação, `fromAddress` e `fromName` da configuração do tenant, e o envio retorna sucesso

#### Scenario: Destinatário e conteúdo passados pelo chamador

- **WHEN** o adaptador é chamado com `to`, `subject` e `html`
- **THEN** a mensagem é montada com esses valores e o remetente `fromName <fromAddress>` da configuração do tenant

### Requirement: SMTP genérico como provedor suportado

O sistema SHALL suportar envio via SMTP genérico para configurações `type: "smtp"`, usando o segredo decifrado da configuração (senha ou API key) para autenticar no servidor.

#### Scenario: Segredo decifrado para autenticação

- **WHEN** um envio é feito para um tenant com `type: "smtp"`
- **THEN** o segredo armazenado cifrado em `secretEncrypted` é decifrado e usado como senha de autenticação SMTP, sem nunca aparecer em texto puro em logs ou respostas

#### Scenario: Provedor tipo api ainda não suportado

- **WHEN** um envio é solicitado para um tenant com `type: "api"`
- **THEN** o adaptador responde erro claro indicando que o provedor de API ainda não é suportado, sem tentar envio

### Requirement: Modo dry-run em desenvolvimento

O sistema SHALL operar em modo dry-run quando o tenant não possui provedor configurado: o e-mail é registrado no console (log) em vez de enviado, e a operação retorna sucesso.

#### Scenario: Sem provedor configurado

- **WHEN** o adaptador é chamado para um tenant sem `Tenant.settings.emailProvider` configurado
- **THEN** a mensagem é logada no console com destinatário, assunto e corpo (sem envio real) e o adaptador retorna sucesso

#### Scenario: Credencial ausente em produção

- **WHEN** o adaptador é chamado em ambiente de produção para um tenant sem provedor configurado
- **THEN** a operação falha com erro claro (sem envio e sem logar conteúdo sensível) ou é recusada conforme a política de dry-run definida por ambiente

### Requirement: Segredos nunca commitados

O sistema SHALL manter os segredos do provedor por tenant somente na configuração cifrada do banco (nunca em código, arquivos de configuração ou variáveis de ambiente versionadas).

#### Scenario: Envio usa apenas a config do tenant

- **WHEN** o adaptador envia um e-mail
- **THEN** todas as credenciais usadas vêm de `Tenant.settings.emailProvider` (decifradas em memória), e nenhum segredo é lido de arquivos versionados