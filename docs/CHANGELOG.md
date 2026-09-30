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

## Reorientação para a teoria (plano v2) — set/2026

A ferramenta passa a ser **apoio à disciplina teórica AOC1**. A fonte da verdade deixa de ser o Verilog da Prática 10 e passa a ser os slides das Aulas 04/06/07 (e o P&H cap. 4).

**Achados nos slides que mudaram o plano**
- O controle da ULA do slide tem **3 bits** (Aula 06, p. 27), igual ao do lab. A "diferença 3 × 4 bits" da v1 estava errada (4 bits é o do livro, por causa do NOR).
- No slide, `j 96` usa o **valor do campo** (p. 41). O montador trocou a convenção do MARS (endereço em bytes) pela do slide.
- O subconjunto da aula é add/sub/and/or/slt/lw/sw/beq + j (p. 11 e 48). addi não aparece, mas por decisão do projeto entra nas tabelas e no quiz como as demais (`DUVIDAS.md` item 4).
- A tabela de controle do slide tem X nos don't cares (p. 34). O simulador usa 0 por baixo, e `DONT_CARES` diz quais são X.

**Removido**
- M7 (placa DE10-Lite) e as Fases 5 e 10 (placa e verificação cruzada com o Verilog), com os prompts. `src/core/board` e `src/ui/board`.
- Import/export do bloco `memory[i] = 32'h…;` (`src/core/isa/verilog.ts` e testes).
- Da netlist: reset, portas `RegWrite & ~reset`/`MemWrite & ~reset` e o fio `overflow`. O overflow continua nos sinais internos da ULA, para o painel.
- Esquisitices do hardware do lab: memória de dados de 64 bytes endereçada por `address[7:2]` (dando a volta em 256), memória de instruções de 32 palavras dando a volta em 128, e os alertas correspondentes.

**Mudado**
- Memórias simuladas: instruções com 64 palavras, dados com 256 bytes (little-endian), ambas a partir de 0. Alertas: `dmem-fora-da-memoria`, `dmem-desalinhado`, `pc-fora-da-imem` (lê 0x00000000), `opcode-desconhecido`, `funct-desconhecido`.
- `InstructionSpec.hardware` virou `base` (instrução do datapath da aula). `PRATICA10_*` virou `EXEMPLO_*`. As mensagens do montador falam do "datapath da aula".
- CLAUDE.md (regras 1, 6 e 7 e o resumo), PLANO.md (v2: Seção 2 reescrita a partir dos slides, com a página de cada tabela; matriz sem M7; testes e fases), DUVIDAS.md (saíram as dúvidas só do lab; entraram a linha do `j`, o addi e o endereço inicial 0 × 0x00400000), README.

**Mantido**
- Golden trace como teste de regressão obrigatório: o programa de exemplo dá o mesmo resultado no datapath da aula, **22/22 ciclos verdes** depois da mudança.
- Netlist, avaliador genérico, atividade, ULA (slt com overflow), controles e testes de propriedade.
- `reference/pratica10/` e `tools/golden/` ficam só como registro de onde veio o golden trace.

**Pendente**
- Confirmar com a professora os itens 3–5 do `DUVIDAS.md`.

## Fase 3 — Datapath SVG + Modo Execução (M1) — set/2026

**Pronto**
- **Datapath em SVG** com o layout do slide (Aula 06 p. 48 / Aula 07 slide 8; P&H fig. 4.24). Coordenadas em `src/ui/datapath/monoLayout.ts`, com os **mesmos ids de fio e de bloco da netlist**. Um teste garante que todo fio e todo bloco da netlist têm desenho e texto, que tudo cabe no viewBox e que não há segmento diagonal. Rótulos da figura: "Instruction [25–21]", "Read data 1", "Sign extend", "16/32", "26/28"…
- **Componentes SVG**: `Wire` (espessura pela largura, cor pela categoria, junções, etiqueta de valor, tooltip com dec, dec com sinal, hex e bin) e `Block` (retângulo, elipse, ULA/somador, AND, mux com a **chave desenhada na entrada selecionada**, barramento clicável dos campos). Blocos de controle em vermelho, como no slide.
- **Modo Execução (M1)** em `#/m1`:
  - Controles: passo, voltar (histórico completo), rodar/pausar com velocidade, reiniciar, ir ao ciclo N, breakpoint por endereço.
  - **Fases visuais** (busca → decodificação → execução → memória → escrita): o que ainda não chegou fica tracejado.
  - Fios que não influenciam o ciclo ficam esmaecidos (algoritmo de atividade da Fase 2).
  - Formato dec/hex. Dados de 32 bits em decimal saem com sinal; instrução sempre em hex; sinais de 2–3 bits em binário.
  - Instrução do ciclo com os campos coloridos como no slide (opcode, rs, rt, rd, shamt, funct/imediato).
- **Painéis**:
  - Registradores: lidos em azul, o que será escrito em laranja com "antigo → novo".
  - Memória de dados: palavra ou bytes little-endian, palavra acessada destacada.
  - Memória de instruções: PC atual e breakpoints.
  - Controle: 9 sinais + controle da ULA, com o selo "X no slide" nos don't cares e a explicação do slide em cada sinal.
  - Editor: Assembly + estado inicial (`$8 = 5`, `M[8] = 7`), 4 exemplos, erros em português com a linha, "Copiar link".
- **Clique num bloco** abre a explicação (`src/content/blocos.ts`): o que ele faz, se é combinacional ou sequencial, entradas e saídas com largura e valor, e a referência ao slide (aula e página). A ULA mostra também os sinais internos (Bnegate, overflow).
- **Link compartilhável**: programa + estado inicial no hash (`#/m1?p=…`, base64url). A barra de endereço sempre tem o link do programa carregado.
- **Atalhos**: `→` passo, `←` volta, `Espaço` rodar/pausar, `R` reiniciar, `H` hex/dec, `F` fases, `Esc` fecha a explicação.
- **Tema** claro/escuro/sistema (localStorage com try/catch). A página inicial abre o M1.
- **Alertas** do simulador com texto em português (`src/content/textos.ts`).
- **Testes**:
  - Unidade: store (passo/voltar/fases/ir para/erros), parser do estado inicial, link, layout × netlist. Total de 312.
  - e2e (8): 5 passos do programa de exemplo conferidos na tela contra o golden trace; valores e escrita pendente no lw; todos os atalhos; Rodar com breakpoint; explicação do bloco; editor com erro, programa novo e link aberto numa aba nova; tema escuro; página inicial.
- Conferido visualmente (capturas de tela) no claro, no escuro, em fases e em 390 px: sem rolagem horizontal da página, e o datapath rola dentro do quadro.
- Bundle: 67 kB gzip.

**Pendente / fora desta fase**
- Botão "Prever" (princípio 1 do plano) e atalho `P`: não estavam no prompt da Fase 3. Ficam para a Fase 4, junto com o quiz, ou para a Fase 9.
- Atalhos `1..9` para trocar de módulo: só existe o M1 por enquanto.
- Narração textual por ciclo e Modo Aula: Fase 9.

## M1: "Explorar instrução" — set/2026

Pedido da monitoria: algo mais interativo, em que o aluno coloca **qualquer instrução** e vê o datapath dela, sem precisar montar um programa.

**Pronto**
- Nova tela padrão do M1 (`#/m1`, `src/ui/modes/explorar/`). O "programa passo a passo" virou a segunda aba (`#/m1/programa`); links antigos `#/m1?p=` continuam abrindo o programa.
- **Campo de instrução ao vivo**: Assembly ou hex, monta a cada tecla. Erros em português, com dica quando o aluno tenta usar rótulo, e a última instrução válida continua na tela. Botões de atalho para as 10 instruções da aula.
- **Valores editáveis** só do que a instrução usa: PC, `$rs`, `$rt`; no lw, `M[endereço]`. Campos para `$0` não aparecem. Aceita decimal com sinal, 0x… e 0b…. Valores padrão: `$n = 4n` e `M[a] = 1000 + a`, pequenos e alinhados, para os números nos fios serem fáceis de seguir.
- **"O que acontece"** (`src/content/narracao.ts`): 5 etapas geradas a partir do snapshot, com os valores reais. Exemplos: "A ULA soma a base e o deslocamento: 68 + 8 = 76", "Branch · Zero = 1: o desvio é tomado", "o banco sempre lê os dois, mas aqui o Read data 2 não é usado". Clicar numa etapa, ou usar `←`/`→`, mostra o datapath só até ali; `Esc` volta ao ciclo inteiro.
- **Resultado da borda** (`$8 ← 1076`, `M[76] ← 32`, `PC ← 16`), tabela de sinais, clique no bloco para a explicação, hex/dec, tema.
- Link compartilhável da instrução: `#/m1?i=lw%20$8,%208($17)`.
- Testes: 9 de unidade (leitura da instrução, valores, montagem do estado, narração de R/lw/sw/beq/j/addi/slt/$0/opcode desconhecido) e 6 e2e (caminho muda ao digitar, valores mudam fios, explicação e resultado, beq tomado × não tomado, etapas, erro e hex, link). Total: 321 de unidade e 14 e2e.
- Conferido em capturas de tela no claro, no escuro e em 390 px.

## Fase 4 — Controle, Quiz e injeção de falhas (M3) + Codificação (M4) — set/2026

**Pronto**
- **Core**
  - `step(state, { overrides })`: sobrescritas de fio aplicadas logo depois de o componente calcular, antes de o valor seguir adiante. O sinal falho propaga pelo datapath e chega à borda.
  - `core/faults`:
    - falhas stuck-at (0/1; ALUOp 00–11) e invertido, em qualquer sinal do controle e no Zero;
    - `compare` roda a execução certa e a falha e devolve as diferenças (registrador, memória, PC);
    - `runFaultCases` roda 11 casos (add, sub, and, or, slt, addi, lw, sw, beq tomado/não tomado, j) com valores escolhidos para os erros não passarem despercebidos por coincidência.
  - `exploreState` (estado para ver uma instrução) foi para o core e é usado pelo Explorar, pelo quiz e pelas falhas.
- **M3 — Controle** (`#/m3`, `#/m3/tabelas`, `#/m3/falhas`)
  - **Quiz de sinais** ("Qual é o caminho de dados da instrução?", Aula 06 p. 36–39):
    - instrução aleatória, digitada ou vinda do Explorar;
    - campos coloridos; 0/1/X para cada um dos 9 sinais;
    - X aceito nos don't cares, com explicação ("RegWrite = 0, nada é escrito no banco");
    - cada sinal errado vem com a consequência simulada ("Com RegDst = 0: escreveria em $18 em vez de $8"), ou o aviso de que por acaso não muda nada nesta instrução;
    - datapath "com os seus sinais" × "com os sinais certos", com os sinais errados destacados;
    - placar da sessão e "Mostrar resposta".
  - **Tabelas**: controle principal (R, addi, lw, sw, beq, j, com X) e controle da ULA (3 bits), com a linha da instrução acesa e a nota dos nomes em português do slide (MemparaReg, EscreveReg…).
  - **E se? (falhas)**: escolha do sinal e do valor travado (ou invertido). A pergunta aparece no formato da prova ("O que acontece se o sinal MemtoReg ficar preso em 1?") com o resumo "passam a falhar / continuam certas". A tabela mostra, por instrução, o que deveria acontecer e o que acontece com a falha. Clicar numa linha mostra o datapath desse caso, com o fio travado destacado.
- **M4 — Codificação** (`#/m4`)
  - Instrução em Assembly, hex ou binário (32 dígitos, com espaços).
  - 32 bits coloridos por campo (cores do slide), com índices dos bits, valor decimal de cada campo (imediato com sinal) e a conversão binário → hex de 4 em 4 bits.
  - **Decodificação passo a passo** pelo método da lista: opcode → se 000000, o funct decide → os outros campos → Assembly.
  - Passar o mouse num campo (ou num passo) destaca no datapath os fios que ele alimenta.
  - **Calculadoras** de desvio (PC + 4 + ext(imm) × 4) e de salto ({PC+4[31–28], campo, 00}), feitas com os próprios blocos do simulador, com o botão **"Exemplo do slide"** (Aula 06 p. 45: PC + 4 = 0x00400010, campo 1 → 0x00000004).
- **Ligações**: a página inicial abre M1, M3 e M4. O Explorar tem os links "quiz desta instrução" e "ver a codificação", e todas as telas aceitam `?i=<instrução>` no link.
- O campo de instrução passou a aceitar binário e a recusar, pelo hex/binário, instruções de extensão (jr, bne…). Antes elas só eram recusadas pelo Assembly.
- **Testes**:
  - Unidade (348): falhas com as respostas das perguntas de prova calculadas à mão (MemtoReg em 1, RegDst em 0/1, ALUSrc em 0/1, Branch, Zero invertido, Jump, RegWrite, MemRead, MemWrite, ALUOp); textos das diferenças; decodificação passo a passo; correção do quiz (inclusive o exemplo do slide: add → 1 0 0 0 10 0 0 1); gerador aleatório.
  - e2e (23): quiz certo, errado (com consequência e datapath), com X e com "mostrar resposta"; tabelas; "e se?"; codificação (hex, binário, destaque de fio, calculadoras com o exemplo do slide).
- Conferido em capturas de tela. As 5 telas cabem em 390 px sem rolagem horizontal da página.
- Bundle: 79 kB gzip.

**Achados durante os testes**
- Ao calcular à mão as respostas das falhas, três previsões minhas saíram erradas e o simulador estava certo. Com ALUSrc preso em 1, o slt 5 < 16426 dá 1 por coincidência. Com MemWrite preso em 1, o endereço −2 cai fora da memória. Com ALUOp preso em 10, o AND do beq não tomado segue ≠ 0. Os valores dos casos foram trocados para não haver coincidências, e isso vira material de aula: "nem toda falha aparece em todo teste".

**Pendente**
- Visão em portas (PLA) do controle, do slide "Solução em hardware de controle" (Aula 06, p. 35): o slide é só imagem, não deu para extrair as portas com fidelidade. Fica para a Fase 9, junto com a revisão de conteúdo.
- Injeção de falhas também no "Programa passo a passo" (rodar o programa inteiro com o sinal travado): o "E se?" já mostra por classe de instrução. Fica como ideia.

## v0.1 — versão inicial para a professora ver — set/2026

O projeto andou mais rápido que a validação. A v0.1 reduz o que está no ar a **uma tela só** e publica, para a professora reagir antes de qualquer módulo novo.

**No ar**
- **Tela única** (`src/ui/modes/explorar/`), sem página inicial e sem ids de módulo:
  - instrução ao vivo (Assembly, hex ou binário), com 10 exemplos em botões curtos (`add`, `lw`, `beq`, `j`…) que cabem numa linha;
  - valores editáveis só do que a instrução usa;
  - etapas: "Ciclo inteiro", ◀ ▶, as 5 etapas e **Animar** (percorre as etapas sozinho, 1,5 s cada, e para na escrita); a etapa atual aparece descrita logo abaixo do datapath;
  - auxiliares em abas: **O que acontece** (explicação + resultado da borda), **Sinais** (agora com o texto do slide de cada sinal visível, não só no tooltip) e **Bits** (campos, valores e decodificação passo a passo; o mouse num campo acende os fios dele);
  - clique num bloco para a explicação e a página do slide;
  - **ajuda de primeira visita** em 3 passos, dispensável, que reabre no "?" (localStorage com try/catch);
  - rodapé com os créditos e a versão.
- Link canônico `#/?i=<instrução>`. Links antigos `#/m1?i=` continuam valendo, e qualquer outro hash cai na tela.
- `index.html`: título e descrição novos, favicon e `theme-color`.
- O datapath cabe inteiro em 1920×1080 e em 1440×900. Em telas de 768 ou 720 px de altura é preciso rolar 60–70 px; preferi isso a encolher o texto do desenho.

**Fora do ar, guardado**
- Programa passo a passo, quiz, tabelas, falhas e codificação (`src/ui/modes/execucao|controle|codificacao`, `src/core/faults`). Compilam e os testes de unidade rodam. Os e2e foram para `e2e/fora-da-v0.1/` (ignorados pelo Playwright), com instruções para reativar.
- Saíram `src/content/modulos.ts` e `src/ui/ModoTabs.tsx` (só a página inicial e as abas de modo usavam).

**Repositório público**
- `docs/ref/` (slides da professora) e `reference/pratica10/` (Verilog da prática, que seria o gabarito do LAOC1) saíram do git e do histórico. Continuam na máquina, no `.gitignore`. Nenhum teste dependia deles.
- README reescrito para quem chega de fora.

**Processo**
- `docs/PLANO.md` ganhou a seção "Versão 0.1", com a regra de não construir módulo novo antes do retorno da professora.
- Novo `docs/REUNIAO.md`: o que mostrar em 5 minutos e o que perguntar.

**Corrigido no caminho**
- No painel Bits, o imediato de uma instrução tipo I acendia também o fio `Instruction [25–0]` (que é do jump). Agora o tipo I acende só `[15–0]` e o `j` só `[25–0]`. A tela de codificação (fora do ar) ainda tem esse defeito.

**Testes**: 348 de unidade, 11 e2e da tela única.
