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

## Fase 1 — ISA, montador e disassembler — set/2026

**Pronto** (`src/core/isa/`)
- `instructions.ts`: tabela das 10 instruções do hardware e das 4 de extensão (bne, slti, jal, jr, com `hardware: false`), além do tipo `Instruction`.
- `encoding.ts`: `fields` (fatias idênticas às do `processador.v`), `encode` (lança erro se um campo não couber) e `decode`. O `decode` informa opcode/funct desconhecido e lista campos que o hardware ignora (ex.: shamt ≠ 0 num add).
- `assembler.ts`: rótulos (inclusive vários por linha e em linha própria), comentários `#`, registradores `$8`/`$t0`/`$zero`, imediatos decimais/hex/binários com sinal, `lw $1, ($2)`, `nop`. O `beq` aceita rótulo (offset relativo a PC+4) ou número (offset em palavras). O `j` aceita rótulo ou endereço em bytes, e confere a região de PC+4[31:28]. Extensões só com `{ extensions: true }`. Limite de 32 instruções (memória de instruções do lab). Todos os erros vêm em português, com o número da linha e o formato esperado da instrução, e o montador junta todos de uma vez em vez de parar no primeiro.
- `disassembler.ts`: saída no formato do lab (`sw $8, 0($12)`), com registradores por número ou por nome. `0x00000000` vira `nop`. `jumpAddress` implementa `{PC+4[31:28], addr, 00}`.
- `verilog.ts`: `importVerilog` lê `memory[i] = 32'h…;` (também `'b` e `'d`, com sublinhados) e ignora o resto. `exportVerilog` gera o bloco no estilo do `MemoriaInstrucao.v`, com `// Endereço N: …` acima de cada linha.
- Testes (88 novos, 110 no total; `core/isa` com 100% de linhas):
  - Ida e volta de encode/decode para todas as 14 instruções.
  - `encode(decode(w)) == w` para 20 mil palavras aleatórias.
  - O programa padrão bate com o hex do golden trace nas duas grafias: números e rótulos/nomes.
  - O `MemoriaInstrucao.v` original é importado direto de `reference/`, e exportar seguido de importar devolve as mesmas palavras.

**Decisões**
- Operando numérico do `j` = endereço em bytes, do `beq` = offset em palavras (convenção do MARS). Anotado em `DUVIDAS.md` (item 6).

**Pendente**
- Nada da fase. O editor de programa (UI) é da Fase 3.
