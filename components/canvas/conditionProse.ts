// Readable rendering of a code-form distinguishing condition
// ("IF a == 'x' OR b == false THEN do y. IF …") used only when no
// plain-language version was recorded. Formats identifiers; adds no prose.

import { humanizeKey } from '@/components/incident/labels';

export interface ConditionClause {
  action: string;
  when: string;
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const ident = (s: string) => lower(humanizeKey(s.trim()));

function atom(raw: string): string {
  const m = /^\s*([\w.]+)\s*(==|!=)\s*(.+?)\s*$/.exec(raw);
  if (!m) return ident(raw.replace(/[()]/g, ''));
  const [, key, op, rawValue] = m;
  const value = rawValue.replace(/^['"]|['"]$/g, '');
  const neg = op === '!=';
  if (value === 'true' || value === 'false') {
    const truthy = (value === 'true') !== neg;
    return truthy ? ident(key) : `${ident(key)} is false`;
  }
  return `${ident(key)} ${neg ? 'is not' : 'is'} ${ident(value)}`;
}

/** Split "IF … THEN …" clauses; returns [] when the text is not in that form. */
export function describeCondition(code: string): ConditionClause[] {
  const clauses = code.split(/\bIF\b/).map((c) => c.trim()).filter(Boolean);
  const out: ConditionClause[] = [];
  for (const c of clauses) {
    const [cond, action] = c.split(/\bTHEN\b/);
    if (!cond || !action) return [];
    const parts = cond.split(/\s+(OR|AND)\s+/);
    const when = parts.map((p, i) => (i % 2 === 1 ? p.toLowerCase() : atom(p))).join(' ');
    const act = action.trim().replace(/\.$/, '');
    out.push({ action: act.charAt(0).toUpperCase() + act.slice(1), when });
  }
  return out;
}
