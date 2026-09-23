# Fase 2 — Simulador monociclo bit-exato

Cole o bloco abaixo no Claude Code (na raiz do repositório).

```text
Implemente `src/core/mono/` seguindo a Seção 2 do plano ao pé da letra (ela foi extraída do Verilog; em caso de dúvida, o Verilog em `reference/pratica10/` manda). Primeiro a netlist declarativa (`datapath.ts`) com todos os componentes e fios e suas larguras; depois cada componente; depois `step(state) -> { next, snapshot }` com o valor de todos os fios. Inclua reset, alertas (opcode desconhecido, funct desconhecido, acesso à memória ≥ 64, PC além da memória de instruções) e o algoritmo de atividade da Seção 6. Escreva os testes da Seção 8 itens 1, 2, 4. O teste golden contra `reference/golden_trace_pratica10.json` é obrigatório e tem que passar nos 22 ciclos, campo a campo.

Ao terminar: rode lint, testes e build; atualize docs/CHANGELOG.md com o que ficou pronto e o que ficou pendente; anote dúvidas didáticas em docs/DUVIDAS.md.
```

## Critério de aceite

golden trace verde; cobertura do `core/mono` ≥ 95%.
