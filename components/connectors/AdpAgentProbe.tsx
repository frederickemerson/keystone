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
//
// The exchange is a THREAD, not a question box. The challenge owner's ask was
// for management to be able to keep going — "these five issues, are there any
// cost implications? ... do we need to invest more?" — so a follow-up carries
// the previous turns with it. The follow-up presets below are deliberately
// written with pronouns ("that", "it"), because a one-shot endpoint cannot
// answer them and a threaded one can: the difference is visible on screen.

import { useState } from 'react';
import { BookOpenCheck, CircleAlert, CornerDownRight, Loader2, MessageSquareWarning, RotateCcw, Send, TriangleAlert } from 'lucide-react';
import { MAX_THREAD_TURNS, type AdpAskResponse, type AdpTurnKind } from '@/lib/adp/ask';
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

/** Openers for a follow-up. Each one only makes sense if the thread was kept. */
const FOLLOW_UPS = [
  'Does that change if the area is still wet?',
  'What if that person is not on site?',
  'Which of those items can telemetry confirm on its own?',
] as const;

const MAX_CHARS = 300;

/** One question and what came back. */
interface Exchange {
  question: string;
  answer: AdpAskResponse;
}

export function AdpAgentProbe({ dispute }: { dispute: DisputeContext }) {
  const [question, setQuestion] = useState<string>(PRESETS[0]);
  const [busy, setBusy] = useState(false);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);

  // The thread's state comes from the last answer the server gave, never from
  // counting on this side: the server owns the thread and is the only thing
  // that knows whether it survived.
  const last = exchanges.at(-1)?.answer;
  const live = last?.ok === true;
  const turnsLeft = live ? last.turnsLeft : 0;
  const canFollowUp = live && turnsLeft > 0;
  const turn: AdpTurnKind = canFollowUp ? 'follow_up' : 'new';

  async function ask() {
    const asked = question;
    setBusy(true);
    try {
      const response = await fetch('/api/adp/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: asked, turn }),
      });
      const body: unknown = await response.json().catch(() => null);
      const answer: AdpAskResponse =
        body && typeof body === 'object' && 'ok' in body
          ? (body as AdpAskResponse)
          : { ok: false, reason: 'invalid_response', detail: 'ADP answered in a shape this screen does not accept.' };
      setExchanges((prior) => [...prior, { question: asked, answer }]);
      if (answer.ok) setQuestion('');
    } catch {
      setExchanges((prior) => [
        ...prior,
        {
          question: asked,
          answer: { ok: false, reason: 'network_error', detail: 'The request to Keystone\u2019s own server did not complete.' },
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    setExchanges([]);
    setQuestion(PRESETS[0]);
  }

  const openers = exchanges.length === 0 ? PRESETS : FOLLOW_UPS;
  const started = exchanges.length > 0;

  return (
    <div className="space-y-3 rounded-lg border border-line bg-surface p-3">
      <div>
        <p className="text-[13px] font-medium text-ink">Ask the published agent</p>
        <p className="mt-0.5 max-w-[75ch] text-[12px] leading-snug text-ink-muted">
          The pill is published to ADP as a knowledge base. This asks that agent the question, live, and keeps the
          thread so you can follow up on the answer. Every answer is a draft for a person to read — no gate reads it.
        </p>
      </div>

      {exchanges.length > 0 ? (
        <ol className="space-y-2.5">
          {exchanges.map((exchange, i) => (
            <li key={`${i}-${exchange.question}`} className="space-y-1.5">
              <p className="flex items-start gap-1.5 text-[12px] leading-snug text-ink-muted">
                {i > 0 ? <CornerDownRight className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> : null}
                <span className="font-medium text-ink">{exchange.question}</span>
              </p>
              <Answer answer={exchange.answer} asked={exchange.question} dispute={dispute} />
            </li>
          ))}
        </ol>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {openers.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setQuestion(preset)}
            disabled={busy}
            className={`rounded-full border px-2 py-0.5 text-left text-[12px] transition-colors ${
              question === preset ? 'border-accent bg-dew-drop text-ink' : 'border-line text-ink-muted hover:text-ink'
            }`}
          >
            {preset.length > 52 ? `${preset.slice(0, 52)}\u2026` : preset}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="sr-only">{canFollowUp ? 'Follow-up for the ADP agent' : 'Question for the ADP agent'}</span>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, MAX_CHARS))}
          rows={2}
          maxLength={MAX_CHARS}
          disabled={busy}
          placeholder={canFollowUp ? 'Follow up on that answer\u2026' : 'Ask the agent about the approved pill\u2026'}
          className="w-full resize-y rounded-lg border border-line bg-canvas p-2 font-sans text-[13px] text-ink"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={ask} disabled={busy || question.trim().length < 5} className="btn-pill btn-pill-primary">
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Send className="size-3.5" aria-hidden="true" />}
          {busy ? 'Asking the agent\u2026' : canFollowUp ? 'Ask as a follow-up' : 'Ask the ADP agent'}
        </button>
        {started ? (
          <button type="button" onClick={startOver} disabled={busy} className="btn-pill">
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Start a new question
          </button>
        ) : null}
        <span className="text-[12px] text-ink-muted">
          {question.trim().length}/{MAX_CHARS} ·{' '}
          {canFollowUp
            ? `follow-up ${exchanges.length + 1} of ${MAX_THREAD_TURNS} in this thread`
            : live
              ? `this thread is full at ${MAX_THREAD_TURNS} questions, so the next one starts fresh`
              : 'rate-limited, because each call spends real agent quota'}
        </span>
      </div>
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
  // Three states, not two. A follow-up that retrieved nothing is NOT the same
  // as a fresh question that retrieved nothing: it may be resting on what the
  // thread retrieved on an earlier turn — which is a real source, and one
  // Keystone cannot see. Calling that "answered from its prompt alone" would
  // be wrong; calling it grounded would be wrong the other way. So it gets its
  // own sentence, and still carries the warning, because an unseeable source
  // is not a checkable one.
  const carried = !grounded && answer.turn > 1;
  const note = grounded
    ? `Grounded: the agent retrieved ${answer.knowledgePassages} passage${answer.knowledgePassages === 1 ? '' : 's'} from its knowledge base before answering.`
    : carried
      ? 'Nothing retrieved on this turn: a follow-up can rest on what the thread retrieved earlier, which Keystone cannot see. Treat any rule id or version in it as unverified.'
      : 'Ungrounded: the agent retrieved nothing from its knowledge base, so this answer came from its prompt alone. Treat any rule id or version in it as unverified.';
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
          {note}{' '}
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
