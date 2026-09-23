# Datapath Vivo

Ferramenta web interativa do caminho de dados MIPS (monociclo e multiciclo), **de apoio à disciplina teórica AOC1 — CEFET-MG** (Prof.ª Poliana Corrêa). Projeto da monitoria.

O aluno vê o datapath **dos slides** funcionando: fios acendendo, valores em cada barramento, sinais de controle mudando a cada instrução, caminho crítico, monociclo × multiciclo e exercícios corrigidos pelo próprio simulador.

## Estado atual

Fases 0–3 concluídas: core (bits, ISA/montador, simulador monociclo com golden trace verde) e o **modo Execução (M1)** com o datapath do slide em SVG. Rode `npm run dev` e abra `#/m1`. Próximo passo: **Fase 4** (`docs/prompts/fase-04-controle-quiz-e-injecao-de-falhas-m3-cod.md`).

## Mapa do repositório

| Caminho | O que é |
|---|---|
| `CLAUDE.md` | Contexto e regras que o Claude Code lê em toda sessão |
| `docs/PLANO.md` | Plano mestre: objetivos, especificação do datapath, módulos, arquitetura, testes, fases |
| `docs/prompts/` | Um prompt pronto por fase, com critério de aceite |
| `docs/DUVIDAS.md` | Pontos para confirmar com a professora |
| `docs/CHANGELOG.md` | Registro do que cada fase entregou |
| `docs/ref/` | Slides das aulas 04, 06 e 07 + imagens de referência do layout — **fonte da verdade** |
| `reference/golden_trace_pratica10.json` | 22 ciclos do programa de exemplo com o valor de todos os fios (teste obrigatório) |
| `reference/pratica10/`, `tools/golden/` | Verilog do lab e script que gerou o golden trace — só registro histórico |

## Como trabalhar

1. Abra o Claude Code na raiz desta pasta.
2. Cole o prompt da fase atual (`docs/prompts/fase-XX-*.md`).
3. Só avance quando o critério de aceite da fase estiver cumprido e o `CHANGELOG` atualizado.

## Stack

Vite + React 18 + TypeScript strict · Zustand · SVG à mão · Vitest · Playwright · GitHub Pages. Sem backend.
