# Datapath Vivo — contexto do projeto

Ferramenta web didática e interativa do caminho de dados MIPS (monociclo e multiciclo) para as disciplinas AOC1 (teoria) e LAOC1 (laboratório) do CEFET-MG, Prof.ª Poliana Corrêa. Mantida pela monitoria (Bernardo Vieira Rocha). Público: alunos de Engenharia de Computação no 1º contato com datapath.

O plano completo, com as fases e os critérios de aceite, está em `docs/PLANO.md`. Leia antes de qualquer tarefa grande e siga a fase pedida, sem adiantar as próximas.

## Regras inegociáveis

1. **Fidelidade ao laboratório.** O simulador monociclo é bit-exato com o processador da Prática 10 (`reference/pratica10/*.v`). Em qualquer dúvida de comportamento, o Verilog manda, depois `docs/PLANO.md` Seção 2, depois o livro (Patterson & Hennessy, cap. 4).
2. **O golden trace nunca quebra.** `reference/golden_trace_pratica10.json` (22 ciclos, todos os fios) é teste obrigatório no CI. Se ele falhar, pare e corrija antes de seguir.
3. **O core não conhece a UI.** `src/core/**` é TypeScript puro, sem React/DOM, determinístico: `step(state) -> { next, snapshot }`. A UI só lê snapshots.
4. **O datapath é dados.** Componentes, portas e fios (com largura em bits) vivem numa netlist declarativa; o SVG usa os mesmos ids. Não coloque lógica de simulação em componentes visuais.
5. **Aritmética uint32 sempre.** Use os helpers de `src/core/bits.ts` (`u32`, `toSigned`, `signExt16`, `bits`). Nunca confie em number de JS sem `>>> 0`.
6. **Interface em português (pt-BR)**, com o vocabulário exato dos slides e do Verilog: RegDst, Branch, MemRead, MemtoReg, ALUOp, MemWrite, ALUSrc, RegWrite, Jump, "Banco de Registradores", "Extensão de Sinal", "Shift left 2".
7. **Lab ≠ slide? Mostre os dois.** Exiba o comportamento do lab e um selo "no slide/livro é assim…". Diferenças conhecidas: ALU control de 3 bits (lab) × 4 bits (slide); don't cares (X no slide, 0 no lab); jump = 2 ciclos no multiciclo dos slides × 3 na FSM do P&H.

## Resumo do hardware da Prática 10

- Monociclo, Harvard. Instruções: add, sub, and, or, slt, addi, lw, sw, beq, j. Opcode desconhecido → controle todo 0.
- Controle da ULA: 010 add · 110 sub · 000 and · 001 or · 111 slt. ALUOp 00 → add, 01 → sub, 10 → funct.
- ULA: ripple-carry; sub = a + ~b + 1; slt = sinal(a−b) XOR overflow; zero = NOR do resultado; overflow calculado e não usado.
- Próximo PC: mux(PC+4, PC+4 + ext(imm)<<2, Branch·Zero) → mux(…, {PC+4[31:28], addr26, 00}, Jump). O jump tem prioridade.
- Banco: 32×32, leitura combinacional, escrita na borda de subida, $0 = 0. Iniciais: $8=5, $9=5, $10=1, $12=4.
- Mem. instruções: 32 palavras, endereço PC[6:2] (dá a volta a cada 128 bytes).
- Mem. dados: 64 bytes, little-endian, palavra = address[7:2], leitura só com MemRead (senão 0), escrita na borda. Iniciais: M[0]=5, M[8]=7. Acesso ≥ 64 → alerta (no Verilog lê X).
- Reset desabilita RegWrite e MemWrite.
- Top-level `pratica10.v`: placa DE10-Lite; SW[9] velocidade, SW[8] modo passo (KEY1), KEY0 reset, SW[7:6]/SW[5:4] selecionam o que aparece em HEX5..HEX0; LEDR9..0 = clk, reset, PCSrc, Zero, RegWrite, MemRead, MemWrite, Branch, ALUSrc, MemtoReg.

## Stack e comandos

- Vite + React 18 + TypeScript strict · Zustand · Vitest · Playwright · SVG escrito à mão · deploy no GitHub Pages.
- `npm run dev` · `npm test` · `npm run test:e2e` · `npm run lint` · `npm run build`.

## Jeito de trabalhar

- Uma fase por vez; ao terminar: testes verdes, build ok, commit, entrada em `docs/CHANGELOG.md` com o que ficou pronto e o que ficou pendente.
- Escreva o teste do comportamento antes ou junto do código do core.
- Textos didáticos ficam em `src/content/`, separados da lógica, para a monitoria revisar.
- Não adicione dependências pesadas sem justificar no CHANGELOG. Bundle alvo < 300 kB gzip.
- localStorage só para conveniências (progresso, tema), sempre com try/catch.
- Na dúvida sobre algo didático (o que a professora espera), deixe configurável e anote em `docs/DUVIDAS.md` em vez de decidir sozinho.
