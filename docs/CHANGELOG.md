# Changelog

## Planejamento — set/2026
- Plano mestre (`docs/PLANO.md`), `CLAUDE.md`, prompts das fases 0–10.
- Verilog da Prática 10 em `reference/pratica10/` e golden trace de 22 ciclos.
- Slides de referência em `docs/ref/`.
- Dúvidas abertas registradas em `docs/DUVIDAS.md`.

## Fase 0 — Esqueleto e fundação — set/2026

**Pronto**
- Projeto Vite 8 + React 18 + TypeScript (strict, `noUncheckedIndexedAccess`) com Zustand, Vitest (+ cobertura v8), ESLint, Prettier e Playwright.
- Estrutura de pastas da Seção 6 do plano, com README curto em cada pasta.
- `src/core/bits.ts`: `u32`, `toSigned`, `signExt16`, `bits(x, hi, lo)`, `hex`, `bin`, além de `bit` e `mask`. 22 testes, 100% de cobertura, com limite de 100% fixado no `vite.config.ts`.
- Regra 3 verificada automaticamente: `tsconfig.core.json` compila `src/core` sem a lib DOM, e o ESLint proíbe importar React, Zustand, `ui/` e `content/` dentro do core. As duas travas foram testadas com um arquivo de prova.
- Página inicial "Datapath Vivo" com os módulos M1–M9 desabilitados, cada um mostrando em que fase fica pronto (textos em `src/content/modulos.ts`). Tokens de cor em CSS, com tema claro e escuro.
- GitHub Actions (`.github/workflows/ci.yml`): lint, testes com cobertura, build, e2e, e publicação no GitHub Pages a cada push na `main`. `base: './'` no Vite, para funcionar em qualquer subpasta do Pages.
- 1 teste e2e: a página inicial lista os 9 módulos desabilitados.
- Bundle: 46,5 kB gzip.

**Pendente / fora desta fase**
- O repositório ainda não tem remote no GitHub. Falta criar o repo e ativar o Pages com "Source: GitHub Actions" (Settings → Pages); o CI só roda depois disso.
- Nenhum simulador ou UI de módulo ainda (Fases 1+).
