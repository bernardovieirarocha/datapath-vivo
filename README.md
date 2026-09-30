# Datapath Vivo

Digite uma instrução MIPS e veja o caminho dela no **datapath monociclo**, inteiro ou etapa por etapa.

Ferramenta de apoio à disciplina teórica **AOC1 — CEFET-MG** (Prof.ª Poliana Corrêa), feita pela monitoria. O datapath, as tabelas e o vocabulário seguem os slides das Aulas 04, 06 e 07 (Patterson & Hennessy, cap. 4).

**Site:** https://bernardovieirarocha.github.io/datapath-vivo/

## O que dá para fazer (v0.1)

- **Escrever qualquer instrução** da aula (add, sub, and, or, slt, addi, lw, sw, beq, j) em Assembly, hex ou binário. O caminho acende enquanto você digita.
- **Ver o ciclo inteiro ou uma etapa de cada vez** (busca → decodificação → execução → memória → escrita), com ◀ ▶ ou "Animar".
- **Mudar os valores** dos registradores e da memória que a instrução usa e ver os números mudarem nos fios.
- **Entender os detalhes** nas abas ao lado:
  - *O que acontece*: a explicação de cada etapa com os valores reais e o resultado na borda do clock.
  - *Sinais*: os 9 sinais de controle, com o que cada um faz e os don't cares do slide.
  - *Bits*: os 32 bits por campo e a decodificação passo a passo.
- **Clicar num bloco** para ver o que ele faz, as entradas e saídas e a página do slide.
- **Compartilhar** uma instrução pelo link da barra de endereço.

## Rodar na sua máquina

```bash
npm install
npm run dev        # abre em http://localhost:5173
```

Outros comandos: `npm test` (testes de unidade), `npm run test:e2e` (testes no navegador), `npm run lint`, `npm run build`.

## Como é feito

Vite + React 18 + TypeScript. Sem backend.

| Caminho | O que é |
|---|---|
| `src/core/` | O simulador: TypeScript puro, sem interface. O datapath é uma lista declarativa de blocos e fios (`src/core/mono/datapath.ts`). |
| `src/ui/` | A interface. O desenho do datapath é SVG escrito à mão, com os mesmos nomes de fio do simulador. |
| `src/content/` | Os textos didáticos, separados do código, com a aula e a página do slide de cada explicação. |
| `reference/golden_trace_pratica10.json` | 22 ciclos de um programa de exemplo com o valor de todos os fios. É o teste de regressão do simulador. |
| `docs/PLANO.md` | O plano do projeto. `docs/CHANGELOG.md` registra o que cada etapa entregou. |

Os slides das aulas não ficam neste repositório.

## Estado

Versão inicial, para validar com a professora. Já existem no código, fora do ar, um modo de programa passo a passo, um quiz de sinais de controle, injeção de falhas e uma tela de codificação; a ordem do que volta sai dessa conversa (ver `docs/PLANO.md`).
