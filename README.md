# Datapath Vivo

Ferramenta web interativa do caminho de dados MIPS (monociclo e multiciclo) para **AOC1 / LAOC1 — CEFET-MG** (Prof.ª Poliana Corrêa). Projeto da monitoria.

O aluno vê o processador da **Prática 10** funcionando: fios acendendo, valores em cada barramento, sinais de controle mudando a cada instrução, a placa DE10-Lite virtual, caminho crítico, monociclo × multiciclo e exercícios corrigidos pelo próprio simulador.

## Estado atual

Fases 0, 1 e 2 concluídas (core: bits, ISA/montador e simulador monociclo bit-exato com golden trace verde). Próximo passo: **Fase 3** (`docs/prompts/fase-03-datapath-svg-modo-execucao-m1.md`).

## Mapa do repositório

| Caminho | O que é |
|---|---|
| `CLAUDE.md` | Contexto e regras que o Claude Code lê em toda sessão |
| `docs/PLANO.md` | Plano mestre: objetivos, especificação do hardware, módulos M1–M9, arquitetura, testes, fases |
| `docs/prompts/` | Um prompt pronto por fase (0 a 10), com critério de aceite |
| `docs/DUVIDAS.md` | Pontos para confirmar com a professora |
| `docs/CHANGELOG.md` | Registro do que cada fase entregou |
| `docs/ref/` | Slides das aulas 04, 06 e 07 + imagens de referência do layout |
| `reference/pratica10/` | Verilog da Prática 10 — **fonte da verdade**, não editar |
| `reference/golden_trace_pratica10.json` | 22 ciclos do programa padrão com o valor de todos os fios (teste obrigatório) |
| `tools/golden/` | Script de referência em Python que gerou o golden trace |

## Como trabalhar

1. Abra o Claude Code na raiz desta pasta.
2. Cole o prompt da fase atual (`docs/prompts/fase-XX-*.md`).
3. Só avance quando o critério de aceite da fase estiver cumprido e o `CHANGELOG` atualizado.

## Stack planejada

Vite + React 18 + TypeScript strict · Zustand · SVG à mão · Vitest · Playwright · GitHub Pages. Sem backend.
