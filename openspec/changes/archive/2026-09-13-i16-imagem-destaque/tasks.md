## 1. Preview de capa no formulário admin

- [x] 1.1 Adicionar estado de preview de capa no formulário de comunicação (form-view.js)
- [x] 1.2 Implementar leitura do arquivo selecionado e exibição preview antes do envio
- [x] 1.3 Adicionar mensagem de status ("Capa adicionada", "Capa removida", "Erro no upload")

## 2. Fallback de capa no feed do colaborador

- [x] 2.1 Garantir que o componente `postCardHTML` exiba estado placeholder quando `coverImage` estiver vazio ou inválido
- [x] 2.2 Testar comportamento: card sem capa → exibe placeholder; card com capa → exibe imagem
- [x] 2.3 Verificar consistência entre PWA e admin (ambos usam o mesmo campo `coverImage`)

## 3. Validação e tipos de imagem (backend)

- [x] 3.1 Confirmar que os limites de upload já estão definidos em `upload.js` (`MAX_COVER_MB`, `EXT_BY_MIME`)
- [x] 3.2 Testar upload de imagens nos tipos permitidos (pdf/png/jpeg/gif/webp) e rejeitados
- [x] 3.3 Verificar que imagens inválidas não quebram o card (fallback aciona corretamente)

## 4. Testes e validação visual

- [x] 4.1 Build (`npm run build`) em ambas as componentes (backend e frontend_pwa)
- [x] 4.2 QA visual no Playwright: card com capa, card sem capa, upload nova capa, upload imagem inválida
- [x] 4.3 Verificar que não há regressão visual em comunicação existente sem capa