# Fase 3 — Datapath SVG + Modo Execução (M1)

Cole o bloco abaixo no Claude Code (na raiz do repositório).

```text
Siga o guia visual da Seção 7 do plano. Desenhe o datapath monociclo em SVG com o layout do slide 8 da Aula 07 (em `docs/ref/` há a imagem de referência), usando os mesmos ids de fio da netlist. Componentes SVG reutilizáveis: Wire (com largura e rótulo), Mux (com a chave desenhada indicando a entrada selecionada), Alu, Adder, RegFile, Memory, SignExtend, ShiftLeft2, AndGate, ControlUnit. Implemente o Modo Execução (M1): passo, voltar, rodar, reset, fases visuais do ciclo, etiquetas de valor com dec/hex/bin, fios inativos esmaecidos, painéis de registradores, memória de dados (palavra e byte), memória de instruções e sinais de controle, editor de programa com o montador da Fase 1, estado inicial editável e preset "Prática 10", URL compartilhável. Clique em bloco abre painel com explicação (de `src/content/`) e o trecho de Verilog correspondente. Faça os e2e do item 8.

Ao terminar: rode lint, testes e build; atualize docs/CHANGELOG.md com o que ficou pronto e o que ficou pendente; anote dúvidas didáticas em docs/DUVIDAS.md.
```

## Critério de aceite

um aluno consegue rodar o programa da Prática 10 e ver os mesmos valores do golden trace na tela; funciona no tema claro e escuro; atalhos de teclado funcionam.
