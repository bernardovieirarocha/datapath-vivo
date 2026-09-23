import { describe, expect, it } from 'vitest';
import memoriaInstrucaoV from '../../../reference/pratica10/MemoriaInstrucao.v?raw';
import golden from '../../../reference/golden_trace_pratica10.json';
import { assemble } from './assembler';
import { exportVerilog, importVerilog } from './verilog';

const GOLDEN_WORDS = golden.program.map((p) => Number(p.hex));

describe('importVerilog', () => {
  it('lê o MemoriaInstrucao.v da Prática 10 (arquivo original)', () => {
    const r = importVerilog(memoriaInstrucaoV);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.words).toHaveLength(32);
      expect(r.words.slice(0, 6)).toEqual(GOLDEN_WORDS);
      expect(r.words.slice(6).every((w) => w === 0)).toBe(true);
    }
  });

  it("aceita 'b, 'd, sublinhados e ignora comentários //", () => {
    const r = importVerilog(`
      memory[0] = 32'b0001_0001_0000_1001_0000_0000_0000_0001;
      memory[1] = 32'd554172418; // addi
      // memory[2] = 32'hFFFFFFFF;
      memory[3]=32'hAD88_0000 ;
    `);
    expect(r.ok && r.words.slice(0, 4)).toEqual([0x11090001, 0x21080002, 0, 0xad880000]);
  });

  it('índice repetido: vale o último, como no Verilog', () => {
    const r = importVerilog("memory[0] = 32'h1;\nmemory[0] = 32'h2;");
    expect(r.ok && r.words[0]).toBe(2);
  });

  it('erros com a linha', () => {
    const r = importVerilog(
      "memory[40] = 32'h0;\nmemory[1] = 32'hXYZ;\nmemory[2] = 5;\nmemory[3] = 32'h1FFFFFFFF;\nmemory[4] = 32'hxxxxxxxx;",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.map((e) => e.line)).toEqual([1, 2, 3, 4, 5]);
      expect(r.errors[0]!.message).toBe('memory[40] está fora da memória (0 a 31)');
      expect(r.errors[1]!.message).toMatch(/não é um literal de 32 bits/);
    }
  });

  it('sem nenhuma atribuição', () => {
    const r = importVerilog('module x; endmodule');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]!.message).toMatch(/nenhuma linha no formato/);
  });

  it("literal 'b e 'd inválidos", () => {
    expect(importVerilog("memory[0] = 32'b102;").ok).toBe(false);
    expect(importVerilog("memory[0] = 32'd1a;").ok).toBe(false);
  });
});

describe('exportVerilog', () => {
  it('gera o bloco no estilo do MemoriaInstrucao.v', () => {
    expect(exportVerilog(GOLDEN_WORDS.slice(0, 2))).toBe(
      [
        '        // Endereço 0: beq $8, $9, 1',
        "        memory[0] = 32'h11090001;",
        '',
        '        // Endereço 4: addi $8, $8, 2',
        "        memory[1] = 32'h21080002;",
      ].join('\n'),
    );
  });

  it('usa o Assembly original como comentário quando fornecido', () => {
    const r = assemble('loop: j loop');
    if (!r.ok) throw new Error();
    const out = exportVerilog(r.program.words, {
      comments: r.program.lines.map((l) => l.source),
      indent: '',
    });
    expect(out).toBe("// Endereço 0: j loop\nmemory[0] = 32'h08000000;");
  });

  it('ida e volta: exportar e importar devolve as mesmas palavras', () => {
    const r = importVerilog(exportVerilog(GOLDEN_WORDS));
    expect(r.ok && r.words.slice(0, 6)).toEqual(GOLDEN_WORDS);
  });
});
