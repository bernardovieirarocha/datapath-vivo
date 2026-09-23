import { describe, expect, it } from 'vitest';
import golden from '../../../reference/golden_trace_pratica10.json';
import { assemble, formatAsmError, type AssembleResult } from './assembler';
import { disassemble, jumpAddress } from './disassembler';
import { formatRegister, parseRegister } from './registers';

const GOLDEN_WORDS = golden.program.map((p) => Number(p.hex));

function words(r: AssembleResult): number[] {
  if (!r.ok) throw new Error(r.errors.map(formatAsmError).join('\n'));
  return r.program.words;
}

function errors(r: AssembleResult): string[] {
  if (r.ok) throw new Error('esperava erro de montagem');
  return r.errors.map(formatAsmError);
}

describe('programa de exemplo (o do golden trace)', () => {
  it('com registradores por número: hex bate exatamente', () => {
    const src = golden.program.map((p) => p.asm).join('\n');
    expect(words(assemble(src))).toEqual(GOLDEN_WORDS);
  });

  it('com rótulos, nomes de registradores e comentários: mesmo hex', () => {
    const src = `
      # Programa de exemplo
      inicio: beq $t0, $t1, pula   # se $8 == $9, pula o addi
              addi $t0, $t0, 2
      pula:   sw   $t0, 0($t4)     # M[4] <- $8
              lw   $s0, 0($t4)
              sub  $t0, $s0, $t2
              j    inicio
    `;
    const r = assemble(src);
    expect(words(r)).toEqual(GOLDEN_WORDS);
    if (r.ok) {
      expect(r.program.labels).toEqual({ inicio: 0, pula: 8 });
      expect(r.program.lines.map((l) => l.line)).toEqual([3, 4, 5, 6, 7, 8]);
      expect(r.program.lines[2]!.source).toBe('sw   $t0, 0($t4)');
    }
  });

  it('disassembler devolve o texto do golden trace', () => {
    expect(GOLDEN_WORDS.map((w) => disassemble(w))).toEqual(golden.program.map((p) => p.asm));
  });
});

describe('montador: sintaxe aceita', () => {
  it('todas as instruções do datapath da aula', () => {
    const src = [
      'add $1, $2, $3',
      'sub $1, $2, $3',
      'and $1, $2, $3',
      'or $1, $2, $3',
      'slt $1, $2, $3',
      'addi $1, $2, -5',
      'lw $1, 8($2)',
      'sw $1, -4($2)',
      'beq $1, $2, -1',
      'j 4',
    ].join('\n');
    const w = words(assemble(src));
    expect(w.map((x) => disassemble(x))).toEqual(src.split('\n'));
  });

  it('imediatos em hex e binário, com sinal', () => {
    expect(words(assemble('addi $1, $0, 0x7FFF'))).toEqual([0x20017fff]);
    expect(words(assemble('addi $1, $0, -0x8000'))).toEqual([0x20018000]);
    expect(words(assemble('addi $1, $0, 0b101'))).toEqual([0x20010005]);
    expect(words(assemble('addi $1, $0, +3'))).toEqual([0x20010003]);
  });

  it('lw/sw sem deslocamento e com espaços', () => {
    expect(words(assemble('lw $1, ($2)'))).toEqual(words(assemble('lw $1, 0($2)')));
    expect(words(assemble('sw $1, 4 ( $2 )'))).toEqual(words(assemble('sw $1, 4($2)')));
  });

  it('mnemônicos sem diferenciar maiúsculas, tabs e rótulos em linha própria', () => {
    const src = 'LOOP:\n\tADD\t$1,$2,$3\n\tBEQ $0, $0, LOOP\nfim: fim2: nop';
    const r = assemble(src);
    expect(words(r)).toEqual([0x00430820, 0x1000fffe, 0]);
    if (r.ok) expect(r.program.labels).toEqual({ LOOP: 0, fim: 8, fim2: 8 });
  });

  it('desvio para frente e para trás calcula o offset relativo a PC+4', () => {
    const src = 'a: beq $0, $0, c\nb: beq $0, $0, a\nc: beq $0, $0, c';
    expect(words(assemble(src)).map((w) => w & 0xffff)).toEqual([1, 0xfffe, 0xffff]);
  });

  it('j com rótulo e com o valor do campo (como no slide: j 96)', () => {
    const w = words(assemble('nop\nnop\nalvo: j alvo\nj 96\nj 0x3FFFFFF'));
    expect(w[2]).toBe(0x08000002);
    expect(w[3]).toBe(0x08000060);
    expect(w[4]).toBe(0x0bffffff);
  });

  it('extensões só com a opção ligada', () => {
    const src = 'bne $1, $2, 0\nslti $1, $2, 3\njal 0\njr $ra';
    expect(errors(assemble(src))).toHaveLength(4);
    const w = words(assemble(src, { extensions: true }));
    expect(w).toEqual([0x14220000, 0x28410003, 0x0c000000, 0x03e00008]);
  });

  it('programa vazio ou só comentários', () => {
    expect(words(assemble(''))).toEqual([]);
    expect(words(assemble('# nada\n\n   # mesmo'))).toEqual([]);
  });
});

describe('montador: erros em português com a linha', () => {
  it.each([
    ['foo $1, $2, $3', /Linha 1: instrução desconhecida "foo"/],
    ['bne $1, $2, 0', /Linha 1: bne não faz parte do datapath da aula/],
    ['add $1, $2', /Linha 1: add espera 3 operandos; formato: add \$rd, \$rs, \$rt/],
    ['add $1, , $2', /add espera 3 operandos/],
    ['j', /j espera 1 operando;/],
    ['add $1, $2, $32', /registrador inválido "\$32"/],
    ['add $1, $2, $08', /registrador inválido "\$08"/],
    ['add $1, $2, t0', /registrador inválido "t0"/],
    ['addi $1, $2, 32768', /não cabe em 16 bits com sinal/],
    ['addi $1, $2, 0xFFFF', /escreva -1/],
    ['addi $1, $2, abc', /imediato inválido "abc"/],
    ['lw $1, 4$2', /endereço "4\$2" inválido; formato: lw \$rt, deslocamento\(\$rs\)/],
    ['beq $1, $2, fim', /rótulo "fim" não foi definido/],
    ['beq $1, $2, 40000', /deslocamento 40000 não cabe/],
    ['beq $1, $2, 1x', /destino do desvio inválido/],
    ['j fim', /rótulo "fim" não foi definido/],
    ['j -4', /destino do salto inválido "-4"/],
    ['j 0x4000000', /destino do salto inválido/],
    ['j 1x', /destino do salto inválido/],
    ['.data', /diretivas como ".data" não são suportadas/],
    ['nop $1', /nop não tem operandos/],
  ])('%s', (src, msg) => {
    expect(errors(assemble(src)).join('\n')).toMatch(msg);
  });

  it.each([
    ['addi $1, $2', /formato: addi \$rt, \$rs, imediato/],
    ['beq $1, $2', /formato: beq \$rs, \$rt, rótulo/],
    ['jr $1, $2', /jr espera 1 operando; formato: jr \$rs/],
  ])('dica de formato: %s', (src, msg) => {
    expect(errors(assemble(src, { extensions: true })).join('\n')).toMatch(msg);
  });

  it('rótulo repetido', () => {
    expect(errors(assemble('a: nop\na: nop'))).toEqual([
      'Linha 2: o rótulo "a" já foi definido antes',
    ]);
  });

  it('coleta todos os erros, em ordem de linha', () => {
    const e = errors(assemble('add $1\nnop\nfoo\nlw $1, 0($99)'));
    expect(e.map((s) => s.split(':')[0])).toEqual(['Linha 1', 'Linha 3', 'Linha 4']);
  });

  it('programa maior que a memória de instruções (64 palavras)', () => {
    const src = Array.from({ length: 65 }, () => 'nop').join('\n');
    expect(errors(assemble(src))).toEqual([
      'Linha 65: o programa passa de 64 instruções — a memória de instruções do simulador só tem 64 palavras',
    ]);
    expect(words(assemble(src, { maxWords: 100 }))).toHaveLength(65);
  });

  it('desvio longe demais', () => {
    const src = 'beq $0, $0, fim\n' + 'nop\n'.repeat(32768) + 'fim: nop';
    expect(errors(assemble(src, { maxWords: 40000 }))).toEqual([
      'Linha 1: o rótulo "fim" está longe demais para o desvio',
    ]);
  });

  it('erros inesperados (bugs) não são engolidos como erro de linha', () => {
    expect(() => assemble(null as unknown as string)).toThrow(TypeError);
  });
});

describe('disassembler', () => {
  it('nop, desconhecidas, nomes de registradores', () => {
    expect(disassemble(0)).toBe('nop');
    expect(disassemble(0xfc000000)).toBe('# instrução desconhecida (opcode desconhecido: 111111)');
    expect(disassemble(0x020a4022, { registers: 'nome' })).toBe('sub $t0, $s0, $t2');
    expect(disassemble(0x03e00008, { registers: 'nome' })).toBe('jr $ra');
    expect(disassemble(0x28410003)).toBe('slti $1, $2, 3');
  });

  it('destino do j usa PC+4[31:28] (exemplo do slide)', () => {
    // PC+4 = 0x00400010, addr = 1 → 0x00000004
    expect(jumpAddress(1, 0x0040000c)).toBe(0x00000004);
    expect(jumpAddress(1, 0x1000000c)).toBe(0x10000004);
    expect(disassemble(0x08000060)).toBe('j 96');
  });
});

describe('registradores', () => {
  it('lê número e nome', () => {
    expect(parseRegister('$0')).toBe(0);
    expect(parseRegister('$31')).toBe(31);
    expect(parseRegister('$zero')).toBe(0);
    expect(parseRegister('$T0')).toBe(8);
    expect(parseRegister(' $ra ')).toBe(31);
    expect(parseRegister('$32')).toBeUndefined();
    expect(parseRegister('$x1')).toBeUndefined();
    expect(parseRegister('8')).toBeUndefined();
  });
  it('formata nos dois estilos', () => {
    expect(formatRegister(16)).toBe('$16');
    expect(formatRegister(16, 'nome')).toBe('$s0');
  });
});
