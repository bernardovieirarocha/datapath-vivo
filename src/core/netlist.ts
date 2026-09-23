/**
 * Tipos da netlist declarativa (docs/PLANO.md, Seção 6, decisão 2).
 * O datapath é dados: componentes com portas, fios com largura em bits.
 * A UI desenha a partir destes ids; o simulador avalia a partir deles.
 */

export type WireKind = 'dados' | 'endereco' | 'instrucao' | 'controle';

export interface PortRef {
  component: string;
  port: string;
}

export interface WireSpec {
  id: string;
  width: number;
  kind: WireKind;
  from: PortRef;
  to: readonly PortRef[];
}

export interface OutputSpec {
  name: string;
  /** Entradas das quais esta saída depende combinacionalmente, no mesmo ciclo. */
  deps: readonly string[];
}

export interface ComponentSpec<Kind extends string = string> {
  id: string;
  kind: Kind;
  /** Nome como no slide. */
  label: string;
  inputs: readonly string[];
  /** Entradas amostradas só na borda de subida (não entram na ordem de avaliação). */
  edgeInputs?: readonly string[];
  outputs: readonly OutputSpec[];
  /** Parâmetros fixos (ex.: valor de uma constante). */
  params?: Readonly<Record<string, number>>;
}

export interface Netlist<Kind extends string = string> {
  components: readonly ComponentSpec<Kind>[];
  wires: readonly WireSpec[];
}

/**
 * Confere a consistência da netlist e devolve a lista de problemas (vazia se ok):
 * ids únicos, portas existentes, toda entrada ligada a exatamente um fio,
 * e ausência de laço combinacional.
 */
export function validateNetlist(n: Netlist): string[] {
  const problems: string[] = [];
  const comps = new Map<string, ComponentSpec>();
  for (const c of n.components) {
    if (comps.has(c.id)) problems.push(`componente duplicado: ${c.id}`);
    comps.set(c.id, c);
    for (const e of c.edgeInputs ?? []) {
      if (!c.inputs.includes(e)) problems.push(`${c.id}: entrada de borda ${e} não declarada`);
    }
    for (const o of c.outputs) {
      for (const d of o.deps) {
        if (!c.inputs.includes(d))
          problems.push(`${c.id}.${o.name}: depende de ${d}, que não existe`);
        if (c.edgeInputs?.includes(d))
          problems.push(`${c.id}.${o.name}: depende da entrada de borda ${d}`);
      }
    }
  }

  const wireIds = new Set<string>();
  const driven = new Map<string, string>();
  for (const w of n.wires) {
    if (wireIds.has(w.id)) problems.push(`fio duplicado: ${w.id}`);
    wireIds.add(w.id);
    if (!Number.isInteger(w.width) || w.width < 1 || w.width > 32) {
      problems.push(`${w.id}: largura inválida ${w.width}`);
    }
    const src = comps.get(w.from.component);
    if (!src?.outputs.some((o) => o.name === w.from.port)) {
      problems.push(`${w.id}: origem ${w.from.component}.${w.from.port} não existe`);
    }
    for (const t of w.to) {
      const key = `${t.component}.${t.port}`;
      if (!comps.get(t.component)?.inputs.includes(t.port)) {
        problems.push(`${w.id}: destino ${key} não existe`);
      }
      if (driven.has(key)) problems.push(`${key}: ligada a ${driven.get(key)} e ${w.id}`);
      driven.set(key, w.id);
    }
  }
  for (const c of n.components) {
    for (const i of c.inputs) {
      if (!driven.has(`${c.id}.${i}`)) problems.push(`${c.id}.${i}: entrada sem fio`);
    }
  }

  if (problems.length === 0) {
    try {
      evaluationOrder(n);
    } catch (e) {
      problems.push((e as Error).message);
    }
  }
  return problems;
}

/**
 * Ordem de avaliação dos componentes (ordenação topológica pelas dependências
 * combinacionais). Lança erro se houver laço combinacional.
 */
export function evaluationOrder(n: Netlist): string[] {
  const driverOf = new Map<string, string>(); // "comp.porta de entrada" → componente que a alimenta
  for (const w of n.wires) {
    for (const t of w.to) driverOf.set(`${t.component}.${t.port}`, w.from.component);
  }
  const deps = new Map<string, Set<string>>();
  for (const c of n.components) {
    const s = new Set<string>();
    for (const o of c.outputs) {
      for (const d of o.deps) {
        const src = driverOf.get(`${c.id}.${d}`);
        if (src !== undefined) s.add(src);
      }
    }
    // Entradas combinacionais sem saída dependente (ex.: endereço de escrita) não ordenam nada.
    deps.set(c.id, s);
  }

  const order: string[] = [];
  const state = new Map<string, 'visitando' | 'feito'>();
  const visit = (id: string, path: string[]) => {
    const st = state.get(id);
    if (st === 'feito') return;
    if (st === 'visitando') {
      throw new Error(`laço combinacional: ${[...path, id].join(' → ')}`);
    }
    state.set(id, 'visitando');
    for (const d of deps.get(id) ?? []) visit(d, [...path, id]);
    state.set(id, 'feito');
    order.push(id);
  };
  for (const c of n.components) visit(c.id, []);
  return order;
}
