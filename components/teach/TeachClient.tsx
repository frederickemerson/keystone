'use client';

// Teaching a pill: a situation, one open question, then only what is missing.
//
// This is the surface that replaces the simulated phone call. What the call
// could not do, and this can:
//
//   - show the SITUATION, because judgement does not exist in the abstract;
//   - ask ONE wide question first, because an unprompted account gives up more
//     than ten narrow questions do;
//   - say what is still UNKNOWN, as fields of the rule being written rather
//     than as a position in a script (lib/teach/parts);
//   - take answers as taps where a tap is the honest shape of the answer, so
//     what arrives is structured and a disagreement is arithmetic rather than
//     a model's opinion (lib/teach/exercise).
//
// Nothing here writes a rule. Every answer is a draft that carries over to the
// Decision Canvas, where a person with the authority to edit the pill reviews
// it — the same gate the call fed, unchanged.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, LayoutGrid, Play, Volume2, VolumeX } from 'lucide-react';
import { PageHeader } from '@/components/mosaic';
import { useMounted } from '@/components/mosaic/useMounted';
import { routes } from '@/lib/journey/routes';
import { cn } from '@/lib/ui/cn';
import { PART_LABELS, RULE_PARTS, type RulePart } from '@/lib/teach/parts';
import {
  claimsFrom,
  coveredParts,
  findContradiction,
  nextQuestion,
  progress,
  resolutionQuestion,
  type Answer,
  type Exercise,
} from '@/lib/teach/exercise';
import { draftRuleFrom, draftProvenance } from '@/lib/teach/draft';
import { useVoice } from '@/lib/speech/useVoice';
import type { Rule } from '@/lib/engine/types';
import { speechRecognitionCtor, mediaRecorderSupported } from '@/components/capture/useSpeechCapture';
import { AccountExtraction } from './AccountExtraction';
import { CoverageBoard } from './CoverageBoard';
import { DraftPreview } from './DraftPreview';
import { Dictation } from './Dictation';
import { Mascot, moodFor } from './Mascot';
import { QuestionCard } from './QuestionCard';
import { ContradictionPanel } from './ContradictionPanel';
import { SCENARIO_STAGES, ScenarioStage, type ScenarioStageId } from './ScenarioStage';

export interface TeachClientProps {
  exercise: Exercise;
  pillName: string;
  /** Whether a server recogniser is usable, read on the server (no secrets). */
  serverAsrAvailable: boolean;
}

type Phase = 'scenario' | 'questions' | 'done';

export function TeachClient({ exercise, pillName, serverAsrAvailable }: TeachClientProps) {
  const mounted = useMounted();
  const voice = useVoice();

  const [phase, setPhase] = useState<Phase>('scenario');
  const [stageAt, setStageAt] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [muted, setMuted] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [justCaptured, setJustCaptured] = useState(false);
  const [confirmedFromAccount, setConfirmedFromAccount] = useState<Rule[]>([]);
  const clock = useRef(0);

  const stage: ScenarioStageId = SCENARIO_STAGES[stageAt]?.id ?? 'calm';
  const covered = useMemo(() => coveredParts(exercise, answers), [exercise, answers]);
  const claims = useMemo(() => claimsFrom(exercise, answers), [exercise, answers]);
  const contradiction = useMemo(() => findContradiction(exercise, answers), [exercise, answers]);
  const resolution = resolutionQuestion(exercise);
  const resolved = answers.some((a) => a.questionId === resolution?.id);
  const { done, of } = progress(exercise, answers);
  const account = answers.find((a) => a.questionId === exercise.opening.id)?.text?.trim() ?? '';
  const draft = useMemo(() => draftRuleFrom(exercise, answers), [exercise, answers]);
  const provenance = useMemo(() => draftProvenance(exercise, answers), [exercise, answers]);

  const reachable = useMemo(
    () =>
      new Set<RulePart>(
        [exercise.opening, ...exercise.questions].map((q) => q.covers).filter((p): p is RulePart =>
          (RULE_PARTS as readonly string[]).includes(p),
        ),
      ),
    [exercise],
  );

  // A disagreement interrupts: it is the most valuable thing on the screen, and
  // asking anything else first wastes the moment it was noticed.
  const pending = nextQuestion(exercise, answers);
  const asking = contradiction && !resolved && resolution ? resolution : pending;

  const dictationEngine = mounted
    ? speechRecognitionCtor()
      ? ('web_speech' as const)
      : serverAsrAvailable && mediaRecorderSupported()
        ? ('server_asr' as const)
        : null
    : null;

  const say = useCallback(
    (text: string) => {
      if (muted) return;
      voice.speak(text, 'interviewer');
    },
    [muted, voice],
  );

  // Narrate each scenario stage as it arrives.
  useEffect(() => {
    if (phase !== 'scenario' || !mounted) return;
    const caption = SCENARIO_STAGES[stageAt]?.caption;
    if (caption) say(caption);
    // `say` changes with mute; re-narrating on mute toggle would restart the line.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stageAt, mounted]);

  // Read each question aloud once.
  useEffect(() => {
    if (phase !== 'questions' || !asking || !mounted) return;
    say(asking.prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, asking?.id, mounted]);

  useEffect(() => {
    if (phase === 'questions' && !asking && !(contradiction && !resolved)) setPhase('done');
  }, [phase, asking, contradiction, resolved]);

  useEffect(() => {
    if (!justCaptured) return;
    const timer = setTimeout(() => setJustCaptured(false), 900);
    return () => clearTimeout(timer);
  }, [justCaptured]);

  const record = (answer: Omit<Answer, 'at'>) => {
    clock.current += 1;
    setAnswers((prev) => [...prev, { ...answer, at: clock.current }]);
    setJustCaptured(true);
    setResolving(false);
    voice.stop();
  };

  const mood = moodFor({
    recording: false,
    working: false,
    contradiction: Boolean(contradiction) && !resolved,
    justCaptured,
    finished: phase === 'done',
  });

  return (
    <div className="space-y-6">
      {/* Scoped here rather than in globals.css, so every part of this screen
          lives under components/teach. Honors reduced motion. */}
      <style>{`
        @keyframes teach-claim-in {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .teach-claim-in { animation: teach-claim-in 0.4s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .teach-claim-in { animation: none; } }
      `}</style>

      <PageHeader
        eyebrow={
          <>
            <span>Teach a skill</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-[12px]">{pillName}</span>
          </>
        }
        title="One situation, then only what is missing"
        subtitle="The first question is deliberately wide. Everything after it is chosen by what that answer did not settle — and nothing here becomes a rule until someone who may edit the pill reviews it."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMuted((m) => !m);
                voice.stop();
              }}
              className="btn-pill text-xs"
              aria-pressed={muted}
            >
              {muted ? <VolumeX className="size-3.5" aria-hidden="true" /> : <Volume2 className="size-3.5" aria-hidden="true" />}
              {muted ? 'Voice off' : 'Voice on'}
            </button>
            <Link href={routes.canvas(exercise.pillId)} className="btn-pill text-xs">
              <LayoutGrid className="size-3.5" aria-hidden="true" /> Decision canvas
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <Mascot mood={mood} scale={2} />
            <div className="min-w-0 flex-1 pt-2">
              <p className="text-[13px] leading-snug text-ink-muted">
                {phase === 'scenario'
                  ? 'Read the situation. I will not ask anything until you have seen all of it.'
                  : phase === 'done'
                    ? 'That is everything I can learn from this one. The rest is review.'
                    : contradiction && !resolved
                      ? 'Hold on — two of your answers disagree.'
                      : 'Answer however you like. Short is fine.'}
              </p>
              {voice.source ? (
                <p className="mt-1 font-mono text-[11px] text-ink-muted">
                  Synthetic voice · {voice.source.label}
                  {voice.source.region ? ` · ${voice.source.region}` : ''}
                </p>
              ) : null}
              {voice.error ? (
                <p className="mt-1 text-[11px] text-ink-muted">{voice.error}</p>
              ) : null}
            </div>
          </div>

          {phase === 'scenario' ? (
            <>
              <ScenarioStage stage={stage} />
              <div className="flex flex-wrap items-center gap-3">
                {stageAt < SCENARIO_STAGES.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setStageAt((a) => a + 1)}
                    className="btn-pill btn-pill-primary text-xs"
                  >
                    Then what? <ArrowRight className="size-3.5" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      voice.stop();
                      setPhase('questions');
                    }}
                    autoFocus
                    className="btn-pill btn-pill-primary text-xs"
                  >
                    <Play className="size-3.5" aria-hidden="true" /> I have seen enough — ask me
                  </button>
                )}
                <span className="font-mono text-[11px] tabular-nums text-ink-muted">
                  {stageAt + 1} / {SCENARIO_STAGES.length}
                </span>
              </div>
            </>
          ) : null}

          {contradiction && !resolved && phase !== 'scenario' ? (
            <ContradictionPanel contradiction={contradiction} resolution={null}>
              {contradiction.distinguishingCondition && !resolving ? (
                <div className="mt-3 space-y-2">
                  <p className="text-[13px] leading-relaxed text-ink">
                    The second question said:{' '}
                    <span className="font-medium">{contradiction.distinguishingCondition}</span> Is that the
                    condition?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-pill btn-pill-primary text-xs"
                      onClick={() =>
                        resolution &&
                        record({
                          questionId: resolution.id,
                          choiceIds: [],
                          text: contradiction.distinguishingCondition!,
                        })
                      }
                    >
                      Yes — that is what separates them
                    </button>
                    <button type="button" className="btn-pill text-xs" onClick={() => setResolving(true)}>
                      No — let me say it properly
                    </button>
                  </div>
                </div>
              ) : null}
            </ContradictionPanel>
          ) : null}

          {phase === 'questions' && asking ? (
            <QuestionCard
              key={asking.id}
              question={asking}
              onAnswerText={(text) => record({ questionId: asking.id, choiceIds: [], text })}
              onAnswerChoices={(choiceIds) => record({ questionId: asking.id, choiceIds })}
              renderDictation={
                asking.kind === 'open'
                  ? (append) => <Dictation engine={dictationEngine} onTranscript={append} />
                  : undefined
              }
            />
          ) : null}

          {account && phase !== 'scenario' ? (
            <AccountExtraction
              account={account}
              onConfirm={(rule) =>
                setConfirmedFromAccount((prev) => (prev.some((r) => r.id === rule.id) ? prev : [...prev, rule]))
              }
            />
          ) : null}

          {phase === 'done' ? (
            <>
              <p className="text-[17px] leading-snug text-ink">
                {done} of {of} parts of the rule, from one situation.
              </p>
              <DraftPreview
                draft={draft}
                provenance={provenance}
                pillId={exercise.pillId}
                missing={[...reachable].filter((part) => !covered.has(part))}
                fromAccount={confirmedFromAccount}
              />
            </>
          ) : null}
        </div>

        <div className="space-y-5">
          <CoverageBoard covered={covered} reachable={reachable} active={asking?.covers} />

          <section className="rounded-xl border border-line bg-surface p-4">
            <h2 className="mb-3 text-[13px] font-medium text-ink">What you have said so far</h2>
            {claims.length === 0 ? (
              <p className="text-[13px] leading-snug text-ink-muted">
                Nothing yet. The first answer is the one that matters most.
              </p>
            ) : (
              <ul className="space-y-2">
                {claims.map((claim) => (
                  <li
                    key={`${claim.questionId}-${claim.choiceId}`}
                    className={cn(
                      'teach-claim-in rounded-lg border border-line bg-cream-paper px-3 py-2',
                    )}
                  >
                    <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">
                      {PART_LABELS[claim.part].label}
                    </p>
                    <p className="text-[13px] leading-snug text-ink">{claim.label}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
