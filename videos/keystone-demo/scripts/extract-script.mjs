// Parse the shooting script into one structured record per act.
// The script is the source of truth; nothing here invents copy.
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = new URL('../../../docs/submission/video-script-v2.md', import.meta.url).pathname;
const lines = readFileSync(SRC, 'utf8').split('\n');

const acts = [];
let act = null;
let inVo = false;

const clean = (t) => t.replace(/\*\*|\*|_/g, '').trim();

for (const raw of lines) {
  const t = raw.trim();

  // "ACT 1B" and "ACT 2A" are inserts between numbered acts; their ids keep
  // the document order (act-1b, act-2a) rather than renumbering the film.
  const head = t.match(/^## (ACT (\d+[A-Z]?)|CLOSE)\b(.*)$/);
  if (head) {
    const id = head[1] === 'CLOSE' ? 'close' : `act-${String(head[2]).toLowerCase().padStart(2, '0')}`;
    const title = clean(head[3].replace(/^[—-]\s*/, '').replace(/\(\d+:\d+[–-]\d+:\d+\).*$/, ''));
    act = { id, title, vo: [], card: null, visual: null, motion: null };
    acts.push(act);
    inVo = false;
    continue;
  }
  if (!act) continue;

  if (/^>\s*\*\*QUOTE CARD/i.test(t)) {
    act.card = clean(t.replace(/^>\s*\*\*QUOTE CARD \d+:\*\*/i, '')).replace(/^["“]|["”]$/g, '');
    inVo = false;
    continue;
  }
  if (/^\|\s*\*\*Visual\*\*/.test(t)) { act.visual = clean(t.split('|')[2] ?? ''); continue; }
  if (/^\|\s*\*\*Motion gfx\*\*/.test(t)) { act.motion = clean(t.split('|')[2] ?? ''); continue; }

  if (/^>\s*\*\*(VO:?|Say this one slowly)/i.test(t)) { inVo = true; continue; }
  if (!t.startsWith('>')) { inVo = false; continue; }
  if (!inVo) continue;

  const body = t.replace(/^>\s?/, '').trim();
  if (body === '[beat]') { act.vo.push({ beat: true }); continue; }
  const text = clean(body).replace(/^["“]|["”]$/g, '');
  if (text) act.vo.push({ text });
}

// Merge consecutive text lines into sentences-per-beat groups.
for (const a of acts) {
  const groups = [];
  let buf = [];
  for (const item of a.vo) {
    if (item.beat) { if (buf.length) groups.push(buf.join(' ')); buf = []; continue; }
    buf.push(item.text);
  }
  if (buf.length) groups.push(buf.join(' '));
  a.groups = groups;
  a.words = groups.join(' ').split(/\s+/).filter(Boolean).length;
}

writeFileSync(new URL('../script.json', import.meta.url).pathname, JSON.stringify({ acts }, null, 2) + '\n');
console.log(`${acts.length} acts`);
for (const a of acts) {
  console.log(` ${a.id.padEnd(8)} ${String(a.words).padStart(4)}w  ${a.groups.length} beat-groups  ${a.card ? 'CARD' : '    '}  ${a.title.slice(0, 44)}`);
}
console.log(`total VO words: ${acts.reduce((n, a) => n + a.words, 0)}`);
