// Landing-page facts, derived from the real pills on disk at build time.
// Server-only (reads pills/ via lib/pills/load). Nothing here is a hardcoded
// copy of pill content: if the pill changes, the landing page changes with it.

import { loadAllPills, loadPill, type PillBundle } from '@/lib/pills/load';
import { loadAssets, loadRoles, loadTimeline, loadTranscript } from '@/lib/data';
import type { Timeline } from '@/lib/data/schemas';
import { pillTitle } from '@/components/mosaic/pillTitle';
import { runEvals } from '@/lib/engine';
import type { ActionClass, EvalCase, Pill, Rule } from '@/lib/engine/types';
import { parseDemoVideoUrl, type DemoVideo } from './video';

/**
 * The walkthrough video shown under "See it in action". Leave empty for the
 * "coming soon" poster. NEXT_PUBLIC_DEMO_VIDEO_URL, when set, wins over this.
 * Accepts a YouTube or Vimeo link, an .mp4/.webm URL, or a path under public/.
 */
export const DEMO_VIDEO_URL = '';

/** The pill and rule the hero shows: the LEW re-energisation gate. */
const HERO_PILL_ID = 'technical-services-chilled-water-leak';
const HERO_RULE_ID = 'TS-07';

export interface HeroFacts {
  pillId: string;
  pillName: string;
  pillClass: string;
  version: string;
  ruleId: string;
  ruleTitle: string;
  /** Evidence keys the rule is blocked on until confirmed. */
  gateEvidence: string[];
  /** The opening sentence of the expert's quote for this rule. */
  quoteFragment: string;
  expert: string;
  timestamp: string;
}

export interface ClassExample {
  actionClass: ActionClass;
  /** Rules of this class across every approved pill. */
  count: number;
  example: { id: string; title: string };
}

/** One line of the incident feed shown at step III. */
export interface StoryFeedLine {
  time: string;
  label: string;
  key: string;
}

/** Facts for the scroll-driven "How it works" story. All derived from disk. */
export interface StoryFacts {
  /** The expert's job title, from data/roles.json. */
  expertRole: string;
  ruleTrigger: string;
  incidentId: string;
  incidentAsset: string;
  feed: StoryFeedLine[];
  /** Required evidence still missing after the last feed line (non-empty ⇒ blocked). */
  missing: string[];
  learn: {
    fromVersion: string;
    toVersion: string;
    ruleId: string;
    fromDeadline: number;
    toDeadline: number;
    /** Past incidents replayed against the corrected version. */
    evalCount: number;
    /** Of those, how many pass every assertion on the corrected version. */
    evalPassed: number;
  } | null;
  reuse: {
    fromAsset: string;
    fromRole: string;
    toAsset: string;
    toRole: string;
    addedEvidence: string[];
    addedEvidenceLabels: string[];
  };
}

/** Facts for "The problem": the same expert and incident, without Keystone. */
export interface ProblemFacts {
  expert: string;
  expertRole: string;
  /** From the expert's onboarding interview record. */
  experienceYears: number;
  incidentAsset: string;
  /** hh:mm the incident confirms the gate's trigger: electrical equipment wetted by water. */
  electricsWetAt: string;
  /** hh:mm the LEW's insulation-resistance test (a gate check) passed. */
  insulationPassedAt: string;
  /** hh:mm the area was first confirmed dry (the gate check still open at the test). */
  areaDryAt: string;
}

export interface LandingFacts {
  hero: HeroFacts;
  story: StoryFacts;
  problem: ProblemFacts;
  classes: ClassExample[];
  video: DemoVideo | null;
}

function humanize(slug: string): string {
  return slug
    .split(/[-_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** "never re-energise before the LEW signs off. If there is…" → first sentence. */
function firstSentence(text: string): string {
  const match = text.match(/^.+?[.!?](?=\s|$)/);
  return (match ? match[0] : text).trim();
}

function heroFacts(bundle: PillBundle): HeroFacts {
  const rule = bundle.pill.rules.find((r) => r.id === HERO_RULE_ID);
  const prov = bundle.pill.provenance[HERO_RULE_ID];
  if (!rule || !prov) {
    throw new Error(`landing: ${bundle.path} has no ${HERO_RULE_ID} rule with provenance`);
  }
  return {
    pillId: bundle.id,
    pillName: pillTitle(bundle),
    pillClass: humanize(bundle.domain),
    version: bundle.pill.manifest.version,
    ruleId: rule.id,
    ruleTitle: rule.title,
    gateEvidence: rule.forbidden_if_missing_evidence ? rule.required_evidence : [],
    quoteFragment: firstSentence(prov.quote),
    expert: prov.confirmed_by,
    timestamp: prov.start,
  };
}

const STORY_INCIDENT_ID = 'INC-2026-1011';

function hhmm(iso: string): string {
  return iso.slice(11, 16);
}

function bumpMinor(version: string): string {
  const [major, minor] = version.split('.').map(Number);
  return `${major}.${minor + 1}.0`;
}

function storyFacts(bundle: PillBundle): StoryFacts {
  const { pill } = bundle;
  const rule = pill.rules.find((r) => r.id === HERO_RULE_ID)!;
  const catalog = pill.evidenceCatalog;
  const label = (key: string) => catalog[key]?.label ?? humanize(key);

  // Step III: the incident feed around the moment the rule triggers.
  const timeline = loadTimeline(STORY_INCIDENT_ID);
  if (!timeline) throw new Error(`landing: timeline ${STORY_INCIDENT_ID} not found`);
  const triggerKeys = rule.trigger.all.map((c) => c.path.replace(/^evidence\./, ''));
  const triggerIndex = timeline.events.findIndex((e) =>
    triggerKeys.some((k) => e.evidence_updates[k]?.value === true && e.evidence_updates[k]?.confirmed),
  );
  if (triggerIndex < 0) throw new Error(`landing: ${STORY_INCIDENT_ID} never triggers ${HERO_RULE_ID}`);
  const around = timeline.events.slice(Math.max(0, triggerIndex - 2), triggerIndex + 2);
  const feed = around.map((e) => {
    const key =
      Object.keys(e.evidence_updates).find(
        (k) => e.evidence_updates[k].value === true && e.evidence_updates[k].confirmed,
      ) ?? Object.keys(e.evidence_updates)[0];
    return { time: hhmm(e.at), key, label: label(key) };
  });
  const known: Record<string, { value: unknown; confirmed: boolean }> = {};
  for (const e of timeline.events.slice(0, triggerIndex + 2)) Object.assign(known, e.evidence_updates);
  const missing = rule.required_evidence.filter((k) => !(known[k]?.value === true && known[k]?.confirmed));

  // Step IV: the eval that disagrees with a rule's deadline is the correction
  // the learning loop ships as the next minor version. Replay every eval
  // against that corrected pill so the ticks shown are the engine's verdict.
  let learn: StoryFacts['learn'] = null;
  const cases: EvalCase[] = Object.values(pill.evals);
  for (const ev of cases) {
    for (const [ruleId, expected] of Object.entries(ev.expected)) {
      const target = pill.rules.find((r) => r.id === ruleId);
      if (
        !learn &&
        target &&
        typeof expected.deadline_minutes === 'number' &&
        typeof target.deadline_minutes === 'number' &&
        expected.deadline_minutes !== target.deadline_minutes
      ) {
        const toDeadline = expected.deadline_minutes;
        const corrected: Pill = {
          ...pill,
          rules: pill.rules.map((r) => (r.id === ruleId ? { ...r, deadline_minutes: toDeadline } : r)),
        };
        const { results } = runEvals(corrected, cases);
        const evalPassed = cases.filter((c) => results.every((r) => r.caseId !== c.id || r.pass)).length;
        learn = {
          fromVersion: pill.manifest.version,
          toVersion: bumpMinor(pill.manifest.version),
          ruleId,
          fromDeadline: target.deadline_minutes,
          toDeadline,
          evalCount: cases.length,
          evalPassed,
        };
      }
    }
  }

  // Step V: the same rule on a data-centre asset, with its override applied.
  const assets = loadAssets();
  const roles = loadRoles();
  const roleLabel = (role: string) => roles.find((r) => r.role === role)?.label ?? humanize(role);
  const fromAsset = assets.find((a) => a.id === timeline.asset_id);
  const dc = assets.find((a) => a.type === 'data_centre' && rule.asset_overrides[a.type]);
  if (!fromAsset || !dc) throw new Error('landing: reuse assets not found');
  const dcRole = rule.asset_overrides[dc.type]?.escalate_to?.role ?? rule.escalate_to.role;
  const addedEvidence = rule.exceptions
    .filter((x) => x.when.some((c) => c.path === 'asset.type' && c.value === dc.type))
    .flatMap((x) => x.add_required_evidence ?? []);

  const expert = pill.provenance[HERO_RULE_ID]?.confirmed_by;
  const expertRole = roles.find((r) => r.person === expert)?.label ?? 'Expert';

  const trigger = rule.trigger.all[0];
  return {
    expertRole,
    ruleTrigger: trigger ? label(trigger.path.replace(/^evidence\./, '')) : rule.trigger.incident_type,
    incidentId: STORY_INCIDENT_ID,
    incidentAsset: timeline.asset_name,
    feed,
    missing,
    learn,
    reuse: {
      fromAsset: fromAsset.name,
      fromRole: roleLabel(rule.escalate_to.role),
      toAsset: dc.name,
      toRole: roleLabel(dcRole),
      addedEvidence,
      addedEvidenceLabels: addedEvidence.map(label),
    },
  };
}

/** hh:mm of the first event that confirms `key` as true. */
function firstConfirmedAt(timeline: Timeline, key: string): string {
  const event = timeline.events.find(
    (e) => e.evidence_updates[key]?.value === true && e.evidence_updates[key]?.confirmed,
  );
  if (!event) throw new Error(`landing: ${timeline.incident_id} never confirms ${key}`);
  return hhmm(event.at);
}

/** Gate evidence the problem story narrates, from the hero rule's required evidence. */
const INSULATION_TEST = 'insulation_resistance_ok';
const AREA_DRY = 'area_dry';

function problemFacts(bundle: PillBundle, story: StoryFacts): ProblemFacts {
  const { pill } = bundle;
  const rule = pill.rules.find((r) => r.id === HERO_RULE_ID)!;
  for (const key of [INSULATION_TEST, AREA_DRY]) {
    if (!rule.required_evidence.includes(key)) {
      throw new Error(`landing: ${HERO_RULE_ID} no longer requires ${key}; rewrite the problem story`);
    }
  }
  const triggerKey = rule.trigger.all[0]?.path.replace(/^evidence\./, '');
  if (!triggerKey) throw new Error(`landing: ${HERO_RULE_ID} has no evidence trigger`);

  const prov = pill.provenance[HERO_RULE_ID];
  const transcript = prov ? loadTranscript(prov.source) : undefined;
  if (!transcript || transcript.expert.name !== prov?.confirmed_by) {
    throw new Error(`landing: interview behind ${HERO_RULE_ID} not found for its expert`);
  }

  const timeline = loadTimeline(story.incidentId);
  if (!timeline) throw new Error(`landing: timeline ${story.incidentId} not found`);

  return {
    expert: transcript.expert.name,
    expertRole: story.expertRole,
    experienceYears: transcript.expert.experience_years,
    incidentAsset: timeline.asset_name,
    electricsWetAt: firstConfirmedAt(timeline, triggerKey),
    insulationPassedAt: firstConfirmedAt(timeline, INSULATION_TEST),
    areaDryAt: firstConfirmedAt(timeline, AREA_DRY),
  };
}

const CLASS_ORDER: ActionClass[] = ['recommend', 'requires_approval', 'must_escalate'];

export function loadLandingFacts(): LandingFacts {
  const heroBundle = loadPill(HERO_PILL_ID);
  if (!heroBundle) throw new Error(`landing: pill ${HERO_PILL_ID} not found`);

  const approved = loadAllPills().filter((b) => b.pill.manifest.status === 'approved');
  const rules: { rule: Rule; isHeroPill: boolean }[] = approved.flatMap((b) =>
    b.pill.rules.map((rule) => ({ rule, isHeroPill: b.id === HERO_PILL_ID })),
  );

  const classes = CLASS_ORDER.map((actionClass) => {
    const ofClass = rules.filter((r) => r.rule.action_class === actionClass);
    // Prefer an example from the hero pill so the page tells one story.
    const pick = ofClass.find((r) => r.isHeroPill) ?? ofClass[0];
    return pick
      ? {
          actionClass,
          count: ofClass.length,
          example: { id: pick.rule.id, title: pick.rule.title },
        }
      : null;
  }).filter((c): c is ClassExample => c !== null);

  const story = storyFacts(heroBundle);
  return {
    hero: heroFacts(heroBundle),
    story,
    problem: problemFacts(heroBundle, story),
    classes,
    video: parseDemoVideoUrl(process.env.NEXT_PUBLIC_DEMO_VIDEO_URL || DEMO_VIDEO_URL),
  };
}
