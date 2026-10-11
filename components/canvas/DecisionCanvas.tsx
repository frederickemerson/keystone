'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, X, ArrowRight, FileCheck2 } from 'lucide-react';
import { RuleTile, EmptyState, ActionClassChip, CHIP_BASE, TONE_CHIP } from '@/components/mosaic';
import { cn } from '@/lib/ui/cn';
import type { ActionClass, Rule } from '@/lib/engine/types';
import type { PillBundle } from '@/lib/pills/load';
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

function buildProvenance(rule: Rule, pill: PillBundle) {
  const entry = pill.pill.provenance[rule.id];
  const seg = rule.provenance[0] ?? entry?.transcript_segment ?? '';
  const timestamp = seg.includes('#') ? seg.split('#')[1] : seg;
  const status = entry?.confirmation_status ?? 'confirmed';
  return {
    quote: `Expert ${status} — captured in onboarding interview (${seg})`,
    timestamp,
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

export function DecisionCanvas({ pill }: { pill: PillBundle }) {
  const rules = pill.pill.rules;
  // Next free minor version from the governance store's full history (approvals
  // and rollbacks included), not the version frozen in the pill files.
  const { nextVersion } = useLivePill(pill);

  const [decisions, setDecisions] = useState<Record<string, DecisionState>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<ActionClass | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [published, setPublished] = useState(false);

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
      const s = decisions[r.id];
      if (s === 'confirmed') confirmed += 1;
      else if (s === 'edited') edited += 1;
      else if (s === 'rejected') rejected += 1;
    }
    return { confirmed, edited, rejected, decided: confirmed + edited + rejected, total: rules.length };
  }, [decisions, rules]);

  const rulesByLane = useMemo(() => {
    const map: Record<LaneId, Rule[]> = { triggers: [], decisions: [], boundaries: [], escalation: [] };
    for (const r of rules) {
      if (filter !== 'all' && r.action_class !== filter) continue;
      map[laneForRule(r)].push(r);
    }
    return map;
  }, [rules, filter]);

  const editingRule = editingId ? rules.find((r) => r.id === editingId) : null;

  return (
    <div className="space-y-6 pb-28">
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
            <section
              key={lane.id}
              aria-label={lane.title}
              className="rounded-2xl border border-line bg-dew-drop/50 p-4"
            >
              <div className="mb-4 border-b border-line pb-2.5">
                <h2 className="text-[19px] font-semibold leading-tight">{lane.title.toLowerCase()}</h2>
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
                    const state = decisions[rule.id];
                    const confirmedProp =
                      state === 'confirmed' ? true : state === 'rejected' ? false : undefined;
                    return (
                      <div key={rule.id} className="relative">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <ActionClassChip actionClass={rule.action_class} />
                          {state ? (
                            <span
                              className={cn(CHIP_BASE, STATE_BADGE[state].tone)}
                            >
                              {STATE_BADGE[state].label}
                            </span>
                          ) : (
                            <span className={cn(CHIP_BASE, 'border-line bg-surface text-ink-muted')}>
                              Pending
                            </span>
                          )}
                        </div>
                        <RuleTile
                          rule={rule}
                          confirmed={confirmedProp}
                          provenance={buildProvenance(rule, pill)}
                          onConfirm={() =>
                            setDecisions((d) => ({ ...d, [rule.id]: 'confirmed' }))
                          }
                          onEdit={() => setEditingId(rule.id)}
                          onReject={() =>
                            setDecisions((d) => ({ ...d, [rule.id]: 'rejected' }))
                          }
                        />
                        {edits[rule.id] ? (
                          <p className="mt-1.5 rounded-lg border border-approval/35 bg-approval-tint px-2.5 py-1 text-xs text-approval">
                            Edit note saved
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

      {/* Publish confirmation */}
      {published ? (
        <div
          role="status"
          className="rounded-xl border border-recommend/35 bg-recommend-tint p-5"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-recommend">
            <FileCheck2 className="size-4" aria-hidden="true" />
            Draft v{nextVersion} queued for Learning &amp; Approval
          </p>
          <p className="mt-1 text-xs text-ink">
            {counts.total} rule decisions ({counts.confirmed} confirmed, {counts.edited} edited,
            {counts.rejected} rejected) have been packaged as{' '}
            <span className="font-mono">
              {pill.domain}/{pill.name}@{nextVersion}
            </span>
            . Nothing executes without a named human — the draft now awaits steward sign-off, evals
            and a version diff before it can be promoted.
          </p>
          <Link
            href={`/learning/${pill.id}`}
            className="btn-pill mt-3 text-xs"
          >
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
              disabled={counts.decided < counts.total || published}
              onClick={() => setPublished(true)}
              className="btn-pill btn-pill-primary text-xs"
            >
              {published ? (
                <>
                  <FileCheck2 className="size-3.5" aria-hidden="true" /> Published
                </>
              ) : (
                <>
                  Publish as <span className="font-mono">v{nextVersion}</span> draft
                </>
              )}
            </button>
          </div>
        </div>
      </footer>

      {/* Edit overlay */}
      {editingRule ? (
        <EditOverlay
          rule={editingRule}
          initial={edits[editingRule.id] ?? editingRule.decision}
          onSave={(text) => {
            setEdits((e) => ({ ...e, [editingRule.id]: text }));
            setDecisions((d) => ({ ...d, [editingRule.id]: 'edited' }));
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
