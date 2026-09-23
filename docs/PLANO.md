# DATAPATH VIVO — Plano Mestre + Prompts para o Claude Code

**Ferramenta didática interativa do caminho de dados MIPS para AOC1 / LAOC1 — CEFET-MG**
Monitoria AOC · Prof.ª Poliana Corrêa · rascunho v1 (set/2026)

---

## 0. Como usar este documento

O repositório já está montado (pasta `datapathMonitoria`):

- `CLAUDE.md` na raiz: contexto permanente que o Claude Code lê em toda sessão.
- `docs/PLANO.md`: este plano. `docs/prompts/`: um arquivo por fase, com o prompt pronto.
- `docs/ref/`: PDFs das aulas 04, 06 e 07 e PNGs dos slides-chave (datapath monociclo, multiciclo, FSM, quiz de sinais).
- `reference/pratica10/`: Verilog da Prática 10 (fonte da verdade, somente leitura) e `reference/golden_trace_pratica10.json`.
- `docs/DUVIDAS.md`: pontos para confirmar com a professora. `docs/CHANGELOG.md`: registro por fase.

Para trabalhar: abra o Claude Code na pasta e execute as fases **uma de cada vez** (`docs/prompts/fase-00-*.md`, depois `fase-01`…). Não pule o critério de aceite de cada fase.

A regra de ouro do projeto: **o simulador tem que ser bit-exato com o processador que os alunos constroem no laboratório**, e cada tela tem que responder a uma pergunta que cai na prova da teoria.

---

## 1. Visão

Um site estático (roda no navegador, sem backend) onde o aluno **vê o processador monociclo da Prática 10 funcionando**: os fios acendem, os valores aparecem, os sinais de controle mudam a cada instrução, e ele pode prever, testar e errar. A mesma ferramenta cobre a teoria (aulas 04, 06 e 07) e o laboratório (Práticas 1 a 10), fechando a ponte "o que está no slide" ↔ "o que está na placa".

### Objetivos pedagógicos (o aluno, ao usar, consegue…)

| # | Objetivo | Aula de origem |
|---|---|---|
| O1 | Explicar o ciclo busca → decodificação → execução → memória → escrita e onde cada etapa acontece no hardware | Aula 06 (caminho de dados) |
| O2 | Montar o datapath incrementalmente: busca, tipo R, lw/sw, beq, j | Aula 06 + material extra (implementação monociclo) |
| O3 | Preencher a tabela de sinais de controle (RegDst, Branch, MemRead, MemtoReg, ALUOp, MemWrite, ALUSrc, RegWrite, Jump) para qualquer instrução do subconjunto | Aula 06 ("Qual é o caminho de dados da instrução?") |
| O4 | Derivar o controle da ULA a partir de ALUOp + funct | Aula 06 (Controle da ULA) |
| O5 | Calcular endereço de desvio (PC+4 + ext(imm)<<2) e de salto ({PC+4[31:28], addr26, 00}) | Aula 06 (inclusão do jump) |
| O6 | Distinguir elementos combinacionais e sequenciais; entender escrita na borda do clock | Aula 06 + Aula 07 (regime de clock) |
| O7 | Achar o caminho crítico e calcular o período mínimo de clock do monociclo | Aula 07 (Exemplos 1 e 2) |
| O8 | Comparar monociclo × multiciclo: CPI, tempo de ciclo, tempo de execução | Aula 07 (Exercícios 1 e 2, CPI gcc) |
| O9 | Explicar por que o monociclo precisa de duas memórias (Harvard) e o multiciclo usa uma só | Aula 04 (von Neumann × Harvard) + Aula 07 |
| O10 | Codificar/decodificar instruções R, I e J em binário/hex | Aula 03/Guia de revisão (formatos) |
| O11 | Propor as mudanças no datapath para adicionar uma instrução nova (bne, slti, jal, jr) | Aula 06 ("Novas instruções podem ser acrescentadas depois") |
| O12 | Prever o que a placa DE10-Lite vai mostrar na Prática 10 antes de gravar no FPGA | LAOC1 – Prática 10 |

### Não-objetivos (v1)

- Pipeline, hazards, forwarding, predição de desvio (é AOC2).
- Ponto flutuante, multiplicação/divisão, exceções/interrupções.
- Simulação em nível de porta lógica/tempo real de propagação (o modo Timing é uma abstração por blocos, como nos slides).
- Backend, login, banco de dados.

---

## 2. Fonte da verdade: o processador da Prática 10

> Tudo abaixo foi extraído dos arquivos Verilog da Prática 10 (`processador.v`, `controle_principal.v`, `aluControl.v`, `ula.v`, `BancoReg.v`, `MemoriaDados.v`, `MemoriaInstrucao.v`, `countPC.v`, `pratica10.v`). Onde o lab difere do Patterson & Hennessy (P&H) dos slides, a ferramenta **mostra o do lab por padrão** e explica a diferença.

### 2.1 Visão geral

- MIPS 32 bits, **monociclo**, **Harvard** (memória de instruções e memória de dados separadas).
- PC de 32 bits, reset assíncrono para `0x00000000`, atualizado na borda de subida.
- PC+4 e endereço de desvio calculados com **somador ripple-carry de 32 bits** (`fulladder32bits`, feito de `fulladder1bit`).
- Próximo PC: `MUX_BRANCH` (PC+4 × branch target, seleção `PCSrc = Branch & Zero`) seguido de `MUX_JUMP` (resultado × jump target, seleção `Jump`). **Jump tem prioridade.**
- Durante o reset: escrita no banco de registradores e na memória de dados desabilitadas (`RegWrite & ~reset`, `MemWrite & ~reset`).

### 2.2 Instruções suportadas pelo hardware do lab

| Instrução | Formato | opcode | funct | Semântica |
|---|---|---|---|---|
| `add rd, rs, rt` | R | 000000 | 100000 | rd ← rs + rt |
| `sub rd, rs, rt` | R | 000000 | 100010 | rd ← rs − rt |
| `and rd, rs, rt` | R | 000000 | 100100 | rd ← rs & rt |
| `or rd, rs, rt` | R | 000000 | 100101 | rd ← rs \| rt |
| `slt rd, rs, rt` | R | 000000 | 101010 | rd ← (rs < rt) com sinal |
| `addi rt, rs, imm` | I | 001000 | — | rt ← rs + ext(imm) |
| `lw rt, imm(rs)` | I | 100011 | — | rt ← M[rs + ext(imm)] |
| `sw rt, imm(rs)` | I | 101011 | — | M[rs + ext(imm)] ← rt |
| `beq rs, rt, imm` | I | 000100 | — | se rs == rt: PC ← PC+4 + ext(imm)<<2 |
| `j addr` | J | 000010 | — | PC ← {PC+4[31:28], addr, 00} |

Opcode não reconhecido → todos os sinais em 0 (comporta-se como NOP que avança PC+4). A ferramenta deve **avisar** quando isso acontece ("opcode desconhecido — o controle zerou tudo").

Não suportadas pelo hardware (mas estão no subconjunto de Assembly de AOC1): `bne`, `slti`, `jal`, `jr`. Viram o **Laboratório de Extensão** (Seção 5, módulo M8).

### 2.3 Unidade de controle principal (`controle_principal.v`)

| Instrução | RegDst | ALUSrc | MemtoReg | RegWrite | MemRead | MemWrite | Branch | Jump | ALUOp |
|---|---|---|---|---|---|---|---|---|---|
| Tipo R | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 10 |
| addi | 0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 00 |
| lw | 0 | 1 | 1 | 1 | 1 | 0 | 0 | 0 | 00 |
| sw | 0\* | 1 | 0\* | 0 | 0 | 1 | 0 | 0 | 00 |
| beq | 0\* | 0 | 0\* | 0 | 0 | 0 | 1 | 0 | 01 |
| j | 0\* | 0\* | 0\* | 0 | 0 | 0 | 0 | 1 | 00 |

\* No slide esses campos são **X (don't care)**; no Verilog do lab eles saem **0** (valor padrão). A ferramenta mostra o valor real (0) com um marcador "X no slide" e, no modo Quiz, aceita tanto X quanto 0 nesses campos, explicando por quê.

### 2.4 Controle da ULA (`aluControl.v`) — 3 bits no lab × 4 bits no slide

| ALUOp | funct | Operação | `alu_op` (lab, 3 bits) | ALU control (slide/P&H, 4 bits) |
|---|---|---|---|---|
| 00 | XXXXXX | add (lw, sw, addi) | 010 | 0010 |
| 01 | XXXXXX | sub (beq) | 110 | 0110 |
| 10 | 100000 | add | 010 | 0010 |
| 10 | 100010 | sub | 110 | 0110 |
| 10 | 100100 | and | 000 | 0000 |
| 10 | 100101 | or | 001 | 0001 |
| 10 | 101010 | slt | 111 | 0111 |

Ponte didática: o código de 3 bits do lab é exatamente os 3 bits menos significativos do código de 4 bits do P&H — o bit que falta é o **Ainvert**, usado só pelo NOR, que o lab não implementa. O bit 2 é o **Bnegate** (inverte B e entra como carry-in → subtração em complemento de 2).

Observação: com ALUOp = 10 e funct desconhecido, todas as saídas ficam 0 → `alu_op = 000` (AND). A ferramenta avisa.

### 2.5 ULA (`ula.v`)

- `muxB`: se `op[2]=1`, usa `~b`; senão `b`.
- Somador ripple-carry: `a + muxB(b) + op[2]` → soma ou subtração.
- AND e OR bit a bit (sobre `b` original).
- SLT: `resSLT = sinal(a−b) XOR overflow` — **versão correta com overflow** (melhor que a versão ingênua "pega o bit de sinal"). Excelente ponto para mostrar: `slt` com −2³¹ e 1.
- `resMux` seleciona o resultado pelo código de 3 bits.
- `zero = ~|resultado` (NOR de todos os bits do resultado).
- `overflow` só vale em add/sub; é calculado, mas **não é usado** pelo processador (não há exceção). A ferramenta mostra o flag, com a nota "no MIPS real, add geraria exceção; addu não".

### 2.6 Banco de registradores (`BancoReg.v`)

- 32 × 32 bits; leitura **combinacional** de 2 registradores (rs, rt); escrita **síncrona** na borda de subida se `RegWrite` e `WriteReg ≠ 0`.
- `$0` lido sempre como 0 (hardwired).
- Tem um "bypass" de leitura com latch do último write; semanticamente, no monociclo, isso não muda nenhum valor observável. A ferramenta modela: leitura combinacional, escrita na borda. (Mencionar numa nota de "detalhes de implementação" do painel do componente.)
- Valores iniciais: `$8 = 5`, `$9 = 5`, `$10 = 1`, `$12 = 4`, demais 0.

### 2.7 Memórias

**Memória de instruções (`MemoriaInstrucao.v`)**

- 32 palavras de 32 bits, endereçada por `PC[6:2]`, leitura combinacional, `memRead` sempre 1.
- Consequência: o PC "dá a volta" a cada 128 bytes (PC = 128 lê a mesma palavra que PC = 0). A ferramenta mostra isso ao passar do fim.

**Memória de dados (`MemoriaDados.v`)**

- 64 bytes (8 bits por posição), palavras de 32 bits **little-endian** (byte 0 = LSB).
- Endereço de palavra = `address[7:2]`; os 2 bits menos significativos são ignorados (acesso sempre alinhado — boa hora de relembrar a restrição de alinhamento).
- Leitura combinacional quando `MemRead = 1`; senão a saída é **0**.
- Escrita síncrona na borda de subida quando `MemWrite = 1`.
- Valores iniciais: palavra em 0 = 5, palavra em 4 = 0, palavra em 8 = 7.

⚠️ **Achado para conferir no Verilog**: `word_addr` usa `address[7:2]` (6 bits → até 64 palavras = 256 bytes), mas o array só tem 64 bytes. Endereços ≥ 64 indexam fora do array (no Verilog: leitura dá X, escrita é ignorada). O comentário do código fala em "64 bytes (16 palavras)", o que corresponderia a `address[5:2]`. A ferramenta deve **modelar 64 bytes e mostrar um alerta vermelho** para acesso ≥ 64 ("fora da memória: no FPGA isso lê lixo/X").

### 2.8 Programa padrão da Prática 10 e trace dourado

| Endereço | Hex | Assembly | Comentário |
|---|---|---|---|
| 0 | `0x11090001` | `beq $8, $9, 1` | se $8 == $9, pula o addi |
| 4 | `0x21080002` | `addi $8, $8, 2` | |
| 8 | `0xAD880000` | `sw $8, 0($12)` | M[4] ← $8 |
| 12 | `0x8D900000` | `lw $16, 0($12)` | $16 ← M[4] |
| 16 | `0x020A4022` | `sub $8, $16, $10` | $8 ← $16 − 1 |
| 20 | `0x08000000` | `j 0` | volta ao início |

Trace (valores do ciclo; estado "depois" = após a borda):

| Ciclo | PC | Instrução | ULA | Zero | Escreve | Próx. PC | $8 depois | M[4] depois |
|---|---|---|---|---|---|---|---|---|
| 1 | 0 | beq $8,$9,1 | 5−5=0 | 1 | — | 8 (desvio tomado) | 5 | 0 |
| 2 | 8 | sw $8,0($12) | 4+0=4 | 0 | M[4]←5 | 12 | 5 | 5 |
| 3 | 12 | lw $16,0($12) | 4 | 0 | $16←5 | 16 | 5 | 5 |
| 4 | 16 | sub $8,$16,$10 | 5−1=4 | 0 | $8←4 | 20 | 4 | 5 |
| 5 | 20 | j 0 | (0+0=0, ignorado) | 1 | — | 0 | 4 | 5 |
| 6 | 0 | beq $8,$9,1 | 4−5=−1 | 0 | — | 4 (não tomado) | 4 | 5 |
| 7 | 4 | addi $8,$8,2 | 4+2=6 | 0 | $8←6 | 8 | 6 | 5 |
| 8 | 8 | sw | 4 | 0 | M[4]←6 | 12 | 6 | 6 |
| 9 | 12 | lw | 4 | 0 | $16←6 | 16 | 6 | 6 |
| 10 | 16 | sub | 6−1=5 | 0 | $8←5 | 20 | 5 | 6 |
| 11 | 20 | j 0 | — | 1 | — | 0 | 5 | 6 |
| 12 | 0 | beq (tomado de novo) | 0 | 1 | — | 8 | 5 | 6 |

O programa entra num ciclo de período 11 (caminho "tomado" com 5 instruções + caminho "não tomado" com 6). O arquivo `golden_trace_pratica10.json` traz 22 ciclos com **todos** os fios (rd1, rd2, imm_ext, alu_b, alu_result, zero, pcsrc, mem_read_data, write_reg, write_data, pc_plus_4, branch_target, jump_target, next_pc e sinais de controle). Ele é o **teste de regressão nº 1** do simulador.

Pegadinha boa para aula: no `j` (ciclo 5), a ULA calcula `$0 + $0 = 0` e o Zero vai a 1 — mas como Branch = 0, nada acontece. "A ULA sempre calcula alguma coisa; o controle decide se isso importa."

### 2.9 Placa DE10-Lite (`pratica10.v`)

A ferramenta terá uma **placa virtual** que replica exatamente o top-level:

- **Clock**: `SW[9]` = 0 → lento (~1 Hz), 1 → rápido (~10 Hz). `SW[8]` = 1 → modo passo a passo (`KEY[1]`, borda de descida). `KEY[0]` = reset (ativo em baixo).
- **LEDs**: LEDR9 clock · LEDR8 reset · LEDR7 PCSrc (desvio tomado) · LEDR6 Zero · LEDR5 RegWrite · LEDR4 MemRead · LEDR3 MemWrite · LEDR2 Branch · LEDR1 ALUSrc · LEDR0 MemtoReg.
- **Displays HEX5..HEX0** (6 dígitos hex, 7 segmentos ativos em baixo), selecionados por `SW[7:6]` (modo) e `SW[5:4]` (detalhe):

| SW[7:6] | SW[5:4] | O que aparece (HEX5 → HEX0) |
|---|---|---|
| 00 | 00 | PC[7:0] · Instr[15:0] |
| 00 | 01 | PC[11:0] · (PC+4)[11:0] |
| 00 | 10 | PC[11:0] · BranchTarget[11:0] |
| 00 | 11 | {opcode, funct, imm_ext[11:0]} (24 bits concatenados) |
| 01 | 00 | rd1[11:0] · rd2[11:0] |
| 01 | 01 | rd1[23:0] |
| 01 | 10 | rd2[23:0] |
| 01 | 11 | imm_ext[23:0] |
| 10 | 00 | alu_result[23:0] |
| 10 | 01 | alu_result[15:0] · {0,alu_op} · {000,zero} |
| 10 | 10 | mem_read_data[23:0] |
| 10 | 11 | rd1[11:0] · rd2[11:0] |
| 11 | 00 | $8[11:0] · $11[11:0] |
| 11 | 01 | $8[7:0] · $9[7:0] · $10[7:0] |
| 11 | 10 | $8[23:0] |
| 11 | 11 | $8[3:0] · $9[3:0] · $10[3:0] · $11[3:0] · PC[7:0] |

Os segmentos devem ser desenhados a partir da tabela do `decodificador.v` (ativo em baixo), para que o aluno reconheça o padrão da placa real (ex.: "b" minúsculo e "d" minúsculo).

---

## 3. Matriz conteúdo × funcionalidade

| Conteúdo (aula) | M1 Execução | M2 Construção | M3 Controle/Quiz | M4 Codificação | M5 Timing | M6 Multiciclo | M7 Placa | M8 Extensão | M9 Exercícios |
|---|---|---|---|---|---|---|---|---|---|
| Ciclo de instrução (06) | ●●● | ●● | | | | ●● | | | ● |
| Blocos combinacionais × sequenciais (06/07) | ●● | ●●● | | | ●● | ● | | | ● |
| Banco de registradores (06) | ●●● | ●● | | | | | ● | | ● |
| Controle principal (06) | ●● | ● | ●●● | | | | ●● | ●● | ●●● |
| Controle da ULA / ALUOp (06) | ●● | ● | ●●● | ● | | | ● | | ●● |
| beq / jump / cálculo de endereço (06) | ●●● | ●● | ●● | ●● | | | ● | ●● | ●●● |
| Formatos R/I/J (03) | ● | | ● | ●●● | | | | | ●● |
| Monociclo: caminho crítico, período (07) | | | | | ●●● | | | | ●●● |
| Multiciclo: IR/MDR/A/B/ALUOut, FSM, CPI (07) | | | | | ●● | ●●● | | | ●●● |
| Harvard × von Neumann (04) | ● | ●● | | | | ●● | | | ● |
| RISC: regularidade, instrução de tamanho fixo (04) | | | | ●● | | | | ●● | ● |
| Lab Práticas 1–10 | ●● | ●●● | | ● | | | ●●● | ●● | |

---

## 4. Princípios de design didático

1. **Prever antes de ver.** Todo modo tem um botão "Prever" que esconde os valores do próximo ciclo e pede ao aluno que chute (próximo PC, valor escrito, sinais). Depois revela e compara. Aprender é errar a previsão.
2. **Uma coisa de cada vez.** Fios inativos ficam esmaecidos; o que não influencia o resultado desta instrução não compete pela atenção.
3. **Sempre três representações.** Todo valor pode ser visto em decimal com sinal, hex e binário (com os campos da instrução coloridos como no slide: opcode vermelho, rs azul, rt verde, rd amarelo, shamt branco, funct vermelho).
4. **O vocabulário é o da aula.** Nomes dos sinais e blocos exatamente como no slide/Verilog (RegDst, ALUSrc, "Memória de Instruções", "Banco de Registradores", "Extensão de Sinal", "Shift left 2"). Interface em português; termos técnicos em inglês quando é assim que aparecem no slide.
5. **Nada é mágico.** Clicar em qualquer bloco abre um painel com: o que ele faz, entradas/saídas com largura em bits, valor atual, e o trecho de Verilog correspondente da Prática 10.
6. **Fiel ao lab, honesto com o livro.** Quando lab e P&H diferem, mostrar o lab e um selo "no livro/slide é assim…".
7. **Funciona no projetor.** Modo Aula com fonte grande, alto contraste, só o datapath e os controles de passo.

---

## 5. Módulos (funcionalidades)

### M1 — Execução passo a passo (o coração)

- Datapath monociclo completo em SVG, com o layout clássico do slide (PC à esquerda, memória de instruções, banco de registradores ao centro, ULA, memória de dados, mux de write-back à direita, controle em cima com linhas de controle em vermelho/azul).
- Controles: Reset · Passo (1 ciclo) · Voltar (1 ciclo — histórico completo de estados) · Rodar (velocidade ajustável) · Pausar · Ir para ciclo N · Breakpoint por PC.
- Animação do ciclo em **fases visuais** dentro do mesmo ciclo (é só visual; a semântica continua monociclo): 1) busca, 2) decodificação/leitura de registradores, 3) execução na ULA, 4) acesso à memória, 5) write-back + borda do clock (PC e registradores atualizam). O aluno pode desligar as fases e ver tudo de uma vez.
- Fios ativos acendem com a cor da categoria (dados, endereço, controle); valores aparecem em "etiquetas" sobre os fios (hover mostra dec/hex/bin).
- Muxes mostram visualmente qual entrada está selecionada (uma "chave" desenhada dentro do mux).
- Painéis laterais: banco de registradores (32, com nomes `$t0`/número, destacando lidos em azul e o escrito em laranja, com animação de "valor antigo → novo"), memória de dados (visão por palavra e por byte, little-endian explícito), memória de instruções (com PC atual, disassembly e hex), sinais de controle (tabela viva).
- Editor de programa: Assembly com montador embutido (só as 10 instruções do hardware + rótulos + comentários; erros em português com linha e explicação). Carregar também por lista de hex.
- **Importar do Verilog**: colar o bloco `memory[i] = 32'h...;` de `MemoriaInstrucao.v` e carregar direto. **Exportar para o Verilog**: gerar o bloco `initial` pronto para colar no Quartus, com o assembly em comentário (como o aluno já faz na Prática 10).
- Estado inicial editável (registradores e memória), com preset "Prática 10".
- URL compartilhável: programa + estado inicial codificados no hash da URL (a professora manda o link de um exercício).

Critério de aceite: rodando o preset Prática 10, **todos os 22 ciclos batem campo a campo com `golden_trace_pratica10.json`**.

### M2 — Modo Construção (monte o datapath como na aula)

Sequência guiada que espelha o material "Implementação Monociclo" e as Práticas do lab:

1. Busca: PC + memória de instruções + somador PC+4.
2. Tipo R: banco de registradores + ULA (sinais RegWrite, ALU control).
3. lw/sw: extensão de sinal, memória de dados, mux ALUSrc, mux MemtoReg.
4. RegDst: mux rt/rd.
5. beq: shift left 2, somador de desvio, AND Branch·Zero, mux PCSrc.
6. j: concatenação {PC+4[31:28], addr, 00} e mux Jump.
7. Unidade de controle + controle da ULA.

Em cada etapa: só os blocos já "construídos" existem; o aluno tenta rodar uma instrução que ainda não é suportada e **vê por que ela falha** (ex.: sem o mux ALUSrc, lw soma o registrador errado). Etapas com "desafio": arrastar o fio certo para a entrada certa (validação por conexão, não por pixel). Cada etapa mostra "isso é a Prática X do lab" quando fizer sentido.

### M3 — Controle e Quiz de sinais

- Réplica interativa do slide "Qual é o caminho de dados da instrução?": aparece uma instrução (com os campos coloridos), o aluno preenche RegDst, Branch, MemRead, MemtoReg, ALUOp, MemWrite, ALUSrc, RegWrite (e Jump). Aceitar X onde é don't care. Feedback: ao errar um sinal, o datapath mostra **o que aconteceria** com aquele valor errado (ex.: "com RegDst=0 o add escreveria em $17 em vez de $8").
- Visão "tabela verdade": a tabela do controle principal e do controle da ULA, com a linha da instrução atual acesa; opção de ver a implementação em portas (PLA) do controle, como no slide "Solução em hardware de controle".
- **Injeção de falhas ("e se?")**: travar qualquer sinal de controle em 0 ou 1 (stuck-at), ou inverter o Zero, e rodar o programa. Ótimo para as perguntas de prova do tipo "o que acontece se o sinal MemtoReg ficar preso em 1?". Mostrar quais instruções passam a falhar e por quê.

### M4 — Codificação (montador visual)

- Digitar uma instrução → ver os 32 bits divididos em campos (cores do slide), formato R/I/J, valores decimais de cada campo, e o hex.
- Caminho inverso: digitar hex/binário → decodificar passo a passo (1. olhe o opcode; 2. se 000000, é R e o funct decide; …), igual ao método da Questão 10 da lista.
- Ligação com o datapath: passar o mouse num campo destaca os fios que ele alimenta (`Instruction[25-21]` → Read register 1, etc.).
- Calculadora de desvio/salto: dado PC e imediato, mostra PC+4, extensão de sinal, shift, soma; para o `j`, a concatenação com o exemplo numérico do slide (PC+4 = 0x00400010, addr = 1 → destino 0x00000004).

### M5 — Timing e caminho crítico (monociclo)

- Cada bloco tem latência configurável (memória, banco de registradores leitura/escrita, ULA, somadores, muxes, extensão de sinal, controle — os "desprezíveis" começam em 0).
- Para a instrução selecionada, calcula o tempo de chegada em cada fio (percorrendo o grafo combinacional só pelos caminhos ativos) e **destaca o caminho crítico** no datapath com a soma ao lado.
- Tabela por classe (R, lw, sw, beq, j) → período mínimo do monociclo = máximo. Barra "tempo desperdiçado" por classe (período − tempo real da instrução), ilustrando "viola o caso comum veloz".
- Presets: **Exemplo 1 da Aula 07** (memórias 4 ns, ULA 2, registradores 1, somadores 1 → 12 ns, ~83 MHz) e **Exercício 1 da Aula 07** (R 6 ns, lw 8, sw 7, beq 5, j 4).
- Dois modos de cálculo, lado a lado: **"por etapas" (como o slide)** — soma das colunas da tabela (Mem. Instr., Leitura Reg., ULA, Mem. Dados, Escrita Reg.) — e **"pelo grafo"** — tempos de chegada reais no datapath, com blocos em paralelo (ex.: o somador PC+4 trabalha junto com a memória de instruções).
- ⚠️ Os dois modos discordam no `j`: a tabela do Exercício 1 soma 2 ns de "Operação UAL" (total 4 ns), mas no datapath do lab o jump não passa pela ULA — pelo grafo ele custa só a memória de instruções (2 ns). Mostrar essa diferença é um bom gancho de discussão; conferir com a professora qual leitura ela espera na prova.
- Critério de aceite: no modo "por etapas", os dois presets reproduzem exatamente os números dos slides; no modo "pelo grafo", o Exemplo 1 dá 12 ns para o lw.

### M6 — Multiciclo

- Segundo datapath (o do slide 16 da Aula 07): **memória única**, IR, MDR, A, B, ALUOut, mux IorD, ALUSrcA, ALUSrcB (4 entradas: B, 4, ext(imm), ext(imm)<<2), PCSource, PCWrite/PCWriteCond.
- FSM de controle desenhada ao lado (estados 0 busca, 1 decodificação, 2 cálculo de endereço, 3 leitura de memória, 4 write-back do lw, 5 escrita de memória, 6 execução R, 7 conclusão R, 8 conclusão do beq, 9 conclusão do j), com o estado atual aceso e a transição animada.
- Passo por **ciclo** (não por instrução), com RTL do passo exibida (`IR = Memory[PC]; PC = PC + 4;` etc., exatamente como no slide).
- Mesmo programa rodando lado a lado: monociclo × multiciclo, com contadores de ciclos, período de clock e tempo total — é o Exercício 1/2 da Aula 07 ao vivo.
- Mostrar a microprogramação como visão alternativa da mesma FSM (tabela de microinstruções).

⚠️ **Conferir com a professora**: os slides usam **jump = 2 ciclos** (exemplo de CPI gcc e Exercício 2), enquanto a FSM do P&H usa 3 (busca, decodificação, conclusão). A ferramenta deve deixar o número de ciclos por classe **configurável**, com preset "Slides AOC1" (lw 5, sw 4, R 4, beq 3, j 2) e preset "FSM P&H" (j 3), explicando a diferença.

### M7 — Placa virtual DE10-Lite

- Desenho da placa com 10 chaves, 2 botões, 10 LEDs e 6 displays de 7 segmentos, funcionando exatamente como `pratica10.v` (Seção 2.9).
- Sincronizada com o M1: o que acontece no datapath aparece na placa, e vice-versa (apertar KEY1 no modo passo = dar um passo).
- Desafio "leia a placa": mostrar só a placa com uma configuração de chaves e pedir que o aluno diga o valor de algum fio/registrador. Treina a leitura que eles precisam fazer na apresentação da prática.

### M8 — Laboratório de Extensão (novas instruções)

Para cada instrução do subconjunto de AOC1 que o hardware do lab não tem, o aluno propõe as mudanças e testa:

| Instrução | Mudança esperada (gabarito) |
|---|---|
| `bne` | novo sinal BranchNe (ou Branch 2 bits) e PCSrc = (Branch·Zero) + (BranchNe·¬Zero) |
| `slti` | ALUOp = 11 → alu_op = 111 (SLT) com ALUSrc = 1, RegDst = 0 |
| `jal` | RegDst passa a 2 bits (terceira entrada = 31), MemtoReg passa a 2 bits (terceira entrada = PC+4), Jump = 1 |
| `jr` | detecção de funct 001000 → nova entrada no mux do próximo PC = rd1 |
| `ori`/`andi` | extensão com zeros (ZeroExt) em vez de sinal — introduz um novo sinal de controle |

Interface: ligar/desligar "peças extras" (muxes, sinais, portas) em pontos pré-definidos do datapath e preencher a linha nova da tabela de controle; testes automáticos rodam programas que usam a instrução e dizem se a proposta funciona. Serve para prova ("como adicionar a instrução X?") e para Práticas futuras.

### M9 — Exercícios e autoavaliação

Gerador de questões com feedback explicado, todas verificadas pelo próprio simulador:

- Sinais de controle de uma instrução (M3).
- "Depois de N ciclos, qual o valor de $X / do PC / de M[Y]?"
- Decodificar hex ↔ assembly.
- Endereço de desvio/salto.
- Caminho crítico e período (latências sorteadas).
- Monociclo × multiciclo: ciclos totais, tempo de execução, CPI médio com distribuição de instruções (modelo do exemplo gcc: 22% lw, 11% sw, 49% R, 16% beq, 2% j → CPI 4,02).
- Falha injetada: "qual instrução deixa de funcionar?"

Progresso guardado só no navegador (localStorage, com try/catch). Botão "gerar lista em PDF/imprimir" para a monitoria.

---

## 6. Arquitetura técnica

### Stack

- **Vite + React 18 + TypeScript (strict)**.
- **SVG escrito à mão** para os datapaths (nada de lib de diagramas): controle total do layout clássico do slide.
- **Zustand** para estado da UI; o simulador é independente de React.
- **Vitest** (unitário + golden), **Playwright** (e2e de fluxos principais).
- Deploy: **GitHub Pages** via GitHub Actions; PWA opcional para funcionar offline nos PCs do laboratório.
- Sem backend. Sem dependências pesadas. Bundle alvo < 300 kB gzip.

### Estrutura de pastas

```
src/
  core/                    # ZERO dependência de React/DOM
    isa/                   # encode/decode, tabela de instruções, montador, disassembler
    mono/                  # simulador monociclo bit-exato (Prática 10)
      components/          # pc, imem, regfile, alu, aluControl, control, dmem, muxes, adders, signExt
      datapath.ts          # netlist: componentes, portas, fios (id, largura, origem, destinos)
      step.ts              # step(state) -> { nextState, snapshot } (snapshot = valor de TODOS os fios)
      activity.ts          # quais fios/blocos estão ativos no ciclo (ver algoritmo abaixo)
    multi/                 # datapath multiciclo + FSM
    timing/                # grafo combinacional, tempos de chegada, caminho crítico
    board/                 # lógica do top-level pratica10.v (display_data, LEDs, 7 segmentos)
    faults/                # stuck-at em sinais de controle
    exercises/             # geradores de questões + corretores
  ui/
    datapath/              # SVG: <Wire>, <Mux>, <Alu>, <RegFile>, ... + layouts (coordenadas)
    panels/                # registradores, memória, controle, editor, timing
    modes/                 # uma rota por módulo M1..M9
    board/                 # placa DE10-Lite
  content/                 # textos didáticos (pt-BR), explicações por bloco, trechos de Verilog
reference/
  pratica10/*.v            # Verilog original (somente leitura)
  golden_trace_pratica10.json
```

### Decisões-chave

1. **Simulador puro e determinístico.** `step(state): { next, snapshot }` sem efeitos colaterais; histórico = array de estados (voltar no tempo é trivial). Números sempre como `uint32` (`>>> 0`) com helpers `toSigned`, `signExt16`, `bits(x, hi, lo)`.
2. **Netlist declarativa.** O datapath é dados: cada fio tem `id`, `width`, `from: {component, port}`, `to: [...]`, e a UI só desenha o que a netlist descreve. O SVG usa os mesmos `id`s. Isso permite M2 (construção), M5 (timing = percorrer o grafo) e M8 (extensões = adicionar nós) sem reescrever o simulador.
3. **Snapshot completo por ciclo.** O simulador preenche o valor de **todo** fio, inclusive os inúteis naquele ciclo (como no hardware real). "Ativo" é calculado à parte.
4. **Algoritmo de atividade.** Começa pelos elementos de estado que serão efetivamente escritos (PC sempre; banco se RegWrite; memória de dados se MemWrite) e faz busca para trás pelo grafo; ao passar por um mux, segue só a entrada selecionada; memória de dados lida conta como ativa só se MemRead e MemtoReg = 1. Sinais de controle ativos = os que têm valor 1 ou que selecionam um mux num caminho ativo.
5. **Fidelidade conferida por teste.** Todo comportamento listado na Seção 2 vira teste; o golden trace é obrigatório no CI.
6. **Conteúdo separado do código.** Textos didáticos em `content/` (Markdown/TS), para a monitoria revisar sem mexer em lógica.

---

## 7. Design visual e UX

- Tema claro e escuro (o escuro é ótimo no projetor apagado; o claro para imprimir). Cores como tokens CSS.
- Cores semânticas (iguais em todos os modos):
  - Dados (32 bits): azul · Endereços/PC: verde-azulado · Campos da instrução: cinza com a cor do campo no hover · Controle: vermelho (como no slide) · Fio inativo: cinza 30% de opacidade · Caminho crítico: âmbar grosso.
- Espessura do fio proporcional à largura (1 bit fino, 5 bits médio, 32 bits grosso) e rótulo de largura (`/32`, `/5`) como no diagrama do slide.
- Tipografia monoespaçada para valores; sans para texto.
- Atalhos de teclado: `→` passo, `←` volta, `Espaço` rodar/pausar, `R` reset, `P` prever, `H` alterna hex/dec, `1..9` troca módulo.
- Responsivo: no celular o datapath vira rolável/zoomável e os painéis viram abas; o foco de qualidade é desktop/projetor.
- Acessibilidade: nada comunicado só por cor (ativo = cor + espessura + rótulo); contraste AA; descrições textuais do que acontece no ciclo ("O PC 8 foi enviado à memória de instruções, que devolveu sw $8, 0($12)…") — essa narração também serve para leitores de tela.
- Modo Aula (projetor): esconde painéis, aumenta fonte, mostra só datapath + narração + botões grandes.

---

## 8. Estratégia de testes

1. **Unitários por componente** (`core/mono/components`): ULA (todas as operações, overflow, slt com sinais opostos, zero), controle principal (tabela 2.3 inteira), controle da ULA (tabela 2.4 inteira + funct desconhecido), extensão de sinal, banco ($0 imutável), memória de dados (little-endian, leitura com MemRead=0 dá 0, alerta fora da faixa), memória de instruções (wrap do PC).
2. **Golden trace** (`reference/golden_trace_pratica10.json`): 22 ciclos, campo a campo.
3. **Montador ida e volta**: para cada instrução, `decode(encode(x)) == x`; hex do programa padrão bate com o Verilog.
4. **Propriedades** (fast-check): add/sub/slt da ULA comparados com aritmética de referência para inteiros aleatórios de 32 bits.
5. **Timing**: presets da Aula 07 reproduzem 12 ns e 6/8/7/5/4 ns.
6. **Multiciclo**: número de ciclos por classe; mesmo estado final do monociclo para os mesmos programas (equivalência arquitetural).
7. **Placa**: para uma lista de estados + chaves, `display_data` e LEDs iguais ao `pratica10.v`.
8. **E2E (Playwright)**: carregar preset, dar 5 passos, conferir registradores na tela; quiz de sinais; exportar bloco Verilog.
9. **(Opcional, forte)** Se o CI tiver Icarus Verilog: simular os `.v` da Prática 10 com um testbench que despeja o trace em JSON e comparar com o simulador TS para programas aleatórios. Isso transforma "fiel ao lab" em garantia automática.

---

## 9. Roadmap em fases (com prompt pronto para o Claude Code)

Cada fase termina com: testes passando, `npm run build` sem erros, commit, e um parágrafo em `docs/CHANGELOG.md`. Não comece a fase seguinte com testes quebrados.

### Fase 0 — Esqueleto e fundação

**Prompt:**
> Leia `CLAUDE.md` e `docs/PLANO.md` inteiros, e os arquivos em `reference/pratica10/`. Crie o projeto Vite + React + TypeScript strict com Vitest, ESLint, Prettier, Zustand e Playwright. Monte a estrutura de pastas da Seção 6 do plano (vazia, com READMEs curtos). Configure o GitHub Actions para rodar lint + testes + build e publicar no GitHub Pages. Crie `src/core/bits.ts` com helpers uint32 (`u32`, `toSigned`, `signExt16`, `bits(x,hi,lo)`, `hex`, `bin`) e testes. Não implemente UI ainda além de uma página "Datapath Vivo" com o menu dos módulos M1–M9 desabilitados. Ao final, liste o que ficou pronto e o que ficou de fora.

**Aceite:** CI verde; `bits.ts` 100% testado.

### Fase 1 — ISA, montador e disassembler

**Prompt:**
> Implemente `src/core/isa/`: tabela das 10 instruções do hardware (Seção 2.2) + as 4 de extensão (bne, slti, jal, jr) marcadas como `hardware: false`; `encode`, `decode`, montador de texto (rótulos, comentários `#`, registradores por número `$8` e por nome `$t0`, imediato decimal/hex, `beq` com rótulo calculando offset relativo a PC+4, `j` com rótulo) com mensagens de erro em português com número da linha; disassembler; importador do bloco `memory[i] = 32'h...;` do Verilog e exportador para esse mesmo formato com o assembly em comentário. Teste com o programa padrão da Seção 2.8: o hex tem que bater exatamente.

**Aceite:** ida e volta para todas as instruções; programa padrão bate; import/export do Verilog com teste.

### Fase 2 — Simulador monociclo bit-exato

**Prompt:**
> Implemente `src/core/mono/` seguindo a Seção 2 do plano ao pé da letra (ela foi extraída do Verilog; em caso de dúvida, o Verilog em `reference/pratica10/` manda). Primeiro a netlist declarativa (`datapath.ts`) com todos os componentes e fios e suas larguras; depois cada componente; depois `step(state) -> { next, snapshot }` com o valor de todos os fios. Inclua reset, alertas (opcode desconhecido, funct desconhecido, acesso à memória ≥ 64, PC além da memória de instruções) e o algoritmo de atividade da Seção 6. Escreva os testes da Seção 8 itens 1, 2, 4. O teste golden contra `reference/golden_trace_pratica10.json` é obrigatório e tem que passar nos 22 ciclos, campo a campo.

**Aceite:** golden trace verde; cobertura do `core/mono` ≥ 95%.

### Fase 3 — Datapath SVG + Modo Execução (M1)

**Prompt:**
> Siga o guia visual da Seção 7 do plano. Desenhe o datapath monociclo em SVG com o layout do slide 8 da Aula 07 (em `docs/ref/` há a imagem de referência), usando os mesmos ids de fio da netlist. Componentes SVG reutilizáveis: Wire (com largura e rótulo), Mux (com a chave desenhada indicando a entrada selecionada), Alu, Adder, RegFile, Memory, SignExtend, ShiftLeft2, AndGate, ControlUnit. Implemente o Modo Execução (M1): passo, voltar, rodar, reset, fases visuais do ciclo, etiquetas de valor com dec/hex/bin, fios inativos esmaecidos, painéis de registradores, memória de dados (palavra e byte), memória de instruções e sinais de controle, editor de programa com o montador da Fase 1, estado inicial editável e preset "Prática 10", URL compartilhável. Clique em bloco abre painel com explicação (de `src/content/`) e o trecho de Verilog correspondente. Faça os e2e do item 8.

**Aceite:** um aluno consegue rodar o programa da Prática 10 e ver os mesmos valores do golden trace na tela; funciona no tema claro e escuro; atalhos de teclado funcionam.

### Fase 4 — Controle, Quiz e injeção de falhas (M3) + Codificação (M4)

**Prompt:**
> Implemente M3 e M4 conforme a Seção 5. O quiz de sinais replica o slide "Qual é o caminho de dados da instrução?", aceita X nos don't care (marcados na Seção 2.3) e, ao errar, simula a instrução com o valor errado e mostra a consequência no datapath. A injeção de falhas (stuck-at 0/1 em qualquer sinal de controle, e Zero invertido) roda sobre o simulador da Fase 2 sem duplicar lógica (use `core/faults`). M4: codificação com campos coloridos como no slide, decodificação passo a passo e calculadora de desvio/salto usando o exemplo numérico do slide do jump.

### Fase 5 — Placa virtual DE10-Lite (M7)

**Prompt:**
> Implemente `core/board` reproduzindo `reference/pratica10/pratica10.v` (Seção 2.9): mapeamento de chaves, LEDs, `display_data` para os 16 modos e o decodificador de 7 segmentos ativo em baixo de `decodificador.v`. Teste cada modo contra estados do golden trace. Desenhe a placa em SVG, sincronizada com o M1 (KEY1 no modo passo avança um ciclo; KEY0 reseta). Adicione o desafio "leia a placa".

### Fase 6 — Timing e caminho crítico (M5)

**Prompt:**
> Implemente `core/timing` sobre a netlist: latência por componente, tempos de chegada por fio só pelos caminhos ativos, caminho crítico por instrução e período mínimo do monociclo. UI: caminho crítico destacado no datapath, tabela por classe, barra de tempo desperdiçado, presets "Aula 07 – Exemplo 1" e "Aula 07 – Exercício 1", e os dois modos de cálculo ("por etapas" como no slide e "pelo grafo") descritos em M5, incluindo a nota sobre a divergência do `j`. Testes: modo por etapas reproduz 12 ns (Exemplo 1) e 6/8/7/5/4 ns (Exercício 1); modo pelo grafo dá 12 ns para o lw no Exemplo 1.

### Fase 7 — Multiciclo (M6)

**Prompt:**
> Implemente `core/multi`: datapath multiciclo do P&H (memória única, IR, MDR, A, B, ALUOut, IorD, ALUSrcA, ALUSrcB, PCSource, PCWrite, PCWriteCond, IRWrite) e FSM de controle com os estados 0–9, para o mesmo subconjunto de instruções. Número de ciclos por classe configurável com presets "Slides AOC1" (j = 2) e "FSM P&H" (j = 3), explicando a diferença na UI. Desenhe o datapath (slide 16 da Aula 07) e a FSM, com a RTL de cada passo. Tela de comparação lado a lado monociclo × multiciclo com ciclos, período, tempo total e CPI. Teste de equivalência: mesmo estado arquitetural final nos dois simuladores para um conjunto de programas; e os Exercícios 1 e 2 da Aula 07 reproduzidos (80 ns × 78 ns; 140 ns × 100 ns) e o CPI 4,02 do exemplo gcc.

### Fase 8 — Construção guiada (M2) e Extensão (M8)

**Prompt:**
> Implemente M2 usando a netlist: cada etapa habilita um subconjunto de componentes/fios; instruções não suportadas na etapa mostram por que falham. Desafios de conectar fios (validação por conexão). Depois M8: pontos de extensão na netlist (mux extra, sinal extra, porta extra) que o aluno liga/desliga, nova linha na tabela de controle, e testes automáticos por instrução (bne, slti, jal, jr, ori/andi) com o gabarito da Seção 5.

### Fase 9 — Exercícios (M9), Modo Aula e acabamento

**Prompt:**
> Implemente os geradores de exercícios da Seção 5 (M9), todos corrigidos pelo próprio simulador, com explicação da resposta. Progresso em localStorage com try/catch. Exportar lista para impressão. Modo Aula (projetor). Narração textual por ciclo. Passe de acessibilidade (contraste AA, foco visível, navegação por teclado) e de performance (bundle, 60 fps na animação). Revise todos os textos em `src/content/` quanto a termos da aula.

### Fase 10 (opcional) — Verificação cruzada com o Verilog

**Prompt:**
> Crie `tools/verilog-crosscheck/`: testbench Icarus Verilog para `reference/pratica10/processador.v` que carrega um programa via `$readmemh`, roda N ciclos e despeja um JSON por ciclo no mesmo formato do golden trace. Script que gera 200 programas aleatórios válidos (só instruções do hardware, endereços de memória dentro de 0–63) e compara o trace do Verilog com o do simulador TS. Adicione ao CI como job opcional.

---

## 10. Riscos e cuidados

| Risco | Mitigação |
|---|---|
| Simulador divergir do lab ("na ferramenta dá 6, na placa dá 5") | Golden trace obrigatório + Fase 10; Verilog como fonte da verdade |
| Datapath poluído, ilegível no projetor | Fios inativos esmaecidos, Modo Aula, fases visuais desligáveis |
| Ferramenta virar "cola" | Botão Prever por padrão; quiz mostra consequência do erro em vez de só a resposta |
| Diferenças lab × slide confundirem | Selo "no slide é assim" + preset configurável (jump 2 × 3 ciclos, X × 0) |
| Escopo explodir | Fases com critério de aceite; M1 + M3 + M5 + M7 já entregam 80% do valor |
| Bug do endereçamento da memória de dados | Alerta visual + nota para corrigir no Verilog (`address[5:2]`) |

## 11. Sugestão de uso na disciplina

- **Aula 06**: professora projeta M2 (construção) e M1 no Modo Aula; alunos fazem o quiz M3 no fim.
- **Aula 07**: M5 com os presets dos slides; M6 lado a lado para os Exercícios 1 e 2.
- **LAOC1, Práticas 6–10**: alunos montam o programa no M1, exportam o bloco Verilog para o Quartus e usam a placa virtual (M7) para prever o que a DE10-Lite vai mostrar.
- **Monitoria**: listas geradas no M9; link com programa pronto para dúvidas específicas.
- **Relatório final de monitoria**: a ferramenta, o repositório e os dados de uso (se houver) viram material do relatório.

## 12. Ideias para depois (v2)

- Pipeline de 5 estágios com hazards (ponte para AOC2).
- Modo "caça ao bug": a professora publica um datapath com um defeito escondido e os alunos descobrem pelo comportamento.
- Editor de latências por tecnologia ("e se a memória fosse 10× mais lenta?").
- Exportar animação do ciclo como GIF para slides.
