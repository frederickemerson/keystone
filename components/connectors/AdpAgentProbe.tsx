'use client';

// Ask the published Tencent Cloud ADP agent a question, live, from the
// connectors screen.
//
// This is the only thing that can move the ADP row from "not verified" to
// "live": the status is proof of a real answer, and an AppKey sitting in the
// environment is not proof of anything. So the button is the check.
//
// It also shows the one number that matters for a published pill: how many
// knowledge-base passages the agent retrieved. Zero means it answered from its
// prompt alone, and the answer is labelled ungrounded rather than quietly
// presented as if the pill had backed it.

import { useState } from 'react';
import { BookOpenCheck, CircleAlert, Loader2, MessageSquareWarning, Send, TriangleAlert } from 'lucide-react';
import type { AdpAskResponse } from '@/lib/adp/ask';
import { buildAgentDisputeTask } from '@/components/incident/captureTasks';
import { roleLabel } from '@/lib/governance/access';
import { useGovernanceStore } from '@/lib/governance/store';

/** What the dispute form needs to raise a task the schema will accept. */
export interface DisputeContext {
  pillId: string;
  /** Rules of the governed pill, so the reader picks one instead of us parsing the answer. */
  rules: readonly { id: string; title: string }[];
  assets: readonly { id: string; name: string }[];
  /** Roles that could put it right. */
  roles: readonly string[];
}

const PRESETS = [
  'Who must approve re-energising the affected electrical equipment, and what evidence is required first?',
  'Can the chilled water riser be shut down while a data centre is served by it?',
  'What has to be recorded before cleanup starts?',
] as const;

const MAX_CHARS = 300;

export function AdpAgentProbe({ dispute }: { dispute: DisputeContext }) {
  const [question, setQuestion] = useState<string>(PRESETS[0]);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<AdpAskResponse | null>(null);

  async function ask() {
    setBusy(true);
    setAnswer(null);
    try {
      const response = await fetch('/api/adp/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const body: unknown = await response.json().catch(() => null);
      setAnswer(
        body && typeof body === 'object' && 'ok' in body
          ? (body as AdpAskResponse)
          : { ok: false, reason: 'invalid_response', detail: 'ADP answered in a shape this screen does not accept.' },
      );
    } catch {
      setAnswer({ ok: false, reason: 'network_error', detail: 'The request to Keystone’s own server did not complete.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-line bg-surface p-3">
      <div>
        <p className="text-[13px] font-medium text-ink">Ask the published agent</p>
        <p className="mt-0.5 max-w-[75ch] text-[12px] leading-snug text-ink-muted">
          The pill is published to ADP as a knowledge base. This asks that agent the question, live. The answer is a
          draft for a person to read — no gate reads it.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setQuestion(preset)}
            disabled={busy}
            className={`rounded-full border px-2 py-0.5 text-left text-[12px] transition-colors ${
              question === preset ? 'border-accent bg-dew-drop text-ink' : 'border-line text-ink-muted hover:text-ink'
            }`}
          >
            {preset.length > 52 ? `${preset.slice(0, 52)}…` : preset}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="sr-only">Question for the ADP agent</span>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, MAX_CHARS))}
          rows={2}
          maxLength={MAX_CHARS}
          disabled={busy}
          className="w-full resize-y rounded-lg border border-line bg-canvas p-2 font-sans text-[13px] text-ink"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={ask} disabled={busy || question.trim().length < 5} className="btn-pill btn-pill-primary">
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Send className="size-3.5" aria-hidden="true" />}
          {busy ? 'Asking the agent…' : 'Ask the ADP agent'}
        </button>
        <span className="text-[12px] text-ink-muted">
          {question.trim().length}/{MAX_CHARS} · rate-limited, because each call spends real agent quota
        </span>
      </div>

      {answer ? <Answer answer={answer} asked={question} dispute={dispute} /> : null}
    </div>
  );
}

function Answer({ answer, asked, dispute }: { answer: AdpAskResponse; asked: string; dispute: DisputeContext }) {
  if (!answer.ok) {
    return (
      <p role="alert" className="flex items-start gap-1.5 rounded-lg border border-line bg-canvas p-2.5 text-[12px] text-blocked">
        <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>{answer.detail}</span>
      </p>
    );
  }
  const grounded = answer.knowledgePassages > 0;
  return (
    <div className="space-y-2 rounded-lg border border-line bg-canvas p-2.5">
      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{answer.text}</p>
      <p className={`flex items-start gap-1.5 text-[12px] leading-snug ${grounded ? 'text-ink-muted' : 'text-blocked'}`}>
        {grounded ? (
          <BookOpenCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        )}
        <span>
          {grounded
            ? `Grounded: the agent retrieved ${answer.knowledgePassages} passage${answer.knowledgePassages === 1 ? '' : 's'} from its knowledge base before answering.`
            : 'Ungrounded: the agent retrieved nothing from its knowledge base, so this answer came from its prompt alone. Treat any rule id or version in it as unverified.'}{' '}
          {answer.latencyMs} ms · request {answer.requestId.slice(0, 8)}…
        </span>
      </p>
      <DisputeAction asked={asked} grounded={grounded} dispute={dispute} />
    </div>
  );
}

/**
 * "This answer is wrong" — the exchange becomes a question for the expert.
 *
 * It does NOT write a rule. A wrong answer is not knowledge; the expert's
 * correction is, and that still has to be said by a named person and approved.
 * What this fixes is that the exchange used to leave no trace at all: asked,
 * answered badly, corrected out loud in the room, gone.
 */
function DisputeAction({
  asked,
  grounded,
  dispute,
}: {
  asked: string;
  grounded: boolean;
  dispute: DisputeContext;
}) {
  const createCaptureTask = useGovernanceStore((s) => s.createCaptureTask);
  const [open, setOpen] = useState(false);
  const [ruleId, setRuleId] = useState('');
  const [assetId, setAssetId] = useState(dispute.assets[0]?.id ?? '');
  const [role, setRole] = useState(dispute.roles[0] ?? '');
  const [raised, setRaised] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function raise() {
    setError(null);
    try {
      const task = createCaptureTask(
        buildAgentDisputeTask({
          pillId: dispute.pillId,
          assetId,
          ruleId: ruleId === '' ? undefined : ruleId,
          role,
          question: asked,
          grounded,
          at: new Date().toISOString(),
        }),
      );
      setRaised(task.id);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The question could not be raised.');
    }
  }

  if (raised) {
    return (
      <p className="text-[12px] leading-snug text-ink-muted">
        Raised as <span className="font-mono text-ink">{raised}</span>, waiting for {roleLabel(role)}. It is on their
        open capture tasks, and their answer becomes a draft the approver reviews — the exchange is on the record
        either way.
      </p>
    );
  }

  const select = 'rounded-input border border-line bg-canvas px-2 py-1 text-[12px] text-ink';
  return (
    <div className="space-y-2">
      {open ? (
        <div className="space-y-2 rounded-lg border border-line bg-surface p-2.5">
          <p className="text-[12px] leading-snug text-ink-muted">
            This does not change a rule. It asks the person who owns the knowledge to put it right, and their answer
            goes through the same review as anything else.
          </p>
          <div className="flex flex-wrap gap-2">
            <label className="text-[12px] text-ink-muted">
              <span className="sr-only">Rule this is about</span>
              <select value={ruleId} onChange={(e) => setRuleId(e.target.value)} className={select}>
                <option value="">The agent cited no rule</option>
                {dispute.rules.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id} — {r.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[12px] text-ink-muted">
              <span className="sr-only">Site</span>
              <select value={assetId} onChange={(e) => setAssetId(e.target.value)} className={select}>
                {dispute.assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[12px] text-ink-muted">
              <span className="sr-only">Who should answer</span>
              <select value={role} onChange={(e) => setRole(e.target.value)} className={select}>
                {dispute.roles.map((r) => (
                  <option key={r} value={r}>
                    Ask {roleLabel(r)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={raise} disabled={!assetId || !role} className="btn-pill btn-pill-primary">
              Ask {role ? roleLabel(role) : 'the expert'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-pill">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="btn-pill">
          <MessageSquareWarning className="size-3.5" aria-hidden="true" />
          This answer is wrong
        </button>
      )}
      {error ? (
        <p role="alert" className="text-[12px] text-blocked">
          {error}
        </p>
      ) : null}
    </div>
  );
}
