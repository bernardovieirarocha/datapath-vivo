/**
 * Coordenadas do datapath monociclo no SVG, seguindo o slide da Aula 06 p. 48
 * (P&H fig. 4.24). Os ids são os da netlist (`src/core/mono/datapath.ts`);
 * um teste garante que todo fio e todo componente da netlist está aqui.
 */

export type Pt = readonly [number, number];

export const VIEWBOX = { w: 1210, h: 800 } as const;

/** Fase visual em que o fio "chega" (1 busca … 5 escrita). */
export type Fase = 1 | 2 | 3 | 4 | 5;

export interface WireLayout {
  /** Polilinhas: a primeira sai da origem; as outras são ramificações (ganham um ponto de junção). */
  paths: readonly (readonly Pt[])[];
  fase: Fase;
  /** Onde fica a etiqueta com o valor. */
  tag?: Pt;
  /** Rótulo fixo do fio, como na figura do slide (ex.: "Instruction [25–21]"). */
  nome?: { text: string; at: Pt; anchor?: 'start' | 'middle' | 'end' };
}

export type Shape =
  | { kind: 'rect'; x: number; y: number; w: number; h: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'alu'; points: readonly Pt[] }
  | { kind: 'mux'; x: number; y: number; top: 0 | 1 }
  | { kind: 'and'; x: number; y: number }
  | { kind: 'bus'; x: number; y1: number; y2: number }
  | { kind: 'text'; x: number; y: number };

export interface ComponentLayout {
  shape: Shape;
  fase: Fase;
  /** Texto(s) dentro do bloco. */
  labels?: readonly { text: string; at: Pt; anchor?: 'start' | 'middle' | 'end'; size?: number }[];
}

/** Mux: 26 × 80. Entradas em y+20 (de cima) e y+60 (de baixo); saída em y+40. */
export const MUX_W = 26;
export const MUX_H = 80;

/** Ponto na borda direita da elipse do Controle, na altura y. */
const CONTROL = { cx: 480, cy: 290, rx: 48, ry: 115 } as const;
function ctlX(y: number): number {
  const d = (y - CONTROL.cy) / CONTROL.ry;
  return Math.round(CONTROL.cx + CONTROL.rx * Math.sqrt(1 - d * d));
}

/** Altura de saída de cada sinal do controle (ordem da figura do slide). */
export const CONTROL_Y: Readonly<Record<string, number>> = {
  RegDst: 200,
  Jump: 222,
  Branch: 244,
  MemRead: 266,
  MemtoReg: 288,
  ALUOp: 310,
  MemWrite: 332,
  ALUSrc: 354,
  RegWrite: 376,
};

function sinal(nome: string, rest: readonly Pt[]): WireLayout {
  const y = CONTROL_Y[nome]!;
  return {
    paths: [[[ctlX(y), y], ...rest]],
    fase: 2,
    nome: { text: nome, at: [ctlX(y) + 4, y - 3] },
  };
}

// prettier-ignore
export const WIRES: Readonly<Record<string, WireLayout>> = {
  pc: { paths: [[[66, 465], [100, 465]], [[85, 465], [85, 150], [150, 150]]], fase: 1, tag: [85, 300] },
  const_4: { paths: [[[118, 80], [150, 80]]], fase: 1 },
  pc_plus_4: {
    paths: [
      [[220, 115], [820, 115]],
      [[790, 115], [790, 75], [1035, 75], [1035, 90], [1047, 90]],
      [[400, 115], [400, 58], [430, 58]],
    ],
    fase: 1,
    tag: [600, 115],
    nome: { text: 'PC + 4 [31–28]', at: [404, 90] },
  },
  instr: {
    paths: [[[240, 470], [275, 470]], [[275, 300], [275, 690]]],
    fase: 1,
    tag: [190, 600],
    nome: { text: 'Instruction [31–0]', at: [236, 490], anchor: 'end' },
  },
  opcode: {
    paths: [[[275, 300], [432, 300]]],
    fase: 2,
    tag: [390, 300],
    nome: { text: 'Instruction [31–26]', at: [282, 294] },
  },
  rs: {
    paths: [[[275, 470], [480, 470]]],
    fase: 2,
    tag: [440, 470],
    nome: { text: 'Instruction [25–21]', at: [282, 464] },
  },
  rt: {
    paths: [[[275, 500], [480, 500]], [[330, 500], [330, 540], [392, 540]]],
    fase: 2,
    tag: [440, 500],
    nome: { text: 'Instruction [20–16]', at: [282, 494] },
  },
  rd: {
    paths: [[[275, 580], [392, 580]]],
    fase: 2,
    tag: [350, 596],
    nome: { text: 'Instruction [15–11]', at: [282, 574] },
  },
  imm16: {
    paths: [[[275, 690], [542, 690]]],
    fase: 2,
    tag: [420, 690],
    nome: { text: 'Instruction [15–0]', at: [282, 684] },
  },
  funct: {
    paths: [[[470, 690], [470, 748], [781, 748]]],
    fase: 2,
    tag: [640, 748],
    nome: { text: 'Instruction [5–0]', at: [478, 742] },
  },
  addr26: {
    paths: [[[275, 300], [275, 40], [314, 40]]],
    fase: 2,
    tag: [275, 210],
    nome: { text: 'Instruction [25–0]', at: [268, 34], anchor: 'end' },
  },
  write_reg: { paths: [[[418, 560], [480, 560]]], fase: 2, tag: [450, 560] },
  rd1: { paths: [[[640, 480], [760, 480]]], fase: 2, tag: [705, 480] },
  rd2: {
    paths: [[[640, 560], [702, 560]], [[675, 560], [675, 630], [930, 630]]],
    fase: 2,
    tag: [850, 630],
  },
  imm_ext: {
    paths: [[[598, 690], [690, 690], [690, 600], [702, 600]], [[650, 690], [650, 175], [736, 175]]],
    fase: 2,
    tag: [625, 706],
  },
  jump_shifted: { paths: [[[366, 40], [430, 40]]], fase: 2 },
  jump_target: {
    paths: [[[444, 47], [1110, 47], [1110, 75], [1127, 75]]],
    fase: 2,
    tag: [900, 47],
    nome: { text: 'Jump address [31–0]', at: [452, 41] },
  },
  branch_offset: { paths: [[[784, 175], [820, 175]]], fase: 2 },
  alu_ctl: { paths: [[[810, 709], [810, 625]]], fase: 2, tag: [810, 680] },
  RegDst: sinal('RegDst', [[545, 200], [545, 165], [380, 165], [380, 505], [405, 505], [405, 520]]),
  Jump: sinal('Jump', [[1170, 222], [1170, 150], [1140, 150], [1140, 135]]),
  Branch: sinal('Branch', [[960, 244], [960, 185], [980, 185]]),
  MemRead: sinal('MemRead', [[1180, 266], [1180, 720], [1000, 720], [1000, 660]]),
  MemtoReg: sinal('MemtoReg', [[1113, 288], [1113, 540]]),
  ALUOp: sinal('ALUOp', [[735, 310], [735, 722], [781, 722]]),
  MemWrite: sinal('MemWrite', [[1000, 332], [1000, 470]]),
  ALUSrc: sinal('ALUSrc', [[715, 354], [715, 540]]),
  RegWrite: sinal('RegWrite', [[560, 376], [560, 440]]),
  alu_b: { paths: [[[728, 580], [745, 580], [745, 610], [760, 610]]], fase: 3 },
  alu_result: {
    paths: [[[860, 560], [930, 560]], [[900, 560], [900, 680], [1088, 680], [1088, 600], [1100, 600]]],
    fase: 3,
    tag: [900, 540],
  },
  zero: { paths: [[[860, 510], [885, 510], [885, 205], [980, 205]]], fase: 3, tag: [885, 400], nome: { text: 'Zero', at: [864, 504] } },
  branch_target: { paths: [[[900, 145], [1020, 145], [1020, 130], [1047, 130]]], fase: 3, tag: [960, 145] },
  pcsrc: { paths: [[[1020, 195], [1060, 195], [1060, 150]]], fase: 3 },
  pc_branch_or_seq: { paths: [[[1073, 110], [1100, 110], [1100, 115], [1127, 115]]], fase: 3 },
  mem_read_data: { paths: [[[1070, 540], [1085, 540], [1085, 560], [1100, 560]]], fase: 4, tag: [1085, 520] },
  write_data: {
    paths: [[[1126, 580], [1150, 580], [1150, 790], [455, 790], [455, 610], [480, 610]]],
    fase: 5,
    tag: [800, 790],
  },
  next_pc: {
    paths: [[[1153, 95], [1195, 95], [1195, 15], [12, 15], [12, 465], [30, 465]]],
    fase: 5,
    tag: [600, 15],
  },
};

const port = (text: string, at: Pt, anchor: 'start' | 'middle' | 'end' = 'start', size = 11) => ({
  text,
  at,
  anchor,
  size,
});

// prettier-ignore
export const COMPONENTS: Readonly<Record<string, ComponentLayout>> = {
  pc: { shape: { kind: 'rect', x: 30, y: 420, w: 36, h: 90 }, fase: 1, labels: [port('PC', [48, 470], 'middle', 14)] },
  const4: { shape: { kind: 'text', x: 108, y: 85 }, fase: 1, labels: [port('4', [108, 85], 'middle', 14)] },
  pcAdder: {
    shape: { kind: 'alu', points: [[150, 60], [220, 95], [220, 135], [150, 170], [150, 130], [162, 115], [150, 100]] },
    fase: 1,
    labels: [port('Add', [192, 120], 'middle', 13)],
  },
  imem: {
    shape: { kind: 'rect', x: 100, y: 400, w: 140, h: 170 },
    fase: 1,
    labels: [
      port('Read', [106, 455]), port('address', [106, 469]),
      port('Instruction', [234, 460], 'end'), port('[31–0]', [234, 474], 'end'),
      port('Instruction', [170, 535], 'middle', 13), port('memory', [170, 551], 'middle', 13),
    ],
  },
  fields: { shape: { kind: 'bus', x: 275, y1: 40, y2: 690 }, fase: 1 },
  control: {
    shape: { kind: 'ellipse', cx: 480, cy: 290, rx: 48, ry: 115 },
    fase: 2,
    labels: [port('Control', [470, 295], 'middle', 14)],
  },
  muxRegDst: { shape: { kind: 'mux', x: 392, y: 520, top: 0 }, fase: 2 },
  regfile: {
    shape: { kind: 'rect', x: 480, y: 440, w: 160, h: 200 },
    fase: 2,
    labels: [
      port('Read', [486, 462]), port('register 1', [486, 474]),
      port('Read', [486, 494]), port('register 2', [486, 506]),
      port('Write', [486, 554]), port('register', [486, 566]),
      port('Write', [486, 604]), port('data', [486, 616]),
      port('Read', [634, 474], 'end'), port('data 1', [634, 486], 'end'),
      port('Read', [634, 554], 'end'), port('data 2', [634, 566], 'end'),
      port('Registers', [585, 628], 'middle', 13),
    ],
  },
  signExt: {
    shape: { kind: 'ellipse', cx: 570, cy: 690, rx: 28, ry: 36 },
    fase: 2,
    labels: [port('Sign', [570, 686], 'middle'), port('extend', [570, 700], 'middle'), port('16', [525, 680], 'middle', 10), port('32', [615, 680], 'middle', 10)],
  },
  muxALUSrc: { shape: { kind: 'mux', x: 702, y: 540, top: 0 }, fase: 3 },
  aluControl: {
    shape: { kind: 'ellipse', cx: 810, cy: 735, rx: 34, ry: 26 },
    fase: 2,
    labels: [port('ALU', [810, 732], 'middle'), port('control', [810, 745], 'middle')],
  },
  alu: {
    shape: { kind: 'alu', points: [[760, 440], [860, 490], [860, 600], [760, 650], [760, 565], [778, 545], [760, 525]] },
    fase: 3,
    labels: [port('ALU', [800, 552], 'middle', 14), port('ALU', [852, 548], 'end', 10), port('result', [852, 572], 'end', 10)],
  },
  dmem: {
    shape: { kind: 'rect', x: 930, y: 470, w: 140, h: 190 },
    fase: 4,
    labels: [
      port('Address', [936, 564]),
      port('Write', [936, 624]), port('data', [936, 636]),
      port('Read', [1064, 534], 'end'), port('data', [1064, 546], 'end'),
      port('Data', [1000, 600], 'middle', 13), port('memory', [1000, 616], 'middle', 13),
    ],
  },
  muxMemtoReg: { shape: { kind: 'mux', x: 1100, y: 540, top: 1 }, fase: 5 },
  shiftBranch: {
    shape: { kind: 'ellipse', cx: 760, cy: 175, rx: 24, ry: 28 },
    fase: 2,
    labels: [port('Shift', [760, 172], 'middle', 10), port('left 2', [760, 184], 'middle', 10)],
  },
  branchAdder: {
    shape: { kind: 'alu', points: [[820, 95], [900, 125], [900, 165], [820, 195], [820, 160], [832, 145], [820, 130]] },
    fase: 3,
    labels: [port('Add', [856, 150], 'middle', 13)],
  },
  branchAnd: { shape: { kind: 'and', x: 980, y: 175 }, fase: 3 },
  muxPCSrc: { shape: { kind: 'mux', x: 1047, y: 70, top: 0 }, fase: 3 },
  shiftJump: {
    shape: { kind: 'ellipse', cx: 340, cy: 40, rx: 26, ry: 24 },
    fase: 2,
    labels: [port('Shift', [340, 37], 'middle', 10), port('left 2', [340, 49], 'middle', 10), port('26', [306, 30], 'middle', 10), port('28', [376, 30], 'middle', 10)],
  },
  jumpConcat: { shape: { kind: 'rect', x: 430, y: 28, w: 14, h: 38 }, fase: 2 },
  muxJump: { shape: { kind: 'mux', x: 1127, y: 55, top: 1 }, fase: 5 },
};
