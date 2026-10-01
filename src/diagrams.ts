import type { Plan } from './types';

const safeLabel = (s: string) => s.replace(/["\n\r#;`]/g, ' ').replace(/\s+/g, ' ').trim() || '?';

/** Build a flowchart from structured links, so the AI never writes Mermaid syntax itself. */
export function flowChart(plan: Plan): string | undefined {
  if (!plan.flow?.length) return plan.flowMermaid;
  // Screen name -> { id, label }. Includes every planned screen plus any name only used in a link.
  const nodes = new globalThis.Map<string, { id: string; label: string }>();
  const id = (name: string) => {
    const key = name.trim().toLowerCase();
    if (!nodes.has(key)) nodes.set(key, { id: `n${nodes.size}`, label: safeLabel(name) });
    return nodes.get(key)!.id;
  };
  plan.screens.forEach(s => id(s.name));
  const edges = plan.flow.map(e => `  ${id(e.from)} -->${e.label ? `|"${safeLabel(e.label)}"|` : ''} ${id(e.to)}`);
  const decls = [...nodes.values()].map(n => `  ${n.id}["${n.label}"]`);
  return ['graph TD', ...decls, ...edges].join('\n');
}

const CARDINALITY = { 'one-to-one': '||--||', 'one-to-many': '||--o{', 'many-to-many': '}o--o{' } as const;
const entityId = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'ENTITY';
const word = (s: string) => s.replace(/[^\w]/g, '') || 'field';

export function erDiagram(plan: Plan): string | undefined {
  if (!plan.entities?.length) return plan.dataModelMermaid;
  const lines = ['erDiagram'];
  for (const r of plan.relations ?? []) {
    lines.push(`  ${entityId(r.from)} ${CARDINALITY[r.kind] ?? '||--o{'} ${entityId(r.to)} : "${safeLabel(r.label || 'has')}"`);
  }
  for (const e of plan.entities) {
    lines.push(`  ${entityId(e.name)} {`);
    for (const f of e.fields) lines.push(`    ${word(f.type)} ${word(f.name)}`);
    lines.push('  }');
  }
  return lines.join('\n');
}
