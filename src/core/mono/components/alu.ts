import { bit, u32 } from '../../bits';
import { add32 } from './basic';

/** Códigos de operação da ULA do lab (`resMux.v`, 3 bits). */
export const ALU_OP = {
  and: 0b000,
  or: 0b001,
  add: 0b010,
  sub: 0b110,
  slt: 0b111,
} as const;

export interface AluResult {
  result: number;
  zero: 0 | 1;
  /** Calculado, mas não usado pelo processador (não há exceção). */
  overflow: 0 | 1;
  /** Sinais internos de `ula.v`, para o painel do componente. */
  internals: {
    /** `muxB`: b ou ~b, conforme op[2] (Bnegate). */
    bMux: number;
    /** `a + bMux + op[2]` — soma ou subtração em complemento de 2. */
    somasub: number;
    carryOut: 0 | 1;
    /** Overflow de soma/sub, calculado sempre (entra no SLT). */
    ovAddSub: 0 | 1;
    resAnd: number;
    resOr: number;
    /** `sinal(a − b) XOR overflow`. */
    resSLT: 0 | 1;
  };
}

/**
 * `ula.v`, bit a bit. Códigos fora da tabela (011, 100, 101) dão resultado 0,
 * como no `resMux.v` (nenhuma linha do OR-de-ANDs é selecionada).
 */
export function alu(a: number, b: number, op: number): AluResult {
  a = u32(a);
  b = u32(b);
  const op2 = bit(op, 2);
  const bMux = op2 ? u32(~b) : b;
  const { sum: somasub, cout: carryOut } = add32(a, bMux, op2);

  const aMsb = bit(a, 31);
  const bMsb = bit(bMux, 31);
  const sMsb = bit(somasub, 31);
  const ovAddSub = ((aMsb & bMsb & (sMsb ^ 1)) | ((aMsb ^ 1) & (bMsb ^ 1) & sMsb)) as 0 | 1;
  const resSLT = (sMsb ^ ovAddSub) as 0 | 1;
  const resAnd = u32(a & b);
  const resOr = u32(a | b);

  let result: number;
  switch (op & 0b111) {
    case ALU_OP.and:
      result = resAnd;
      break;
    case ALU_OP.or:
      result = resOr;
      break;
    case ALU_OP.add:
    case ALU_OP.sub:
      result = somasub;
      break;
    case ALU_OP.slt:
      result = resSLT;
      break;
    default:
      result = 0;
  }

  const isAddSub = (op & 0b111) === ALU_OP.add || (op & 0b111) === ALU_OP.sub;
  return {
    result,
    zero: result === 0 ? 1 : 0,
    overflow: isAddSub ? ovAddSub : 0,
    internals: { bMux, somasub, carryOut, ovAddSub, resAnd, resOr, resSLT },
  };
}
