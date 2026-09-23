# Fase 4 — Controle, Quiz e injeção de falhas (M3) + Codificação (M4)

Cole o bloco abaixo no Claude Code (na raiz do repositório).

```text
Implemente M3 e M4 conforme a Seção 5. O quiz de sinais replica o slide "Qual é o caminho de dados da instrução?", aceita X nos don't care (marcados na Seção 2.3) e, ao errar, simula a instrução com o valor errado e mostra a consequência no datapath. A injeção de falhas (stuck-at 0/1 em qualquer sinal de controle, e Zero invertido) roda sobre o simulador da Fase 2 sem duplicar lógica (use `core/faults`). M4: codificação com campos coloridos como no slide, decodificação passo a passo e calculadora de desvio/salto usando o exemplo numérico do slide do jump.

Ao terminar: rode lint, testes e build; atualize docs/CHANGELOG.md com o que ficou pronto e o que ficou pendente; anote dúvidas didáticas em docs/DUVIDAS.md.
```

## Critério de aceite

Ver a descrição do módulo correspondente em `docs/PLANO.md` (Seções 5 e 8). Testes verdes e build ok.
