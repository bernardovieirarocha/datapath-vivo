import { bin } from '../core/bits';
import { decode, disassemble, INSTRUCTIONS, REGISTER_NAMES } from '../core/isa';

export interface Passo {
  texto: string;
  /** Campos da instrução envolvidos neste passo (para destacar). */
  campos: readonly string[];
}

const reg = (n: number) => `${n} ($${n}, também chamado $${REGISTER_NAMES[n]})`;

/**
 * Decodificação passo a passo, como no método da lista:
 * 1) olhe o opcode; 2) se for 000000, é tipo R e o funct decide; 3) leia os outros campos.
 */
export function passosDecodificacao(word: number): Passo[] {
  const d = decode(word);
  const f = d.fields;
  const b = bin(word, 32);
  const passos: Passo[] = [
    {
      texto: `Os 32 bits: ${b.slice(0, 6)} ${b.slice(6)}. O opcode são os 6 bits da esquerda (31–26): ${bin(f.opcode, 6)} = ${f.opcode}.`,
      campos: ['opcode'],
    },
  ];
  if (f.opcode === 0) {
    passos.push({
      texto: `Opcode 000000 → tipo R: quem diz a operação é o funct (bits 5–0) = ${bin(f.funct, 6)} = ${f.funct}${
        d.ok ? ` → ${d.spec.mnemonic}.` : ', que não está na tabela da aula.'
      }`,
      campos: ['funct'],
    });
  } else {
    const spec = INSTRUCTIONS.find((s) => s.format !== 'R' && s.opcode === f.opcode);
    passos.push({
      texto: spec
        ? `Opcode ${f.opcode} → ${spec.mnemonic}, formato ${spec.format}${spec.base ? '' : ' (não faz parte do datapath da aula)'}.`
        : `Opcode ${f.opcode} não está na tabela da aula.`,
      campos: ['opcode'],
    });
  }
  if (!d.ok) return passos;

  switch (d.spec.format) {
    case 'R':
      passos.push({ texto: `rs (25–21) = ${bin(f.rs, 5)} = ${reg(f.rs)}.`, campos: ['rs'] });
      passos.push({ texto: `rt (20–16) = ${bin(f.rt, 5)} = ${reg(f.rt)}.`, campos: ['rt'] });
      passos.push({
        texto: `rd (15–11) = ${bin(f.rd, 5)} = ${reg(f.rd)} — o destino.`,
        campos: ['rd'],
      });
      passos.push({
        texto: `shamt (10–6) = ${bin(f.shamt, 5)}${f.shamt ? ' (ignorado por esta instrução).' : ' (não usado).'}`,
        campos: ['shamt'],
      });
      break;
    case 'I': {
      const imm = (f.imm16 << 16) >> 16;
      passos.push({ texto: `rs (25–21) = ${bin(f.rs, 5)} = ${reg(f.rs)}.`, campos: ['rs'] });
      passos.push({ texto: `rt (20–16) = ${bin(f.rt, 5)} = ${reg(f.rt)}.`, campos: ['rt'] });
      passos.push({
        texto: `Imediato (15–0) = ${bin(f.imm16, 16)} = ${imm}${f.imm16 & 0x8000 ? ' (bit 15 = 1: negativo em complemento de 2)' : ''}.`,
        campos: ['imm'],
      });
      break;
    }
    case 'J':
      passos.push({
        texto: `Endereço (25–0) = ${f.target}. Destino = {PC+4[31–28], ${f.target} × 4} (Aula 06, p. 43–45).`,
        campos: ['imm'],
      });
      break;
  }
  passos.push({ texto: `Resultado: ${disassemble(word)}`, campos: [] });
  return passos;
}

/** Fios do datapath alimentados por cada campo (para o destaque ao passar o mouse). */
export const FIOS_DO_CAMPO: Readonly<Record<string, readonly string[]>> = {
  opcode: ['opcode'],
  rs: ['rs'],
  rt: ['rt'],
  rd: ['rd'],
  shamt: [],
  funct: ['funct'],
  imm: ['imm16', 'addr26'],
};
