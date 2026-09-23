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
