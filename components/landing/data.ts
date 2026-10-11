// Landing-page facts, derived from the real pills on disk at build time.
// Server-only (reads pills/ via lib/pills/load). Nothing here is a hardcoded
// copy of pill content: if the pill changes, the landing page changes with it.

import { loadAllPills, loadPill, type PillBundle } from '@/lib/pills/load';
import { pillTitle } from '@/components/mosaic/pillTitle';
import type { ActionClass, Rule } from '@/lib/engine/types';

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

export interface LandingFacts {
  hero: HeroFacts;
  classes: ClassExample[];
  rulesTotal: number;
  rulesTraced: number;
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
    pillName: pillTitle(bundle).toLowerCase(),
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

const CLASS_ORDER: ActionClass[] = ['recommend', 'requires_approval', 'must_escalate'];

export function loadLandingFacts(): LandingFacts {
  const heroBundle = loadPill(HERO_PILL_ID);
  if (!heroBundle) throw new Error(`landing: pill ${HERO_PILL_ID} not found`);

  const approved = loadAllPills().filter((b) => b.pill.manifest.status === 'approved');
  const rules: { rule: Rule; traced: boolean; isHeroPill: boolean }[] = approved.flatMap((b) =>
    b.pill.rules.map((rule) => ({
      rule,
      traced: Boolean(b.pill.provenance[rule.id]?.quote?.trim()),
      isHeroPill: b.id === HERO_PILL_ID,
    })),
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

  return {
    hero: heroFacts(heroBundle),
    classes,
    rulesTotal: rules.length,
    rulesTraced: rules.filter((r) => r.traced).length,
  };
}
