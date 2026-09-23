# reference/

**Somente leitura.** É a fonte da verdade do simulador monociclo.

- `pratica10/*.v` — processador MIPS monociclo da Prática 10 de LAOC1 (Bernardo Vieira Rocha e Gabriel Bicalho Maroun). Topo da placa: `pratica10.v`; processador: `processador.v`.
- `golden_trace_pratica10.json` — 22 ciclos do programa padrão de `MemoriaInstrucao.v`, com estado inicial de `BancoReg.v` e `MemoriaDados.v`. Para cada ciclo: sinais de controle, `alu_ctl`, `rd1`, `rd2`, `imm_ext`, `alu_b`, `alu_result`, `zero`, `pcsrc`, `mem_read_data`, `write_reg`, `write_data`, `pc_plus_4`, `branch_target`, `jump_target`, `next_pc` e o estado depois da borda (`after`). Valores inteiros com sinal; endereços sem sinal.

Gerado por `tools/golden/sim_pratica10_ref.py` (modelo Python escrito a partir do Verilog). A Fase 10 do plano adiciona a verificação direta contra o Verilog com Icarus.
