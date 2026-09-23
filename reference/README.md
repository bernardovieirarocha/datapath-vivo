# reference/

- `golden_trace_pratica10.json` — 22 ciclos do **programa de exemplo** (o programa da Prática 10, que só usa instruções da aula), com estado inicial, sinais de controle, `alu_ctl`, `rd1`, `rd2`, `imm_ext`, `alu_b`, `alu_result`, `zero`, `pcsrc`, `mem_read_data`, `write_reg`, `write_data`, `pc_plus_4`, `branch_target`, `jump_target`, `next_pc` e o estado depois da borda (`after`). Valores inteiros com sinal; endereços sem sinal. **Teste de regressão obrigatório.** O datapath da aula e o do lab dão o mesmo resultado para esse programa.
- `pratica10/*.v` — Verilog do processador da Prática 10 de LAOC1 (Bernardo Vieira Rocha e Gabriel Bicalho Maroun). Guardado só como registro de onde veio o golden trace. **Não é referência**: desde a v2 do plano, a fonte da verdade são os slides (`docs/ref/`).

Gerado por `tools/golden/sim_pratica10_ref.py`.
