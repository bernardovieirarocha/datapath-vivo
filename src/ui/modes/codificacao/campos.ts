import { bits } from '../../../core/bits';
import { decode } from '../../../core/isa';

export interface Campo {
  nome: string;
  /** Chave do campo (cor e fios): opcode, rs, rt, rd, shamt, funct, imm. */
  chave: 'opcode' | 'rs' | 'rt' | 'rd' | 'shamt' | 'funct' | 'imm';
  hi: number;
  lo: number;
  valor: number;
}

/** Campos da instrução conforme o formato (R, I ou J), da esquerda para a direita. */
export function camposDe(word: number): { formato: 'R' | 'I' | 'J'; campos: Campo[] } {
  const d = decode(word);
  const formato = d.ok ? d.spec.format : bits(word, 31, 26) === 0 ? 'R' : 'I';
  const c = (nome: string, chave: Campo['chave'], hi: number, lo: number): Campo => ({
    nome,
    chave,
    hi,
    lo,
    valor: bits(word, hi, lo),
  });
  const op = c('opcode', 'opcode', 31, 26);
  if (formato === 'R') {
    return {
      formato,
      campos: [
        op,
        c('rs', 'rs', 25, 21),
        c('rt', 'rt', 20, 16),
        c('rd', 'rd', 15, 11),
        c('shamt', 'shamt', 10, 6),
        c('funct', 'funct', 5, 0),
      ],
    };
  }
  if (formato === 'I') {
    return {
      formato,
      campos: [op, c('rs', 'rs', 25, 21), c('rt', 'rt', 20, 16), c('imediato', 'imm', 15, 0)],
    };
  }
  return { formato, campos: [op, c('endereço', 'imm', 25, 0)] };
}
