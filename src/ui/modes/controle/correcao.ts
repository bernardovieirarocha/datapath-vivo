import { CONTROL_SIGNAL_NAMES, control, DONT_CARES, type ControlSignals } from '../../../core/mono';

export type Sinal = (typeof CONTROL_SIGNAL_NAMES)[number];

/** Ordem das colunas: a do slide (Aula 06, p. 36) + Jump no fim. */
export const COLUNAS: readonly Sinal[] = [
  'RegDst',
  'Branch',
  'MemRead',
  'MemtoReg',
  'ALUOp',
  'MemWrite',
  'ALUSrc',
  'RegWrite',
  'Jump',
];

export function opcoes(s: Sinal): readonly string[] {
  return s === 'ALUOp' ? ['00', '01', '10', 'X'] : ['0', '1', 'X'];
}

export type Correcao =
  | { status: 'certo'; dontCare: boolean }
  | { status: 'errado'; esperado: string; dontCare: false; valor?: number };

/** Corrige uma resposta. Num don't care, qualquer resposta vale (X, 0 ou 1). */
export function corrigir(opcode: number, s: Sinal, resposta: string): Correcao {
  const certo: ControlSignals = control(opcode);
  const esperadoNum = certo[s];
  const esperado = s === 'ALUOp' ? esperadoNum.toString(2).padStart(2, '0') : String(esperadoNum);
  if ((DONT_CARES[opcode] ?? []).includes(s)) return { status: 'certo', dontCare: true };
  if (resposta === esperado) return { status: 'certo', dontCare: false };
  return {
    status: 'errado',
    esperado,
    dontCare: false,
    valor: resposta === 'X' ? undefined : parseInt(resposta, 2),
  };
}

/** Instrução aleatória do subconjunto da aula (para o quiz). */
export function instrucaoAleatoria(rand: () => number = Math.random): string {
  const int = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
  const reg = () => `$${int(1, 31)}`;
  const tipos = ['R', 'R', 'R', 'addi', 'lw', 'sw', 'beq', 'j'] as const;
  const t = tipos[int(0, tipos.length - 1)]!;
  switch (t) {
    case 'R': {
      const op = ['add', 'sub', 'and', 'or', 'slt'][int(0, 4)]!;
      return `${op} ${reg()}, ${reg()}, ${reg()}`;
    }
    case 'addi':
      return `addi ${reg()}, ${reg()}, ${int(-50, 50)}`;
    case 'lw':
    case 'sw':
      return `${t} ${reg()}, ${4 * int(0, 15)}(${reg()})`;
    case 'beq': {
      const off = int(1, 8) * (rand() < 0.5 ? -1 : 1);
      return `beq ${reg()}, ${reg()}, ${off}`;
    }
    case 'j':
      return `j ${int(0, 63)}`;
  }
}
