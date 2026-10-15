// The submission, checked against the repository it describes.
//
// Why this exists. Every claim in docs/ is written by hand and nothing was
// checking it, so claims drifted ahead of the artifact and were corrected only
// when somebody happened to look. The record is not ambiguous: a checklist that
// said the repository was private after it had been made public; a test count
// two days and hundreds of tests stale; a section asserting a provider was
// answering live while it was returning 402; a paragraph disclosing which tool
// built which layer, deleted in a routine edit and noticed by chance.
//
// None of that was dishonest. It is what happens when prose about a system is
// not attached to the system. So the checkable claims are checked here, and
// drift is a failing test instead of a thing a reader finds first.
//
// What this file deliberately cannot do: it cannot judge whether the writing is
// fair, whether a figure cited to an outside source is sound, or whether a
// screen is as good as the prose implies. Those stay human. It checks the
// claims that have one right answer living somewhere in this repository.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listPillRefs, loadPill, pillsDir } from '@/lib/pills/load';

const ROOT = process.cwd();
const DOCS = ['docs/SUBMISSION.md', 'docs/submission/form-answers.md'] as const;

function read(relative: string): string {
  return readFileSync(join(ROOT, relative), 'utf8');
}

/** The submission prose, as one haystack: a claim is wrong wherever it appears. */
const submission = DOCS.map(read).join('\n');

describe('rule ids the submission cites', () => {
  it('are rules that exist in the pills', () => {
    const cited = new Set(submission.match(/\b(?:TS|TE)-\d\d\b/g) ?? []);
    expect(cited.size).toBeGreaterThan(5);

    const real = new Set<string>();
    for (const ref of listPillRefs()) {
      for (const rule of loadPill(ref.id)?.pill.rules ?? []) real.add(rule.id);
    }
    // TS-14 is the rule the demo's frontline capture proposes for v1.3.0; it is
    // described as a proposal and does not exist in the shipped pill.
    const proposed = new Set(['TS-14']);
    for (const id of cited) {
      if (proposed.has(id)) continue;
      expect(real, `${id} is cited but no pill has it`).toContain(id);
    }
  });
});

describe('provenance the submission quotes', () => {
  /** Every turn timestamp in every shipped transcript. */
  const transcriptStamps = (): Set<string> => {
    const dir = join(ROOT, 'data/transcripts');
    const stamps = new Set<string>();
    for (const file of readdirSync(dir).filter((name) => name.endsWith('.json'))) {
      // A transcript is phases of turns; the turn carries `t`. Walk it rather
      // than assume a shape, so a restructured transcript fails loudly here
      // instead of silently checking nothing.
      const walk = (node: unknown): void => {
        if (Array.isArray(node)) return node.forEach(walk);
        if (!node || typeof node !== 'object') return;
        const record = node as Record<string, unknown>;
        if (typeof record.t === 'string') stamps.add(record.t);
        Object.values(record).forEach(walk);
      };
      walk(JSON.parse(readFileSync(join(dir, file), 'utf8')));
    }
    return stamps;
  };

  it('points at timestamps that exist in a transcript', () => {
    // The prose cites the moment bare — "00:14:32" — rather than as a full
    // provenance ref, so that is what gets checked.
    const cited = new Set(submission.match(/\b\d{2}:[0-5]\d:[0-5]\d\b/g) ?? []);
    expect(cited.size, 'the submission quotes no transcript moment at all').toBeGreaterThan(0);
    const stamps = transcriptStamps();
    // Clock times in the incident narrative (02:14, 14:20) are not transcript
    // moments; only HH:MM:SS of a recorded turn is.
    for (const at of cited) {
      expect(stamps, `the submission quotes ${at} but no transcript has a turn there`).toContain(at);
    }
  });

  it('is the same provenance the pills carry, not a separate set of numbers', () => {
    const fromPills = new Set<string>();
    for (const ref of listPillRefs()) {
      for (const rule of loadPill(ref.id)?.pill.rules ?? []) for (const p of rule.provenance) fromPills.add(p);
    }
    for (const ref of submission.match(/\b[a-z]{2}-interview-\d{4}-\d{2}-\d{2}#\d{2}:\d{2}:\d{2}\b/g) ?? []) {
      expect(fromPills, `${ref} is quoted in the submission but no rule cites it`).toContain(ref);
    }
  });
});

describe('counts and versions the submission states', () => {
  /** The pills, as ground truth: id → rules, version, evals. */
  const pills = listPillRefs().map((ref) => {
    const bundle = loadPill(ref.id)!;
    const evals = join(pillsDir(), ref.domain, ref.name, 'evals');
    return {
      id: ref.id,
      rules: bundle.pill.rules.length,
      version: bundle.pill.manifest.version,
      evals: existsSync(evals) ? readdirSync(evals).filter((f) => f.endsWith('.yaml')).length : 0,
    };
  });

  it('counts each pill\u2019s rules the way the pill does', () => {
    // Only phrases that are about a pill. "4 rules recurring, 3 seen once" is
    // about the frontline record, and treating every "N rules" in the prose as
    // a pill count was a string heuristic standing in for a real signal.
    // "4 rules recurring, 3 seen once" is about the frontline record, not a
    // pill, so a count is only read as a pill's when nothing else qualifies it.
    const notAPillCount = /recurring|seen once|not in the record|drafted|candidate/i;
    const stated = new Set<number>();
    for (const match of submission.matchAll(/(?<![\d.])(\d+) rules\b([^.\n]{0,30})/g)) {
      if (notAPillCount.test(match[2])) continue;
      stated.add(Number(match[1]));
    }
    expect(stated.size, 'the submission states no pill rule count at all').toBeGreaterThan(0);
    const real = new Set(pills.map((pill) => pill.rules));
    for (const count of stated) {
      expect(real, `the submission says a pill has ${count} rules; the pills have ${[...real].join(' and ')}`).toContain(count);
    }
  });

  it('names the versions the pills actually carry', () => {
    const versions = new Set(pills.map((pill) => pill.version));
    // Every vX.Y.Z in the submission is either a pill's current version, or the
    // next one the learning demo proposes (described as a proposal throughout).
    const proposed = new Set(['1.3.0', '1.4.0']);
    for (const cited of new Set(submission.match(/\bv(\d+\.\d+\.\d+)\b/g) ?? [])) {
      const bare = cited.slice(1);
      if (proposed.has(bare)) continue;
      expect(versions, `${cited} is cited but no pill is at that version`).toContain(bare);
    }
  });

  it('does not promise more eval cases than exist', () => {
    const total = pills.reduce((n, pill) => n + pill.evals, 0);
    expect(total).toBeGreaterThan(0);
    // "six closed incidents" is the claim the shadow-replay beat rests on.
    const six = pills.find((pill) => pill.id === 'technical-services-chilled-water-leak')!.evals;
    if (/six closed incidents/i.test(submission)) expect(six).toBe(6);
    if (/\b6 closed incidents\b/.test(submission)) expect(six).toBe(6);
  });
});

describe('the claim the whole submission rests on', () => {
  it('holds: nothing in the engine imports a model', () => {
    const engine = join(ROOT, 'lib/engine');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== '__tests__') walk(path);
          continue;
        }
        if (!entry.name.endsWith('.ts')) continue;
        const source = readFileSync(path, 'utf8');
        if (/from ['"][^'"]*\/(llm|ai)['"]|from ['"]@\/lib\/llm/.test(source)) offenders.push(path);
      }
    };
    walk(engine);
    expect(offenders, 'the deterministic engine imports a model path').toEqual([]);
  });
});

describe('the limits the submission promises to state', () => {
  const submissionDoc = read('docs/SUBMISSION.md');
  const formAnswers = read('docs/submission/form-answers.md');

  // A disclosure paragraph was deleted once in a routine edit and found by
  // chance. These make deleting one a failing test.
  it('says the people and the data are fictional, where a judge will read it', () => {
    for (const doc of [submissionDoc, formAnswers]) {
      expect(doc).toMatch(/fictional/i);
      expect(doc, 'the scripted interview is the claim that needs disclosing, not just "fictional data"').toMatch(
        /script(ed)?[^.]*interview|interview[^.]*script/i,
      );
    }
  });

  it('describes the governance record as it actually is', () => {
    // This assertion used to require the opposite — that the submission said
    // the record was NOT persisted — and it failed the moment the ledger went
    // in, which is the point of attaching prose to the system. If the ledger
    // is ever removed, this fails again and the prose has to come back.
    const ledger = existsSync(join(ROOT, 'lib/governance/ledger.ts'));
    for (const doc of [submissionDoc, formAnswers]) {
      if (ledger) {
        expect(doc, 'the durable record exists and the submission has to say so').toMatch(/Postgres|durable/i);
        expect(doc, 'and has to be equally plain about what is still session-only').toMatch(
          /session|browser/i,
        );
      } else {
        expect(doc).toMatch(/browser session|not persist|localStorage/i);
      }
    }
  });

  it('does not claim the engine reads from the record', () => {
    // The ledger is outside every decision path. If something in lib/engine
    // ever imports it, the claim above is false.
    const engine = join(ROOT, 'lib/engine');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== '__tests__') walk(path);
        } else if (entry.name.endsWith('.ts')) {
          // An import, not the word: lib/engine/schema.ts calls pill files
          // governance artefacts in a comment, which is not a dependency.
          const source = readFileSync(path, 'utf8');
          if (/from ['"][^'"]*(?:governance|ledger)['"]/.test(source)) offenders.push(path);
        }
      }
    };
    walk(engine);
    expect(offenders, 'the engine reaches into governance').toEqual([]);
  });

  it('still names which tool built which layer', () => {
    expect(submissionDoc).toMatch(/\*\*CodeBuddy Code\.\*\*/);
    expect(submissionDoc, 'the second tool’s contribution was deleted once already').toMatch(/\*\*Claude Code\.\*\*/);
  });

  it('keeps the session store and the durable record as two different things', () => {
    expect(read('lib/governance/store.ts')).toMatch(/localStorage|persist/);
    // The mirror must stay fire-and-forget: an awaited write in the store
    // would put the record in the path of a decision.
    expect(read('lib/governance/mirror.ts')).toMatch(/fire-and-forget/i);
  });
});
