# Dúvidas para confirmar com a professora

Enquanto não houver resposta, a ferramenta deixa o comportamento **configurável** e mostra as duas versões.

> Na v2 (ferramenta de apoio à teoria), as dúvidas que eram só do lab saíram: o endereçamento da memória de dados do `MemoriaDados.v` e o latch do `BancoReg.v`. Também foi resolvida a do operando do `j`: pelo slide (`j 96` = campo 96, Aula 06 p. 41), o número é o valor do campo, e o montador segue isso.

## 1. Jump no multiciclo: 2 ou 3 ciclos?
Os slides da Aula 07 (exemplo de CPI gcc e Exercício 2) usam **jump = 2 ciclos**; a FSM do Patterson & Hennessy tem 3 (busca, decodificação, conclusão do jump — estado 9).
- Decisão provisória: presets "Slides AOC1" (j = 2, padrão) e "FSM P&H" (j = 3).

## 2. Latência do jump no Exercício 1 da Aula 07
A tabela soma 2 ns de "Operação UAL" para o jump (total 4 ns), mas no datapath monociclo o jump não usa a ULA — pelo grafo ele custa só a memória de instruções (2 ns).
- Decisão provisória: modo de timing "por etapas (slide)" e modo "pelo grafo", lado a lado.

## 3. Linha do `j` na tabela de controle
A tabela do slide (Aula 06, p. 34) só tem R, lw, sw e beq; o slide do jump (p. 48) acrescenta o sinal Jump, mas não mostra a linha. A ferramenta usa a do P&H: RegDst, ALUSrc e MemtoReg = X; RegWrite, MemRead, MemWrite, Branch = 0; ALUOp = 00; Jump = 1. Rigorosamente, Branch e ALUOp também poderiam ser X, porque o mux do Jump tem prioridade.
- Decisão provisória: X só em RegDst, ALUSrc e MemtoReg; o quiz aceita X ou 0 em qualquer X.
- Ação: confirmar qual linha a professora considera certa na prova.

## 4. addi nas tabelas
O subconjunto do slide (Aula 06, p. 11) não tem addi, mas a ferramenta trata addi como instrução da aula (tabelas, quiz, exercícios), porque os programas de exemplo precisam dela. Linha: RegDst 0, ALUSrc 1, MemtoReg 0, RegWrite 1, MemRead 0, MemWrite 0, Branch 0, ALUOp 00.
- Ação: confirmar se a professora cobra addi na tabela de controle.

## 5. Endereço inicial do programa
O simulador começa o programa no endereço 0 (como no programa de exemplo). O MARS e alguns slides usam o segmento de texto em 0x00400000 (Aula 06 p. 10; exemplo do jump com PC+4 = 0x00400010).
- Decisão provisória: endereço 0. Dá para tornar configurável se os exercícios usarem 0x00400000.

## 6. Uso de `sll`/`srl`
O datapath da aula não tem shifts, mas os exercícios de vetor da lista usam. Vale incluir `sll` no Laboratório de Extensão (M8)?
