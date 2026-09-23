# Dúvidas para confirmar com a professora / a equipe do lab

Enquanto não houver resposta, a ferramenta deixa o comportamento **configurável** e mostra as duas versões.

## 1. Endereçamento da memória de dados (possível bug no Verilog)
`MemoriaDados.v` calcula `word_addr = address[7:2]` (até 64 palavras = 256 bytes), mas o array tem só 64 bytes. O comentário do código fala em "64 bytes (16 palavras)", o que seria `address[5:2]`. Endereços ≥ 64 leem X e escritas somem no FPGA.
- Decisão provisória: modelar 64 bytes e mostrar alerta vermelho em acesso ≥ 64.
- Ação: corrigir no Verilog da Prática 10 (é do Bernardo e do Gabriel) ou manter e explicar.

## 2. Jump no multiciclo: 2 ou 3 ciclos?
Os slides da Aula 07 (exemplo de CPI gcc e Exercício 2) usam **jump = 2 ciclos**; a FSM do Patterson & Hennessy tem 3 (busca, decodificação, conclusão do jump — estado 9).
- Decisão provisória: presets "Slides AOC1" (j = 2) e "FSM P&H" (j = 3).

## 3. Latência do jump no Exercício 1 da Aula 07
A tabela soma 2 ns de "Operação UAL" para o jump (total 4 ns), mas no datapath monociclo o jump não usa a ULA — pelo grafo ele custa só a memória de instruções (2 ns).
- Decisão provisória: modo de timing "por etapas (slide)" e modo "pelo grafo", lado a lado.

## 4. Don't cares na tabela de controle
Slide: X em RegDst/MemtoReg para sw e beq (e vários para j). Verilog do lab: 0.
- Decisão provisória: o quiz aceita X ou 0 nesses campos e explica a diferença.

## 5. Uso de `sll`/`srl`
O hardware do lab não tem shifts, mas os exercícios de vetor da lista usam. Vale incluir `sll` no Laboratório de Extensão (M8)?

## 6. Operando numérico do `j` e do `beq` no montador
No montador da ferramenta, `j 8` significa **endereço em bytes** (destino = 8, campo addr = 2) e `beq $1, $2, 3` significa **deslocamento em palavras** (campo imm = 3), como no MARS. Com rótulos não há ambiguidade. O programa da Prática 10 (`j 0`, `beq $8, $9, 1`) dá o mesmo hex nas duas leituras, mas um aluno que escreva `j 2` pensando no campo addr vai saltar para o endereço 2 (erro: não é múltiplo de 4).
- Decisão provisória: convenção do MARS; o M4 (Codificação) vai mostrar explicitamente campo addr × endereço de destino.
- Ação: confirmar com a professora qual leitura ela usa em sala.

## 7. Latch de bypass do `BancoReg.v` na simulação (para a Fase 10)
`BancoReg.v` tem `RegWrite_latch`, `WriteReg_latch` e `WriteData_latch` sem valor inicial. Numa simulação Verilog (Icarus/ModelSim), eles começam em X, e no 1º ciclo `Data1`/`Data2` podem sair X, porque a condição do bypass é X. No FPGA isso não acontece (flip-flops iniciam em 0), e a partir do 2º ciclo o bypass devolve exatamente o valor que o banco já tem. O simulador da ferramenta modela leitura combinacional + escrita na borda (Seção 2.6).
- Ação: na Fase 10 (verificação cruzada), o testbench deve dar reset por 1 ciclo ou inicializar os latches, para não comparar X. Vale considerar pôr `initial` nos latches do Verilog do lab.
