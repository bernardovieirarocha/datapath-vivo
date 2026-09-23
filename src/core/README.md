# core

Simulação pura, **sem React/DOM** (regra 3 do CLAUDE.md, verificada por `tsconfig.core.json` e pelo ESLint). Determinística: `step(state) -> { next, snapshot }`. Aritmética sempre via `bits.ts`.
