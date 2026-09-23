# Changelog

## Planejamento — set/2026
- Plano mestre (`docs/PLANO.md`), `CLAUDE.md`, prompts das fases 0–10.
- Verilog da Prática 10 em `reference/pratica10/` e golden trace de 22 ciclos.
- Slides de referência em `docs/ref/`.
- Dúvidas abertas registradas em `docs/DUVIDAS.md`.

## Fase 0 — Esqueleto e fundação — set/2026

**Pronto**
- Projeto Vite 8 + React 18 + TypeScript (strict, `noUncheckedIndexedAccess`) com Zustand, Vitest (+ cobertura v8), ESLint, Prettier e Playwright.
- Estrutura de pastas da Seção 6 do plano, com README curto em cada pasta.
- `src/core/bits.ts`: `u32`, `toSigned`, `signExt16`, `bits(x, hi, lo)`, `hex`, `bin`, além de `bit` e `mask`. 22 testes, 100% de cobertura, com limite de 100% fixado no `vite.config.ts`.
- Regra 3 verificada automaticamente: `tsconfig.core.json` compila `src/core` sem a lib DOM, e o ESLint proíbe importar React, Zustand, `ui/` e `content/` dentro do core. As duas travas foram testadas com um arquivo de prova.
- Página inicial "Datapath Vivo" com os módulos M1–M9 desabilitados, cada um mostrando em que fase fica pronto (textos em `src/content/modulos.ts`). Tokens de cor em CSS, com tema claro e escuro.
- GitHub Actions (`.github/workflows/ci.yml`): lint, testes com cobertura, build, e2e, e publicação no GitHub Pages a cada push na `main`. `base: './'` no Vite, para funcionar em qualquer subpasta do Pages.
- 1 teste e2e: a página inicial lista os 9 módulos desabilitados.
- Bundle: 46,5 kB gzip.

**Pendente / fora desta fase**
- O repositório ainda não tem remote no GitHub. Falta criar o repo e ativar o Pages com "Source: GitHub Actions" (Settings → Pages); o CI só roda depois disso.
- Nenhum simulador ou UI de módulo ainda (Fases 1+).

## Fase 1 — ISA, montador e disassembler — set/2026

**Pronto** (`src/core/isa/`)
- `instructions.ts`: tabela das 10 instruções do hardware e das 4 de extensão (bne, slti, jal, jr, com `hardware: false`), além do tipo `Instruction`.
- `encoding.ts`: `fields` (fatias idênticas às do `processador.v`), `encode` (lança erro se um campo não couber) e `decode`. O `decode` informa opcode/funct desconhecido e lista campos que o hardware ignora (ex.: shamt ≠ 0 num add).
- `assembler.ts`: rótulos (inclusive vários por linha e em linha própria), comentários `#`, registradores `$8`/`$t0`/`$zero`, imediatos decimais/hex/binários com sinal, `lw $1, ($2)`, `nop`. O `beq` aceita rótulo (offset relativo a PC+4) ou número (offset em palavras). O `j` aceita rótulo ou endereço em bytes, e confere a região de PC+4[31:28]. Extensões só com `{ extensions: true }`. Limite de 32 instruções (memória de instruções do lab). Todos os erros vêm em português, com o número da linha e o formato esperado da instrução, e o montador junta todos de uma vez em vez de parar no primeiro.
- `disassembler.ts`: saída no formato do lab (`sw $8, 0($12)`), com registradores por número ou por nome. `0x00000000` vira `nop`. `jumpAddress` implementa `{PC+4[31:28], addr, 00}`.
- `verilog.ts`: `importVerilog` lê `memory[i] = 32'h…;` (também `'b` e `'d`, com sublinhados) e ignora o resto. `exportVerilog` gera o bloco no estilo do `MemoriaInstrucao.v`, com `// Endereço N: …` acima de cada linha.
- Testes (88 novos, 110 no total; `core/isa` com 100% de linhas):
  - Ida e volta de encode/decode para todas as 14 instruções.
  - `encode(decode(w)) == w` para 20 mil palavras aleatórias.
  - O programa padrão bate com o hex do golden trace nas duas grafias: números e rótulos/nomes.
  - O `MemoriaInstrucao.v` original é importado direto de `reference/`, e exportar seguido de importar devolve as mesmas palavras.

**Decisões**
- Operando numérico do `j` = endereço em bytes, do `beq` = offset em palavras (convenção do MARS). Anotado em `DUVIDAS.md` (item 6).

**Pendente**
- Nada da fase. O editor de programa (UI) é da Fase 3.

## Fase 2 — Simulador monociclo bit-exato — set/2026

**Pronto**
- `src/core/netlist.ts`: tipos da netlist declarativa (componentes com portas e dependências combinacionais por saída, fios com largura e categoria) e `validateNetlist`, que confere ids, portas, uma origem por entrada e ausência de laço combinacional. Também `evaluationOrder`: ordenação topológica que ignora entradas de borda, então a realimentação por PC, banco e memória não é laço.
- `src/core/mono/datapath.ts`: netlist completa do `processador.v`, com 25 componentes e 41 fios. Os ids batem com os nomes do golden trace (`rd1`, `alu_b`, `pcsrc`, `next_pc`…) e dos sinais (`RegDst`, `ALUSrc`…). Inclui `reset`, `reg_write_enable`/`mem_write_enable`, `overflow`, e cada componente guarda o nome da instância no Verilog.
- `src/core/mono/components/`:
  - `ula.v` bit a bit: muxB/Bnegate, ripple-carry com carry out, `slt = sinal XOR overflow`, `zero = NOR`, overflow só em add/sub, e códigos fora da tabela → 0.
  - `aluControl.v` pelas mesmas equações do Verilog (ALUOp 11 e funct desconhecido → 000).
  - `controle_principal.v` (don't cares = 0).
  - Memórias: PC[6:2]; `address[7:2]`, little-endian, MemRead = 0 → 0, bytes ≥ 64 descartados.
  - Somador, mux, shift left 2, concatenação do jump.
- `src/core/mono/step.ts`: `step(state, { reset }) → { next, snapshot }`, puro. Avalia genericamente a netlist em ordem topológica e depois aplica a borda de subida. O snapshot traz:
  - o valor de **todos** os 41 fios;
  - a instrução decodificada;
  - os sinais internos da ULA;
  - alertas;
  - as escritas da borda (antes → depois).

  O reset do PC é assíncrono (PC = 0 no mesmo ciclo), e o reset desabilita RegWrite e MemWrite. `run(state, n)` gera o histórico.
- Alertas (código + componente + valor; os textos ficam para `src/content` na Fase 3):
  - `opcode-desconhecido`
  - `funct-desconhecido` (inclui a palavra 0x00000000 depois do fim do programa)
  - `dmem-fora-da-memoria` (byte ≥ 64)
  - `dmem-endereco-alto` (≥ 256: só `address[7:2]` conta e o acesso dá a volta)
  - `dmem-desalinhado`
  - `pc-alem-da-imem` (PC ≥ 128 dá a volta)
- `src/core/mono/activity.ts`: algoritmo de atividade da Seção 6. Parte dos elementos escritos, anda para trás, segue só a entrada selecionada dos muxes e só lê a memória com MemRead = 1. Um sinal de controle está ativo se vale 1 ou seleciona um mux ativo.
- Testes (200 novos, 310 no total):
  - **Golden trace: 22 ciclos × todos os campos, verde.** Confirmado com mutações de propósito: `sub` trocado → 109 falhas; mux de desvio invertido → falha.
  - Tabelas 2.3 e 2.4 inteiras; todo opcode desconhecido zera o controle.
  - ULA com slt de sinais opostos (−2³¹ < 1), overflow e códigos inválidos.
  - Propriedades com fast-check (2 mil pares aleatórios): add/sub/and/or/slt/overflow/zero contra aritmética de referência.
  - Banco (`$0` imutável), memórias (little-endian, MemRead = 0, ≥ 64, ≥ 256, desalinhado, wrap do PC), reset, pureza do `step`, atividade para R/lw/sw/beq tomado e não tomado/j/reset, e validação da netlist.
- Cobertura: `core/mono` com 100% das linhas e 98% das instruções. Limite de 95% fixado no `vite.config.ts`.
- Dependência nova (só dev): `fast-check`, pedida na Seção 8 do plano. Não entra no bundle.

**Decisões**
- Avaliador genérico sobre a netlist, em vez de um `step` escrito à mão: M2 (construção), M5 (timing) e M8 (extensões) poderão alterar a netlist sem reescrever o simulador, e a injeção de falhas (Fase 4) vira "sobrescrever o valor de um fio".
- Byte fora dos 64 lê 0 (no Verilog seria X), sempre com alerta.
- O "reset" do `step` é o KEY0 da placa: só zera o PC. Registradores e memória não são reiniciados; recarregar o estado inicial é papel da UI.

**Pendente**
- Nada do aceite da fase. Textos dos alertas em pt-BR: Fase 3 (`src/content`). Latch de bypass do `BancoReg.v` na simulação Verilog: `DUVIDAS.md` item 7, para a Fase 10.
