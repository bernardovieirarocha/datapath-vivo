# e2e fora da v0.1

Testes das telas que saíram do ar na v0.1 (programa passo a passo, quiz, falhas, codificação, página inicial com módulos). O código dessas telas continua em `src/ui/modes/`.

Para reativar uma tela: devolva a rota em `src/ui/App.tsx`, mova o spec de volta para `e2e/` e ajuste os endereços. Esta pasta é ignorada pelo `playwright.config.ts` (`testIgnore`).
