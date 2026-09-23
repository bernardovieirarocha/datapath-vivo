# Fase 7 — Multiciclo (M6)

Cole o bloco abaixo no Claude Code (na raiz do repositório).

```text
Implemente `core/multi`: datapath multiciclo do P&H (memória única, IR, MDR, A, B, ALUOut, IorD, ALUSrcA, ALUSrcB, PCSource, PCWrite, PCWriteCond, IRWrite) e FSM de controle com os estados 0–9, para o mesmo subconjunto de instruções. Número de ciclos por classe configurável com presets "Slides AOC1" (j = 2) e "FSM P&H" (j = 3), explicando a diferença na UI. Desenhe o datapath (slide 16 da Aula 07) e a FSM, com a RTL de cada passo. Tela de comparação lado a lado monociclo × multiciclo com ciclos, período, tempo total e CPI. Teste de equivalência: mesmo estado arquitetural final nos dois simuladores para um conjunto de programas; e os Exercícios 1 e 2 da Aula 07 reproduzidos (80 ns × 78 ns; 140 ns × 100 ns) e o CPI 4,02 do exemplo gcc.

Ao terminar: rode lint, testes e build; atualize docs/CHANGELOG.md com o que ficou pronto e o que ficou pendente; anote dúvidas didáticas em docs/DUVIDAS.md.
```

## Critério de aceite

Ver a descrição do módulo correspondente em `docs/PLANO.md` (Seções 5 e 8). Testes verdes e build ok.
