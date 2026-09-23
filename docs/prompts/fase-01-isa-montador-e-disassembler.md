# Fase 1 — ISA, montador e disassembler

Cole o bloco abaixo no Claude Code (na raiz do repositório).

```text
Implemente `src/core/isa/`: tabela das 10 instruções do hardware (Seção 2.2) + as 4 de extensão (bne, slti, jal, jr) marcadas como `hardware: false`; `encode`, `decode`, montador de texto (rótulos, comentários `#`, registradores por número `$8` e por nome `$t0`, imediato decimal/hex, `beq` com rótulo calculando offset relativo a PC+4, `j` com rótulo) com mensagens de erro em português com número da linha; disassembler; importador do bloco `memory[i] = 32'h...;` do Verilog e exportador para esse mesmo formato com o assembly em comentário. Teste com o programa padrão da Seção 2.8: o hex tem que bater exatamente.

Ao terminar: rode lint, testes e build; atualize docs/CHANGELOG.md com o que ficou pronto e o que ficou pendente; anote dúvidas didáticas em docs/DUVIDAS.md.
```

## Critério de aceite

ida e volta para todas as instruções; programa padrão bate; import/export do Verilog com teste.

> **Nota (v2):** fase concluída. Na reorientação para a teoria, o import/export do Verilog saiu e o `j` numérico passou a ser o valor do campo (como no slide `j 96`).
