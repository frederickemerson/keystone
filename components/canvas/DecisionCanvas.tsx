'use client';

// Decision Canvas — the expert reviews every drafted rule of the live pill
// version. Each tile carries the expert's own words from provenance.json
// (quote + transcript timestamps). Confirm / Edit / Reject and Publish go
// through the governance store: they are attributed, audited, survive
// navigation and reload, and are allowed only for roles the pill's SKILL.md
// `access` block lets change it.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, X, ArrowRight, FileCheck2, Lock } from 'lucide-react';
import { RuleTile, EmptyState, ActionClassChip, CHIP_BASE, TONE_CHIP } from '@/components/mosaic';
import { useMounted } from '@/components/mosaic/useMounted';
import { expertQuoteFor } from '@/components/incident/provenance';
import { cn } from '@/lib/ui/cn';
import type { ActionClass, Rule } from '@/lib/engine/types';
import type { PillBundle } from '@/lib/pills/load';
import { pillEditAuthority } from '@/lib/governance/access';
import { reviewKey, useGovernanceStore, type RuleReviewRecord } from '@/lib/governance/store';
import { currentApproved } from '@/lib/governance/versions';
import { useLivePill } from './useLivePill';

type DecisionState = 'confirmed' | 'edited' | 'rejected';
type LaneId = 'triggers' | 'decisions' | 'boundaries' | 'escalation';

const LANES: { id: LaneId; title: string; description: string }[] = [
  {
    id: 'triggers',
    title: 'Triggers & evidence',
    description: 'Detection, isolation and evidence gates',
  },
  { id: 'decisions', title: 'Decisions', description: 'Recommended operational actions' },
  {
    id: 'boundaries',
    title: 'Boundaries (allowed / forbidden)',
    description: 'What may and may not be done',
  },
  {
    id: 'escalation',
    title: 'Escalation & ownership',
    description: 'Who must be involved before action',
  },
];

// Distribute the Technical Services rules across the four review lanes. Other
// pills fall back to a sensible mapping by action_class.
const EXPLICIT_LANE: Record<string, LaneId> = {
  'TS-01': 'escalation',
  'TS-02': 'triggers',
  'TS-03': 'boundaries',
  'TS-04': 'triggers',
  'TS-05': 'boundaries',
  'TS-06': 'escalation',
  'TS-07': 'escalation',
  'TS-08': 'boundaries',
  'TS-09': 'decisions',
  'TS-10': 'decisions',
  'TS-11': 'decisions',
  'TS-12': 'triggers',
};

function laneForRule(rule: Rule): LaneId {
  if (EXPLICIT_LANE[rule.id]) return EXPLICIT_LANE[rule.id];
  if (rule.action_class === 'must_escalate') return 'escalation';
  if (rule.action_class === 'requires_approval') return 'boundaries';
  return 'decisions';
}

/** The expert's real words for a rule (provenance.json), or nothing if none were captured. */
function provenanceFor(rule: Rule, pill: PillBundle) {
  const q = expertQuoteFor(pill.pill, rule);
  if (!q) return undefined;
  return {
    quote: q.quote,
    timestamp: q.end ? `${q.start}–${q.end}` : q.start,
    expert: q.confirmedBy ?? 'onboarding interview',
  };
}

const STATE_BADGE: Record<DecisionState, { label: string; tone: string }> = {
  confirmed: { label: 'Confirmed', tone: TONE_CHIP.recommend },
  edited: { label: 'Edited', tone: TONE_CHIP.approval },
  rejected: { label: 'Rejected', tone: TONE_CHIP.blocked },
};

const FILTERS: { id: ActionClass | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'recommend', label: 'Recommend' },
  { id: 'requires_approval', label: 'Requires approval' },
  { id: 'must_escalate', label: 'Must escalate' },
];

const NO_REVIEWS: Record<string, RuleReviewRecord> = {};

export function DecisionCanvas({ pill }: { pill: PillBundle }) {
  const mounted = useMounted();
  // Seeds the pill; the live version, versions in review and the next free
  // version come from the governance store's full history.
  const { nextVersion, pending } = useLivePill(pill);
  const currentActor = useGovernanceStore((s) => s.currentActor);
  const storedHistory = useGovernanceStore((s) => s.versions[pill.id]);
  const allReviews = useGovernanceStore((s) => s.ruleReviews);
  const reviewRule = useGovernanceStore((s) => s.reviewRule);
  const publishReview = useGovernanceStore((s) => s.publishReview);

  // Persisted state only after mount, so server HTML and first client render match.
  const live = mounted && storedHistory ? currentApproved(storedHistory) : undefined;
  const rules = live?.rules ?? pill.pill.rules;
  const reviews = (live && allReviews[reviewKey(pill.id, live.version)]) || NO_REVIEWS;

  const m = pill.pill.manifest;
  const authority = pillEditAuthority(currentActor.role, {
    owner: m.owner,
    steward: m.steward,
    approver: m.approver,
    access: m.access,
  });
  const readOnlyReason = !mounted ? 'Loading…' : authority.allowed ? undefined : authority.reason;

  const [filter, setFilter] = useState<ActionClass | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function act(fn: () => unknown) {
    setError(null);
    try {
      fn();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const filterCounts = useMemo(() => {
    const c: Record<string, number> = { all: rules.length, recommend: 0, requires_approval: 0, must_escalate: 0 };
    for (const r of rules) c[r.action_class] += 1;
    return c;
  }, [rules]);

  const counts = useMemo(() => {
    let confirmed = 0;
    let edited = 0;
    let rejected = 0;
    for (const r of rules) {
      const s = reviews[r.id]?.outcome;
      if (s === 'confirmed') confirmed += 1;
      else if (s === 'edited') edited += 1;
      else if (s === 'rejected') rejected += 1;
    }
    return { confirmed, edited, rejected, decided: confirmed + edited + rejected, total: rules.length };
  }, [reviews, rules]);

  const rulesByLane = useMemo(() => {
    const map: Record<LaneId, Rule[]> = { triggers: [], decisions: [], boundaries: [], escalation: [] };
    for (const r of rules) {
      if (filter !== 'all' && r.action_class !== filter) continue;
      map[laneForRule(r)].push(r);
    }
    return map;
  }, [rules, filter]);

  const editingRule = editingId ? rules.find((r) => r.id === editingId) : null;
  const inReview = pending[0];
  const publishBlockedReason = readOnlyReason
    ? readOnlyReason
    : inReview
      ? `v${inReview.version} is already in review (${inReview.status}) — finish it on Learning & Approval first.`
      : counts.decided < counts.total
        ? `Decide every tile to publish (${counts.total - counts.decided} left).`
        : undefined;

  return (
    <div className="space-y-6 pb-28">
      {readOnlyReason && mounted ? (
        <p className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-muted">
          <Lock className="size-3.5 shrink-0" aria-hidden="true" />
          Read only: {readOnlyReason}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg border border-blocked/30 bg-blocked-tint px-3 py-2 text-xs text-blocked">
          {error}
        </p>
      ) : null}

      {/* Filter chips by action_class */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter rules by action class">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={active}
              className={cn(
                'btn-pill text-xs',
                active ? 'bg-dew-drop-deep' : 'border-line-strong/40 text-ink-muted shadow-none hover:text-ink',
              )}
            >
              {f.label}
              <span className="ml-1.5 tabular-nums opacity-70">{filterCounts[f.id]}</span>
            </button>
          );
        })}
      </div>

      {/* Lanes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {LANES.map((lane) => {
          const laneRules = rulesByLane[lane.id];
          return (
            <section key={lane.id} aria-label={lane.title} className="rounded-2xl border border-line bg-dew-drop/50 p-4">
              <div className="mb-4 border-b border-line pb-2.5">
                <h2 className="text-[19px] font-semibold leading-tight">{lane.title}</h2>
                <p className="mt-0.5 text-[13px] text-ink-muted">{lane.description}</p>
              </div>

              {laneRules.length === 0 ? (
                <EmptyState
                  title="No rules in this lane"
                  description="Adjust the filter or this pill has no rules here."
                  className="py-6"
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {laneRules.map((rule) => {
                    const review = reviews[rule.id];
                    const state = review?.outcome;
                    const confirmedProp = state === 'confirmed' ? true : state === 'rejected' ? false : undefined;
                    return (
                      <div key={rule.id} className="relative">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <ActionClassChip actionClass={rule.action_class} />
                          {state ? (
                            <span className={cn(CHIP_BASE, STATE_BADGE[state].tone)}>{STATE_BADGE[state].label}</span>
                          ) : (
                            <span className={cn(CHIP_BASE, 'border-line bg-surface text-ink-muted')}>Pending</span>
                          )}
                        </div>
                        <RuleTile
                          rule={rule}
                          confirmed={confirmedProp}
                          provenance={provenanceFor(rule, pill)}
                          actionsDisabledReason={readOnlyReason}
                          onConfirm={() =>
                            act(() => reviewRule({ pillId: pill.id, ruleId: rule.id, outcome: 'confirmed' }))
                          }
                          onEdit={() => setEditingId(rule.id)}
                          onReject={() =>
                            act(() => reviewRule({ pillId: pill.id, ruleId: rule.id, outcome: 'rejected' }))
                          }
                        />
                        {review ? (
                          <p className="mt-1.5 text-[11px] text-ink-muted">
                            {STATE_BADGE[review.outcome].label} by {review.actor.name}
                            {review.decision ? ` — new decision: “${review.decision}”` : ''}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Version in review (from the store) */}
      {inReview ? (
        <div role="status" className="rounded-xl border border-recommend/35 bg-recommend-tint p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-recommend">
            <FileCheck2 className="size-4" aria-hidden="true" />
            v{inReview.version} is in review ({inReview.status})
          </p>
          <p className="mt-1 text-xs text-ink">
            Nothing executes without a named human: it needs evals, a Shadow run and a separate approver before it can
            go live.
          </p>
          <Link href={`/learning/${pill.id}`} className="btn-pill mt-3 text-xs">
            Go to Learning &amp; Approval <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : null}

      {/* Sticky footer */}
      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas/95 backdrop-blur md:left-64">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-8">
          <p className="text-[13px] tabular-nums text-ink">
            <span className="font-medium text-recommend">{counts.confirmed} confirmed</span>
            <span className="text-ink-muted"> · </span>
            <span className="font-medium text-approval">{counts.edited} edited</span>
            <span className="text-ink-muted"> · </span>
            <span className="font-medium text-blocked">{counts.rejected} rejected</span>
          </p>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-[13px] tabular-nums text-ink-muted">
              {counts.decided} of {counts.total} decided
            </span>
            <button
              type="button"
              disabled={Boolean(publishBlockedReason)}
              title={publishBlockedReason}
              onClick={() => act(() => publishReview(pill.id))}
              className="btn-pill btn-pill-primary text-xs"
            >
              Publish as <span className="font-mono">v{nextVersion}</span> draft
            </button>
          </div>
        </div>
      </footer>

      {/* Edit overlay */}
      {editingRule ? (
        <EditOverlay
          rule={editingRule}
          initial={reviews[editingRule.id]?.decision ?? editingRule.decision}
          onSave={(text) => {
            act(() => reviewRule({ pillId: pill.id, ruleId: editingRule.id, outcome: 'edited', decision: text }));
            setEditingId(null);
          }}
          onCancel={() => setEditingId(null)}
        />
      ) : null}
    </div>
  );
}

function EditOverlay({
  rule,
  initial,
  onSave,
  onCancel,
}: {
  rule: Rule;
  initial: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial);
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-cocoa-ink/30 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit rule ${rule.id}`}
        className="w-full max-w-lg rounded-xl border border-line-strong bg-canvas p-6 shadow-lift"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="font-mono text-[11px] text-ink-muted">{rule.id}</p>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel edit"
            className="grid size-9 place-items-center rounded-full border-[1.5px] border-ink text-ink transition-[background-color,scale] duration-150 hover:bg-dew-drop active:scale-[0.96]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <h3 className="font-display-soft text-[20px] font-semibold leading-tight text-heading">{rule.title}</h3>
        <label htmlFor="rule-edit" className="mt-4 block text-[13px] font-medium text-ink-muted">
          Decision (editable)
        </label>
        <textarea
          id="rule-edit"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="mt-1.5 w-full rounded-lg border border-line-strong bg-surface p-3 text-sm leading-relaxed text-ink"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn-pill text-xs"
          >
            <X className="size-3.5" aria-hidden="true" /> Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(text)}
            className="btn-pill btn-pill-primary text-xs"
          >
            <Check className="size-3.5" aria-hidden="true" /> Save edit
          </button>
        </div>
      </div>
    </div>
  );
}
