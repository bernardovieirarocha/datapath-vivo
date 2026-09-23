# Fase 6 — Timing e caminho crítico (M5)

Cole o bloco abaixo no Claude Code (na raiz do repositório).

```text
Implemente `core/timing` sobre a netlist: latência por componente, tempos de chegada por fio só pelos caminhos ativos, caminho crítico por instrução e período mínimo do monociclo. UI: caminho crítico destacado no datapath, tabela por classe, barra de tempo desperdiçado, presets "Aula 07 – Exemplo 1" e "Aula 07 – Exercício 1", e os dois modos de cálculo ("por etapas" como no slide e "pelo grafo") descritos em M5, incluindo a nota sobre a divergência do `j`. Testes: modo por etapas reproduz 12 ns (Exemplo 1) e 6/8/7/5/4 ns (Exercício 1); modo pelo grafo dá 12 ns para o lw no Exemplo 1.

Ao terminar: rode lint, testes e build; atualize docs/CHANGELOG.md com o que ficou pronto e o que ficou pendente; anote dúvidas didáticas em docs/DUVIDAS.md.
```

## Critério de aceite

Ver a descrição do módulo correspondente em `docs/PLANO.md` (Seções 5 e 8). Testes verdes e build ok.
