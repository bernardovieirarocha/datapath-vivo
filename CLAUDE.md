# Datapath Vivo — contexto do projeto

Ferramenta web didática e interativa do caminho de dados MIPS (monociclo e multiciclo), **de apoio à disciplina teórica AOC1** do CEFET-MG, Prof.ª Poliana Corrêa. Mantida pela monitoria (Bernardo Vieira Rocha). Público: alunos de Engenharia de Computação no 1º contato com datapath. O foco é o datapath **como é ensinado em sala**, não o processador do laboratório (LAOC1).

O plano completo, com as fases e os critérios de aceite, está em `docs/PLANO.md`. Leia antes de qualquer tarefa grande e siga a fase pedida, sem adiantar as próximas.

**Estado: v0.1.** Está no ar só a tela da instrução (`src/ui/modes/explorar/`). Programa passo a passo, quiz, falhas e codificação existem no código mas não têm rota. **Não construa nem reative módulo nenhum antes do retorno da professora** (`docs/PLANO.md`, "Versão 0.1", e `docs/REUNIAO.md`).

Os slides (`docs/ref/`) e o Verilog da prática (`reference/pratica10/`) ficam só na máquina do Bernardo, fora do git: o repositório é público. Se não estiverem na pasta, peça a ele.

## Regras inegociáveis

1. **Fidelidade aos slides.** O datapath, as tabelas e o vocabulário são os das Aulas 04, 06 e 07 (`docs/ref/`). Em qualquer dúvida de comportamento, os slides mandam, depois `docs/PLANO.md` Seção 2, depois o livro (Patterson & Hennessy, cap. 4). O Verilog da Prática 10 (`reference/pratica10/`) **não** é referência.
2. **O golden trace nunca quebra.** `reference/golden_trace_pratica10.json` (22 ciclos, todos os fios, programa de exemplo) é teste obrigatório no CI. Se ele falhar, pare e corrija antes de seguir.
3. **O core não conhece a UI.** `src/core/**` é TypeScript puro, sem React/DOM, determinístico: `step(state) -> { next, snapshot }`. A UI só lê snapshots.
4. **O datapath é dados.** Componentes, portas e fios (com largura em bits) vivem numa netlist declarativa; o SVG usa os mesmos ids. Não coloque lógica de simulação em componentes visuais.
5. **Aritmética uint32 sempre.** Use os helpers de `src/core/bits.ts` (`u32`, `toSigned`, `signExt16`, `bits`). Nunca confie em number de JS sem `>>> 0`.
6. **Interface em português (pt-BR)**, com o vocabulário exato dos slides: RegDst, Branch, MemRead, MemtoReg, ALUOp, MemWrite, ALUSrc, RegWrite, Jump, "Banco de Registradores", "Extensão de Sinal", "Shift left 2".
7. **Slide ≠ livro? O slide é o padrão.** Mostre o que a aula ensina e, quando o livro difere, um selo "no livro é assim…". Diferença conhecida: jump = 2 ciclos no multiciclo dos slides × 3 na FSM do P&H.

## Resumo do datapath da aula (docs/PLANO.md, Seção 2)

- Monociclo, Harvard (Aula 06, p. 48). Instruções: add, sub, and, or, slt, addi, lw, sw, beq, j. addi é tratada como as demais em tabelas e quiz. Opcode desconhecido → controle todo 0.
- Controle da ULA de **3 bits**, como no slide (Aula 06, p. 27): 000 and · 001 or · 010 add · 110 sub · 111 slt. ALUOp 00 → add, 01 → sub, 10 → funct.
- Tabelas de controle mostram **X** nos don't cares como o slide (sw/beq: RegDst e MemtoReg); o simulador usa 0 por baixo.
- Próximo PC: mux(PC+4, PC+4 + ext(imm)<<2, Branch·Zero) → mux(…, {PC+4[31:28], addr26, 00}, Jump).
- Montador: `j 96` = campo de 26 bits igual a 96 (como no slide); `beq` numérico = deslocamento em palavras.
- Memórias simuladas: instruções 64 palavras, dados 256 bytes little-endian, ambas a partir de 0. Fora delas → alerta.

## Stack e comandos

- Vite + React 18 + TypeScript strict · Zustand · Vitest · Playwright · SVG escrito à mão · deploy no GitHub Pages.
- `npm run dev` · `npm test` · `npm run test:e2e` · `npm run lint` · `npm run build`.

## Jeito de trabalhar

- Uma fase por vez; ao terminar: testes verdes, build ok, commit, entrada em `docs/CHANGELOG.md` com o que ficou pronto e o que ficou pendente.
- Escreva o teste do comportamento antes ou junto do código do core.
- Textos didáticos ficam em `src/content/`, separados da lógica, para a monitoria revisar. Cite o slide (aula e página) de onde vem cada explicação.
- Não adicione dependências pesadas sem justificar no CHANGELOG. Bundle alvo < 300 kB gzip.
- localStorage só para conveniências (progresso, tema), sempre com try/catch.
- Na dúvida sobre algo didático (o que a professora espera), deixe configurável e anote em `docs/DUVIDAS.md` em vez de decidir sozinho.
