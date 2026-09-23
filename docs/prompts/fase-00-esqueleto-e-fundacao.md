# Fase 0 — Esqueleto e fundação

Cole o bloco abaixo no Claude Code (na raiz do repositório).

```text
Leia `CLAUDE.md` e `docs/PLANO.md` inteiros, e os arquivos em `reference/pratica10/`. Crie o projeto Vite + React + TypeScript strict com Vitest, ESLint, Prettier, Zustand e Playwright. Monte a estrutura de pastas da Seção 6 do plano (vazia, com READMEs curtos). Configure o GitHub Actions para rodar lint + testes + build e publicar no GitHub Pages. Crie `src/core/bits.ts` com helpers uint32 (`u32`, `toSigned`, `signExt16`, `bits(x,hi,lo)`, `hex`, `bin`) e testes. Não implemente UI ainda além de uma página "Datapath Vivo" com o menu dos módulos M1–M9 desabilitados. Ao final, liste o que ficou pronto e o que ficou de fora.

Ao terminar: rode lint, testes e build; atualize docs/CHANGELOG.md com o que ficou pronto e o que ficou pendente; anote dúvidas didáticas em docs/DUVIDAS.md.
```

## Critério de aceite

CI verde; `bits.ts` 100% testado.
