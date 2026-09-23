# Fase 10 (opcional) — Verificação cruzada com o Verilog

Cole o bloco abaixo no Claude Code (na raiz do repositório).

```text
Crie `tools/verilog-crosscheck/`: testbench Icarus Verilog para `reference/pratica10/processador.v` que carrega um programa via `$readmemh`, roda N ciclos e despeja um JSON por ciclo no mesmo formato do golden trace. Script que gera 200 programas aleatórios válidos (só instruções do hardware, endereços de memória dentro de 0–63) e compara o trace do Verilog com o do simulador TS. Adicione ao CI como job opcional.

---

Ao terminar: rode lint, testes e build; atualize docs/CHANGELOG.md com o que ficou pronto e o que ficou pendente; anote dúvidas didáticas em docs/DUVIDAS.md.
```

## Critério de aceite

Ver a descrição do módulo correspondente em `docs/PLANO.md` (Seções 5 e 8). Testes verdes e build ok.
