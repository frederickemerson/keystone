// Which ADP conversation a signed-in reader is currently in.
//
// WHY THIS EXISTS
//
// Keppel's challenge owner described the thing he wants as a discussion, not a
// question box: "the agent should then be able to start conversing with
// management ... 'you've prompted us to look at the top five issues, but these
// five issues, are there any cost implications? Are there things that we need
// to start looking into? Do we need to invest more?' ... as if the energy
// manager is in front of them." A one-shot endpoint cannot do that: every
// question would arrive with no memory of the last answer.
//
// WHY THE CONVERSATION ID NEVER REACHES THE BROWSER
//
// ADP continues a thread for whoever presents its ConversationId. If Keystone
// returned that id to the client and accepted it back, any session could
// resume any other session's thread by guessing or replaying one, and read the
// context someone else established. So the id is held HERE, keyed by the
// signed session's jti, and the client only ever says "this is a follow-up".
// Nothing in the public response carries it.
//
// HONEST LIMITATION: like the rate limiter next door, this lives in one server
// instance's memory. On Vercel a follow-up can land on a different instance
// (or after a cold start) and find no thread. That is reported as a plain
// refusal the reader can act on — ask the question again as a new one — and
// never by silently opening a fresh thread, because an answer that has
// forgotten the previous turn while the reader believes it has not is exactly
// the kind of quiet wrongness this project refuses. Production would hold this
// in the same shared store as the rate limits.

import { newAdpId } from "./contract";

/** A thread with no new question for this long is over. */
export const THREAD_IDLE_MS = 15 * 60_000;

/** Hard cap on tracked sessions so a flood of distinct ids cannot exhaust memory. */
const MAX_THREADS = 2_000;

interface Thread {
  readonly conversationId: string;
  /** Questions answered successfully in this thread. */
  readonly turns: number;
  /**
   * The question the last answer was about.
   *
   * Held because a follow-up is almost always anaphoric ("does THAT change
   * if...") and ADP's own conversation memory resolves the reference only
   * sometimes — observed live, with the same thread answering the same
   * follow-up substantively on one run and declining it as uncovered on the
   * next. Restating the previous question in the prompt makes the referent
   * something Keystone can see and a reader can check, rather than something
   * held opaquely at the other end.
   */
  readonly lastQuestion: string;
  /** When the last answer landed. */
  readonly lastAt: number;
}

const threads = new Map<string, Thread>();

function live(sessionId: string, now: number): Thread | null {
  const thread = threads.get(sessionId);
  if (!thread) return null;
  if (now - thread.lastAt > THREAD_IDLE_MS) {
    threads.delete(sessionId);
    return null;
  }
  return thread;
}

/** The reader's current thread, or null when they have none. Records nothing. */
export function threadFor(
  sessionId: string,
  now: number,
): { conversationId: string; turns: number; lastQuestion: string } | null {
  const thread = live(sessionId, now);
  return thread
    ? { conversationId: thread.conversationId, turns: thread.turns, lastQuestion: thread.lastQuestion }
    : null;
}

/** A brand-new ADP conversation id. Nothing is remembered until a turn commits. */
export function newThreadId(): string {
  return newAdpId();
}

/**
 * Record one answered question.
 *
 * Called only AFTER ADP answers, so a failed or refused call never consumes a
 * turn and never strands the reader in a thread whose first answer never came.
 * `conversationId` is passed in rather than read back out because the caller is
 * the one that decided whether this turn opened a thread or continued one.
 */
export function commitTurn(sessionId: string, conversationId: string, question: string, now: number): void {
  const existing = live(sessionId, now);
  const continuing = existing?.conversationId === conversationId;
  if (!continuing && threads.size >= MAX_THREADS && !threads.has(sessionId)) {
    // At the cap, drop the least recently used thread rather than refusing a
    // reader outright: losing an idle thread costs a re-ask, and the cap exists
    // for memory, not for fairness between sessions.
    const oldest = [...threads.entries()].reduce((a, b) => (a[1].lastAt <= b[1].lastAt ? a : b));
    threads.delete(oldest[0]);
  }
  threads.set(sessionId, {
    conversationId,
    turns: continuing ? existing.turns + 1 : 1,
    lastQuestion: question,
    lastAt: now,
  });
}

/** Test helper: forget every thread. */
export function resetThreads(): void {
  threads.clear();
}
