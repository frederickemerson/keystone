// Cross-file consistency of the demo's source of truth: pills/** and data/**.
//
// Reads the authored files directly (node:fs + js-yaml) and never imports the
// engine, so it guards the CONTENT independently of how lib/engine parses it:
//   1. evidence vocabulary — every key a rule reads, a timeline emits or an
//      eval sets is declared in a pill's evidence.yaml, with a matching type;
//   3. provenance — every rule resolves to the expert turn it was extracted
//      from, and the provenance quote is a verbatim substring of that turn;
//   4. roles — every role referenced anywhere exists in data/roles.json with
//      a named persona;
//   6. fixtures / incidents — pill versions, rule ids and recorded LLM
//      outputs point at things that exist;
//   7. evidence ingestion — the binding table that POST /api/ingest maps with
//      reports only keys its connector owns, and never binds a feed that
//      cannot confirm gate evidence to a key that can gate a rule.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { INGEST_SOURCES } from "@/lib/ingest/sources";
import { approvalGrantSchema } from "../schemas";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const json = <T = any>(rel: string): T => JSON.parse(read(rel)) as T;
const yamlFile = <T = any>(rel: string): T => yaml.load(read(rel)) as T;

// ---------------------------------------------------------------------------
// Load everything once
// ---------------------------------------------------------------------------

type Cond = { path: string; op: string; value?: unknown };
type Rule = {
  id: string;
  trigger: { incident_type: string; all: Cond[]; any: Cond[] };
  required_evidence: string[];
  forbidden_actions: string[];
  exceptions: {
    when: Cond[];
    note: string;
    add_required_evidence?: string[];
    escalate_to?: { role: string; fallback?: string };
  }[];
  action_class: string;
  forbidden_if_missing_evidence: boolean;
  escalate_to: { role: string; fallback?: string };
  owner: string;
  deadline_minutes: number | null;
  asset_overrides?: Record<string, { escalate_to?: { role: string; fallback?: string } }>;
  provenance: string[];
};
type EvidenceDecl = { label: string; type: "boolean" | "number" | "string"; confirmable_by: string[]; description: string };

interface PillFolder {
  ref: string; // "<domain>/<name>"
  dir: string;
  manifest: any;
  rules: Rule[];
  catalogue: Record<string, EvidenceDecl>;
  provenance: any;
  evals: { file: string; doc: any }[];
}

function loadPills(): PillFolder[] {
  const out: PillFolder[] = [];
  for (const domain of readdirSync(join(ROOT, "pills"))) {
    const domainDir = join("pills", domain);
    if (domain.startsWith(".") || !statSync(join(ROOT, domainDir)).isDirectory()) continue;
    for (const name of readdirSync(join(ROOT, domainDir))) {
      const dir = join(domainDir, name);
      if (!existsSync(join(ROOT, dir, "SKILL.md"))) continue;
      const fm = read(join(dir, "SKILL.md")).match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const evalDir = join(dir, "evals");
      out.push({
        ref: `${domain}/${name}`,
        dir,
        manifest: yaml.load(fm![1]),
        rules: yamlFile<Rule[]>(join(dir, "rules.yaml")),
        catalogue: existsSync(join(ROOT, dir, "evidence.yaml")) ? yamlFile(join(dir, "evidence.yaml")) : {},
        provenance: json(join(dir, "provenance.json")),
        evals: existsSync(join(ROOT, evalDir))
          ? readdirSync(join(ROOT, evalDir))
              .filter((f) => f.endsWith(".yaml"))
              .sort()
              .map((f) => ({ file: f, doc: yamlFile(join(evalDir, f)) }))
          : [],
      });
    }
  }
  return out;
}

const PILLS = loadPills();
const ALL_RULES = PILLS.flatMap((p) => p.rules);
const RULE_IDS = new Set(ALL_RULES.map((r) => r.id));
const ROLES: any[] = json("data/roles.json");
const ROLE_IDS = new Set(ROLES.map((r) => r.role));
const INCIDENTS: any[] = json("data/incidents.json");
const ASSETS: any[] = json("data/assets.json");
const TIMELINES: Record<string, any> = Object.fromEntries(
  readdirSync(join(ROOT, "data/timelines"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => [f.replace(/\.json$/, ""), json(join("data/timelines", f))]),
);
const TRANSCRIPTS: Record<string, any> = Object.fromEntries(
  readdirSync(join(ROOT, "data/transcripts"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => [f.replace(/\.json$/, ""), json(join("data/transcripts", f))]),
);
const FIXTURES = "data/fixtures/llm";

/** Union of all pill catalogues (a key declared by two pills must agree on type). */
const DECLARED: Record<string, EvidenceDecl> = {};
for (const p of PILLS) for (const [k, d] of Object.entries(p.catalogue)) DECLARED[k] ??= d;

const evidenceKey = (path: string) => (path.startsWith("evidence.") ? path.slice("evidence.".length) : null);

function ruleConditions(r: Rule): Cond[] {
  return [...r.trigger.all, ...r.trigger.any, ...r.exceptions.flatMap((e) => e.when)];
}

/** Every key that can gate a rule: base required + every exception-added key. */
function gatingKeys(r: Rule): string[] {
  return [...r.required_evidence, ...r.exceptions.flatMap((e) => e.add_required_evidence ?? [])];
}

function valueMatchesType(value: unknown, type: EvidenceDecl["type"]): boolean {
  return typeof value === type;
}

/** "<interview>#HH:MM:SS" → the turn, or a reason it does not resolve. */
function resolveRef(ref: string): { turn?: any; transcript?: any; error?: string } {
  const [source, t] = ref.split("#");
  const transcript = TRANSCRIPTS[source];
  if (!transcript) return { error: `no transcript data/transcripts/${source}.json` };
  const turn = transcript.turns.find((x: any) => x.t === t);
  if (!turn) return { error: `${source} has no turn at ${t}` };
  return { turn, transcript };
}

const PROBE_LIBRARY = new Set(Array.from({ length: 31 }, (_, i) => `P${String(i + 1).padStart(2, "0")}`));
const toSeconds = (hms: string) => hms.split(":").reduce((acc, n) => acc * 60 + Number(n), 0);

// ---------------------------------------------------------------------------
// 1. Evidence vocabulary
// ---------------------------------------------------------------------------

describe("1. evidence vocabulary (pills/*/*/evidence.yaml)", () => {
  it("every pill ships an evidence catalogue with well-formed entries", () => {
    for (const p of PILLS) {
      expect(Object.keys(p.catalogue).length, `${p.ref}/evidence.yaml`).toBeGreaterThan(0);
      for (const [key, d] of Object.entries(p.catalogue)) {
        const where = `${p.ref} evidence.${key}`;
        expect(typeof d.label, where).toBe("string");
        expect(["boolean", "number", "string"], where).toContain(d.type);
        expect(typeof d.description, where).toBe("string");
        expect(Array.isArray(d.confirmable_by) && d.confirmable_by.length > 0, where).toBe(true);
      }
    }
  });

  it("a key declared by more than one pill has the same type everywhere", () => {
    for (const p of PILLS)
      for (const [key, d] of Object.entries(p.catalogue)) expect(d.type, `${p.ref} ${key}`).toBe(DECLARED[key].type);
  });

  it("every evidence.* path in triggers and exceptions is declared by the rule's own pill, with a valid op/value", () => {
    for (const p of PILLS)
      for (const r of p.rules)
        for (const c of ruleConditions(r)) {
          const where = `${p.ref} ${r.id} ${c.path} ${c.op}`;
          expect(["eq", "neq", "gt", "gte", "lt", "lte", "in", "exists"], where).toContain(c.op);
          if (c.op === "exists") expect("value" in c, `${where}: exists takes no value`).toBe(false);
          if (c.op === "in") expect(Array.isArray(c.value), `${where}: in takes an array`).toBe(true);
          const key = evidenceKey(c.path);
          if (key === null) {
            expect(["asset.type", "asset.id", "incident.type"], where).toContain(c.path);
            continue;
          }
          const decl = p.catalogue[key];
          expect(decl, `${where}: undeclared in ${p.ref}/evidence.yaml`).toBeDefined();
          if (c.op === "exists") continue;
          const values = c.op === "in" ? (c.value as unknown[]) : [c.value];
          for (const v of values) expect(valueMatchesType(v, decl.type), `${where}: value ${String(v)} is not ${decl.type}`).toBe(true);
        }
  });

  it("every gating key (required_evidence + exception add_required_evidence) is declared by the rule's own pill and is boolean", () => {
    for (const p of PILLS)
      for (const r of p.rules)
        for (const key of gatingKeys(r)) {
          expect(p.catalogue[key], `${p.ref} ${r.id} requires undeclared ${key}`).toBeDefined();
          expect(p.catalogue[key].type, `${p.ref} ${r.id} ${key}`).toBe("boolean");
        }
  });

  it("no timeline event emits a key that no pill declares, and every value matches its declared type", () => {
    for (const [id, tl] of Object.entries(TIMELINES))
      for (const ev of tl.events)
        for (const [key, upd] of Object.entries<any>(ev.evidence_updates)) {
          const where = `${id} ${ev.id} ${key}`;
          expect(DECLARED[key], `${where}: undeclared evidence key`).toBeDefined();
          expect(valueMatchesType(upd.value, DECLARED[key].type), `${where}: ${JSON.stringify(upd.value)} is not ${DECLARED[key].type}`).toBe(true);
        }
  });

  it("no timeline pre-records a required sign-off as confirmed false (unknown = absent)", () => {
    const required = new Set(ALL_RULES.flatMap(gatingKeys));
    for (const [id, tl] of Object.entries(TIMELINES))
      for (const ev of tl.events)
        for (const [key, upd] of Object.entries<any>(ev.evidence_updates))
          if (required.has(key)) expect(upd.value === false && upd.confirmed === true, `${id} ${ev.id} ${key}`).toBe(false);
  });

  it("eval evidence uses only keys declared by the eval's pill, with matching types", () => {
    for (const p of PILLS)
      for (const { file, doc } of p.evals)
        for (const [key, value] of Object.entries(doc.evidence ?? {})) {
          const decl = p.catalogue[key];
          expect(decl, `${p.ref}/evals/${file}: undeclared ${key}`).toBeDefined();
          expect(valueMatchesType(value, decl.type), `${p.ref}/evals/${file}: ${key}`).toBe(true);
        }
  });
});

// ---------------------------------------------------------------------------
// Evals — shape of the expert's ground truth
// ---------------------------------------------------------------------------

describe("evals (expert ground truth)", () => {
  const STATUSES = ["allowed", "blocked", "needs_approval", "escalate", "not_applicable"];

  it("every eval states an expectation for every rule of its pill, and nothing else", () => {
    for (const p of PILLS)
      for (const { file, doc } of p.evals) {
        expect(doc.id, file).toBe(file.replace(/\.yaml$/, ""));
        expect(Object.keys(doc.expected_decisions).sort(), `${p.ref}/evals/${file}`).toEqual(p.rules.map((r) => r.id).sort());
        for (const [rid, e] of Object.entries<any>(doc.expected_decisions)) {
          expect(STATUSES, `${file} ${rid}`).toContain(e.status);
          expect(typeof e.reason, `${file} ${rid}`).toBe("string");
        }
        expect("pass" in doc, `${file}: pass/fail is an engine result, not an authored field`).toBe(false);
      }
  });

  it("exactly one intentional failure in the approved versions: the tenant-area isolation deadline (TS-02, expected 10, rule 15)", () => {
    const mismatches: string[] = [];
    for (const p of PILLS)
      for (const { file, doc } of p.evals)
        for (const [rid, e] of Object.entries<any>(doc.expected_decisions)) {
          if (!("deadline_minutes" in e)) continue;
          const rule = p.rules.find((r) => r.id === rid)!;
          if (rule.deadline_minutes !== e.deadline_minutes)
            mismatches.push(`${file}:${rid}:${e.deadline_minutes}!=${rule.deadline_minutes}`);
        }
    expect(mismatches).toEqual(["eval-2025-09-tenant-area-isolation-deadline.yaml:TS-02:10!=15"]);
  });
});

// ---------------------------------------------------------------------------
// 3. Provenance
// ---------------------------------------------------------------------------

describe("3. provenance resolves to the expert's own words", () => {
  it("every rules.yaml provenance ref is an expert turn that extracted that rule", () => {
    for (const p of PILLS)
      for (const r of p.rules) {
        expect(r.provenance.length, `${p.ref} ${r.id}`).toBeGreaterThan(0);
        for (const ref of r.provenance) {
          const { turn, transcript, error } = resolveRef(ref);
          expect(error, `${p.ref} ${r.id} ${ref}`).toBeUndefined();
          expect(turn.speaker, `${r.id} ${ref} is not an expert turn`).toBe(transcript.expert.name);
          expect(turn.extracted_rule_ids ?? [], `${r.id} ${ref}`).toContain(r.id);
        }
      }
  });

  it("provenance.json covers exactly the pill's rules and each quote is verbatim from the cited expert turn", () => {
    for (const p of PILLS) {
      const prov = p.provenance;
      expect(prov.pill).toBe(p.ref);
      expect(prov.version, `${p.ref} provenance version`).toBe(p.manifest.version);
      const transcript = TRANSCRIPTS[prov.source_interview];
      expect(transcript, `${p.ref}: ${prov.source_interview}`).toBeDefined();
      expect(prov.expert.name).toBe(transcript.expert.name);
      expect(Object.keys(prov.rules).sort()).toEqual(p.rules.map((r) => r.id).sort());
      for (const r of p.rules) {
        const entry = prov.rules[r.id];
        const where = `${p.ref} ${r.id}`;
        expect(entry.source, where).toBe(prov.source_interview);
        expect(r.provenance[0], `${where}: rules.yaml primary ref`).toBe(`${entry.source}#${entry.start}`);
        const { turn, error } = resolveRef(`${entry.source}#${entry.start}`);
        expect(error, where).toBeUndefined();
        expect(turn.speaker, where).toBe(transcript.expert.name);
        expect(turn.extracted_rule_ids ?? [], where).toContain(r.id);
        expect(turn.text.includes(entry.quote), `${where}: quote is not verbatim from ${entry.start}`).toBe(true);
        expect(toSeconds(entry.end), where).toBeGreaterThan(toSeconds(entry.start));
        expect(["confirmed", "edited", "rejected"], where).toContain(entry.confirmation);
        expect(entry.confirmed_by, where).toBe(transcript.expert.name);
      }
    }
  });

  it("transcripts are well-formed: ordered, ≤ 35 min, library probe ids, known rule ids", () => {
    for (const [id, tr] of Object.entries(TRANSCRIPTS)) {
      expect(toSeconds(tr.duration), id).toBeLessThanOrEqual(35 * 60);
      let prev = -1;
      for (const turn of tr.turns) {
        const s = toSeconds(turn.t);
        expect(s, `${id} ${turn.t} out of order`).toBeGreaterThan(prev);
        expect(s, `${id} ${turn.t} past duration`).toBeLessThanOrEqual(toSeconds(tr.duration));
        prev = s;
        expect(["Keystone", tr.expert.name], `${id} ${turn.t}`).toContain(turn.speaker);
        if (turn.probe_id) expect(PROBE_LIBRARY.has(turn.probe_id.split("-")[0]), `${id} ${turn.t} ${turn.probe_id}`).toBe(true);
        for (const rid of turn.extracted_rule_ids ?? []) expect(RULE_IDS.has(rid), `${id} ${turn.t} ${rid}`).toBe(true);
        if (turn.speaker === "Keystone") expect(turn.extracted_rule_ids, `${id} ${turn.t}`).toBeUndefined();
      }
      for (const rid of Object.keys(tr.extracted_rules_summary)) expect(RULE_IDS.has(rid), `${id} summary ${rid}`).toBe(true);
    }
  });

  it("keeps the story anchors: the 00:14:32 LEW line and the 00:23:10 contradiction exchange", () => {
    const ce = TRANSCRIPTS["ce-interview-2026-10-02"];
    const lew = ce.turns.find((t: any) => t.t === "00:14:32");
    expect(lew.extracted_rule_ids).toContain("TS-07");
    expect(lew.text).toContain("never re-energise before the LEW signs off");
    const probe = ce.turns.find((t: any) => t.t === "00:23:10");
    expect(probe.probe_id).toBe("P28");
  });

  it("contradiction fragments are verbatim from the turns they cite (transcript + fixture)", () => {
    const fixture = json(join(FIXTURES, "contradiction.json")).contradiction;
    const ce = TRANSCRIPTS["ce-interview-2026-10-02"];
    for (const c of [ce.contradiction_detected, fixture]) {
      for (const s of [c.statement_a, c.statement_b]) {
        const turn = ce.turns.find((t: any) => t.t === s.t);
        expect(turn?.speaker, s.t).toBe(ce.expert.name);
        expect(turn.text.includes(s.text_fragment), `${s.t}: "${s.text_fragment}"`).toBe(true);
      }
    }
    expect(RULE_IDS.has(fixture.rule_id)).toBe(true);
    expect(RULE_IDS.has(ce.contradiction_detected.resolution.resolved_rule_id)).toBe(true);
    expect(ce.turns.find((t: any) => t.t === ce.contradiction_detected.resolution.t)?.extracted_rule_ids).toContain(fixture.rule_id);
  });
});

// ---------------------------------------------------------------------------
// 4. Roles
// ---------------------------------------------------------------------------

describe("4. roles", () => {
  it("every role has a named persona; one persona per role; grants from the schema enum", () => {
    const grants = new Set<string>(approvalGrantSchema.options);
    const persons = ROLES.map((r) => r.person);
    for (const r of ROLES) {
      expect(typeof r.person === "string" && r.person.length > 0, r.role).toBe(true);
      for (const g of r.can_approve) expect(grants.has(g), `${r.role}: ${g}`).toBe(true);
    }
    expect(new Set(persons).size).toBe(persons.length);
    expect(ROLE_IDS.size).toBe(ROLES.length);
  });

  it("governance responsibilities sit with the right roles", () => {
    const role = (id: string) => ROLES.find((r) => r.role === id);
    for (const p of PILLS) expect(p.manifest.approver, p.ref).toBe("head_technical_services");
    expect(role("asset_operations_manager").can_approve).toContain("requires_approval actions");
    expect(role("head_technical_services").can_approve).toContain("pill version promotion (final approver for commercial-sensitivity pills)");
    const ts07 = ALL_RULES.find((r) => r.id === "TS-07")!;
    expect(ts07.escalate_to.role).toBe("duty_lew");
    const ts = PILLS.find((p) => p.ref === "technical-services/chilled-water-leak")!;
    expect(ts.catalogue.lew_signoff.confirmable_by).toEqual(["duty_lew"]);
  });

  it("every role referenced in pills and data exists in data/roles.json", () => {
    const refs: [string, string][] = [];
    const add = (where: string, role?: string) => role !== undefined && refs.push([where, role]);
    for (const p of PILLS) {
      const m = p.manifest;
      add(`${p.ref} owner`, m.owner);
      add(`${p.ref} steward`, m.steward);
      add(`${p.ref} approver`, m.approver);
      for (const k of ["roles_allowed", "roles_read_only", "denied"]) for (const r of m.access?.[k] ?? []) add(`${p.ref} access.${k}`, r);
      for (const r of p.rules) {
        add(`${r.id} owner`, r.owner);
        add(`${r.id} escalate_to`, r.escalate_to.role);
        add(`${r.id} escalate_to.fallback`, r.escalate_to.fallback);
        for (const [asset, o] of Object.entries(r.asset_overrides ?? {})) {
          add(`${r.id} ${asset} override`, o.escalate_to?.role);
          add(`${r.id} ${asset} override fallback`, o.escalate_to?.fallback);
        }
        for (const e of r.exceptions) add(`${r.id} exception`, e.escalate_to?.role);
      }
      for (const [k, d] of Object.entries(p.catalogue)) for (const r of d.confirmable_by) add(`${p.ref} evidence.${k}`, r);
    }
    for (const inc of INCIDENTS)
      for (const a of inc.actions ?? []) {
        add(`${inc.id} ${a.rule_id}`, a.escalate_to?.role);
        add(`${inc.id} ${a.rule_id} fallback`, a.escalate_to?.fallback);
      }
    for (const a of ASSETS) for (const person of a.people) add(`${a.id} ${person.name}`, person.role_id);
    for (const d of json(join(FIXTURES, "tenant-message-INC-2026-1011.json")).drafts) add(`tenant-message ${d.draft_id}`, d.approved_by_role);
    for (const c of json(join(FIXTURES, "extraction.json")).rule_candidates) {
      add(`extraction ${c.rule_id} owner`, c.owner);
      add(`extraction ${c.rule_id} escalate_to`, c.escalate_to.role);
      add(`extraction ${c.rule_id} fallback`, c.escalate_to.fallback);
      for (const o of Object.values<any>(c.asset_overrides ?? {})) add(`extraction ${c.rule_id} override`, o.escalate_to?.role);
    }
    const unknown = refs.filter(([, r]) => !ROLE_IDS.has(r)).map(([w, r]) => `${w}: ${r}`);
    expect(unknown).toEqual([]);
  });

  it("asset rosters name the same person roles.json gives each role", () => {
    for (const a of ASSETS)
      for (const person of a.people) {
        const role = ROLES.find((r) => r.role === person.role_id);
        expect(person.name, `${a.id} ${person.role_id}`).toBe(role.person);
        expect(person.role, `${a.id} ${person.name} title`).toBe(role.label);
      }
  });

  it("transcript experts and provenance confirmers are the personas of the pill owners", () => {
    for (const p of PILLS) {
      const owner = ROLES.find((r) => r.role === p.manifest.owner);
      expect(TRANSCRIPTS[p.provenance.source_interview].expert.name, p.ref).toBe(owner.person);
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Incidents and recorded LLM fixtures
// ---------------------------------------------------------------------------

describe("6. incidents and fixtures", () => {
  const versionOf = (ref: string) => PILLS.find((p) => p.ref === ref)?.manifest.version;

  it("every incident applies a pill that exists, at the exact semver on disk", () => {
    for (const inc of INCIDENTS) {
      expect(versionOf(inc.pill_applied), `${inc.id} ${inc.pill_applied}`).toBeDefined();
      expect(inc.pill_version, inc.id).toBe(versionOf(inc.pill_applied));
    }
  });

  it("incident actions name real rules with resolvable provenance; timeline refs exist", () => {
    for (const inc of INCIDENTS) {
      for (const a of inc.actions ?? []) {
        expect(RULE_IDS.has(a.rule_id), `${inc.id} ${a.rule_id}`).toBe(true);
        expect(resolveRef(a.provenance).error, `${inc.id} ${a.rule_id} ${a.provenance}`).toBeUndefined();
        expect(resolveRef(a.provenance).turn.extracted_rule_ids, `${inc.id} ${a.rule_id}`).toContain(a.rule_id);
      }
      if (inc.timeline_ref) expect(existsSync(join(ROOT, inc.timeline_ref)), inc.timeline_ref).toBe(true);
    }
    for (const [id, tl] of Object.entries(TIMELINES)) {
      const inc = INCIDENTS.find((i) => i.id === id);
      expect(inc?.asset_id, id).toBe(tl.asset_id);
      const ids = tl.events.map((e: any) => e.id);
      expect(new Set(ids).size, id).toBe(ids.length);
      const times = tl.events.map((e: any) => Date.parse(e.at));
      expect([...times].sort((a, b) => a - b), `${id} events in time order`).toEqual(times);
    }
  });

  it("extraction candidates are the real rules, anchored to the turns that produced them", () => {
    const ex = json(join(FIXTURES, "extraction.json"));
    expect(ex.source_transcript).toBe("data/transcripts/ce-interview-2026-10-02.json");
    for (const c of ex.rule_candidates) {
      const rule = ALL_RULES.find((r) => r.id === c.rule_id);
      expect(rule, c.rule_id).toBeDefined();
      expect(c.trigger, `${c.rule_id} trigger`).toEqual(rule!.trigger);
      expect(c.required_evidence, `${c.rule_id} required_evidence`).toEqual(rule!.required_evidence);
      expect(c.action_class, c.rule_id).toBe(rule!.action_class);
      for (const cond of [...c.trigger.all, ...(c.trigger.any ?? []), ...c.exceptions.flatMap((e: any) => e.when)])
        if (cond.op === "exists") expect("value" in cond, `${c.rule_id} exists takes no value`).toBe(false);
      for (const ref of c.provenance) {
        const { turn, error } = resolveRef(ref);
        expect(error, `${c.rule_id} ${ref}`).toBeUndefined();
        expect(turn.extracted_rule_ids, `${c.rule_id} ${ref}`).toContain(c.rule_id);
      }
    }
  });

  it("the tenant first notice states no unverified cause and promises no completion time (TE-02/TE-03)", () => {
    const tm = json(join(FIXTURES, "tenant-message-INC-2026-1011.json"));
    const te01 = ALL_RULES.find((r) => r.id === "TE-01")!;
    // Phrases the rules themselves forbid, quoted in their forbidden_actions.
    const forbidden = ["TE-02", "TE-03"]
      .flatMap((id) => ALL_RULES.find((r) => r.id === id)!.forbidden_actions)
      .flatMap((a) => [...a.matchAll(/'([^']+)'/g)].map((m) => m[1].split("[")[0].trim().toLowerCase()))
      .filter((p) => p.length > 0);
    expect(forbidden.length).toBeGreaterThan(0);
    const timeline = TIMELINES[tm.source_incident];
    for (const d of tm.drafts) {
      // At drafting time the source was not confirmed, so TE-03 applies.
      const sourceConfirmed = timeline.events.some(
        (e: any) => Date.parse(e.at) <= Date.parse(tm.generated_at) && e.evidence_updates.source_confirmed?.value === true,
      );
      expect(sourceConfirmed).toBe(false);
      const body = d.body.toLowerCase();
      for (const phrase of forbidden) expect(body.includes(phrase), `draft ${d.draft_id} contains "${phrase}"`).toBe(false);
      expect(d.sla_first_notice_deadline_min).toBe(te01.deadline_minutes);
      expect(Date.parse(d.sla_first_notice_deadline) - Date.parse(d.sla_first_notice_clock_start)).toBe(
        d.sla_first_notice_deadline_min * 60_000,
      );
      expect(d.approved_by_role).toBe(te01.escalate_to.role);
    }
  });

  it("recorded AI proposals are gated by a real rule and anchored to a real timeline event", () => {
    const files = readdirSync(join(ROOT, FIXTURES)).filter((f) => f.startsWith("ai-proposals-"));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const fx = json(join(FIXTURES, f));
      expect(f).toBe(`ai-proposals-${fx.source_incident}.json`);
      const tl = TIMELINES[fx.source_incident];
      for (const p of fx.proposals) {
        expect(RULE_IDS.has(p.rule_id), `${f} ${p.rule_id}`).toBe(true);
        expect(tl.events.map((e: any) => e.id), `${f} ${p.proposed_after_event}`).toContain(p.proposed_after_event);
      }
    }
  });

  it("incident summaries cite real rules", () => {
    for (const f of readdirSync(join(ROOT, FIXTURES)).filter((x) => x.startsWith("incident-summary-")))
      for (const k of json(join(FIXTURES, f)).summary.key_decisions) expect(RULE_IDS.has(k.rule_id), `${f} ${k.rule_id}`).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. Evidence ingestion — the binding table against the connectors and pills
// ---------------------------------------------------------------------------

describe("7. evidence ingestion bindings (lib/ingest/sources.ts)", () => {
  const CONNECTOR_ROWS: { id: string; evidenceKeys?: string[]; canConfirmGateEvidence: boolean; label: string }[] =
    json("data/connectors.json");
  const GATING = new Set(ALL_RULES.flatMap(gatingKeys));
  const row = (id: string) => CONNECTOR_ROWS.find((c) => c.id === id);

  it("binds every signal to a key its own connector may report, and some pill declares", () => {
    // Guard against a vacuous pass: there is a table, and gating keys exist.
    expect(Object.keys(INGEST_SOURCES).length).toBeGreaterThan(0);
    expect(GATING.has("shutoff_map_available")).toBe(true);
    for (const [system, source] of Object.entries(INGEST_SOURCES)) {
      const connector = row(source.connectorId);
      expect(connector, `${system}: ${source.connectorId}`).toBeDefined();
      expect(Object.keys(source.bindings).length, system).toBeGreaterThan(0);
      for (const [signal, binding] of Object.entries(source.bindings)) {
        const where = `${system}.${signal}`;
        expect(connector!.evidenceKeys ?? [], where).toContain(binding.key);
        expect(DECLARED[binding.key], `${where}: ${binding.key} undeclared`).toBeDefined();
        expect(DECLARED[binding.key].type, where).toBe("boolean");
      }
    }
  });

  it("never binds a feed that cannot confirm gate evidence to a key that can gate a rule", () => {
    const offenders: string[] = [];
    for (const [system, source] of Object.entries(INGEST_SOURCES)) {
      if (row(source.connectorId)!.canConfirmGateEvidence) continue;
      for (const [signal, binding] of Object.entries(source.bindings))
        if (GATING.has(binding.key)) offenders.push(`${system}.${signal} → ${binding.key}`);
    }
    expect(offenders).toEqual([]);
    // The filter above is real: one binding IS a gating key, on a connector that may hold one.
    expect(GATING.has(INGEST_SOURCES.cmms.bindings.isolation_diagram.key)).toBe(true);
    expect(row("cmms_work_orders")!.canConfirmGateEvidence).toBe(true);
  });
});
