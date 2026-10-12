// Keystone governance — client store (zustand + localStorage persistence).
// Composes versions, approval, shadow runs, incident action decisions and the
// append-only audit log. Seeded from file pills (PillBundle) passed down from
// server components; "Reset demo" restores the seed state.
//
// The acting identity is NOT persisted: it is bound from the signed session
// (lib/auth → app shell → setRole) on every load, so localStorage can never
// choose who is acting.

import { useStore } from "zustand";
import { createJSONStorage, persist, type PersistStorage, type StateStorage } from "zustand/middleware";
import { createStore, type Mutate, type StoreApi } from "zustand/vanilla";
import type { ComparisonResult, EvidenceCatalog, Pill } from "@/lib/engine";
import {
  canApprove,
  rollbackAuthority,
  shadowPromotionAuthority,
  type ApprovalCheck,
  type ApprovalOverride,
  type ShadowRun,
} from "./approval";
import {
  decisionAuthority,
  evidenceConfirmAuthority,
  isKnownRole,
  personaFor,
  pillEditAuthority,
  roleLabel,
  UNRESOLVED_ACTOR,
  UNRESOLVED_ROLE,
  type DecisionOutcome,
  type DecisionSubject,
  type PillEditPolicy,
} from "./access";
import { appendAudit, EMPTY_AUDIT_LOG, type AuditInput, type AuditLog } from "./audit";
import { parseGovernanceSnapshot } from "./snapshot";
import {
  currentApproved,
  EmptyProposalError,
  findVersion,
  markApproved,
  promoteToShadow,
  proposeVersion as proposePure,
  rollback as rollbackPure,
  seedVersion,
  type Actor,
  type PillVersion,
  type RuleChange,
} from "./versions";

export const GOVERNANCE_STORE_KEY = "mosaic-governance";
/** Bump when the persisted shape or role ids change; older snapshots are discarded.
 *  v2: role `tenant_experience` renamed to `tenant_experience_manager` in roles.json.
 *  v3: versions record `shadowedBy` (three-person separation of duties); outcomes + Canvas rule reviews. */
export const GOVERNANCE_STORE_VERSION = 3;

// Personas (named human per role) live with the role policy in ./access.
export { DEMO_PERSONAS, personaFor } from "./access";

/** Minimal seed input — structurally satisfied by lib/pills PillBundle. */
export interface PillSeed {
  id: string;
  pill: Pill;
}

export type ActionOutcome = DecisionOutcome;

export interface ActionDecisionRecord {
  incidentId: string;
  ruleId: string;
  outcome: ActionOutcome;
  actor: Actor;
  at: string;
  note?: string;
  /** Evidence keys the actor asked for when outcome is "evidence_requested". */
  requestedEvidence?: string[];
  pillId?: string;
  pillVersion?: string;
}

/**
 * A human's confirmation of one evidence key on an incident (value `true`,
 * confirmed) — the ONLY way a model suggestion can reach the engine. When the
 * confirmation came from a Jev suggestion, the suggestion is kept as context;
 * it is never itself evidence.
 */
export interface EvidenceConfirmationRecord {
  incidentId: string;
  key: string;
  value: true;
  /** Timeline event the confirmation is anchored to (it applies from that event on). */
  eventId: string;
  pillId: string;
  pillVersion?: string;
  actor: Actor;
  at: string;
  suggestion?: { model: string; probability: number };
}

/** What actually happened on a closed incident, confirmed by a named human (Learning step 1). */
export interface OutcomeRecord {
  incidentId: string;
  pillId: string;
  /** Measured: alarm → isolation sub-valve closed. */
  timeToIsolateMinutes: number;
  tenantImpact: string;
  costSgd: number;
  causeConfirmed: string;
  notes: string;
  actor: Actor;
  at: string;
}

export type OutcomeInput = Omit<OutcomeRecord, "actor" | "at">;

export type RuleReviewOutcome = "confirmed" | "edited" | "rejected";

/** The expert's verdict on one rule tile of a pill version (Decision Canvas). */
export interface RuleReviewRecord {
  pillId: string;
  /** The version whose rule was reviewed (the live Approved version at the time). */
  pillVersion: string;
  ruleId: string;
  outcome: RuleReviewOutcome;
  /** The edited `decision` text, when outcome is "edited". */
  decision?: string;
  actor: Actor;
  at: string;
}

export interface GovernanceData {
  /** UNRESOLVED_ACTOR until the signed session's identity is bound (SSR, first render, no session). Never persisted. */
  currentActor: Actor;
  /** pillId → full version history (never shrinks). */
  versions: Record<string, PillVersion[]>;
  /** pillId → seeded baseline history, restored by resetDemo(). */
  seedVersions: Record<string, PillVersion[]>;
  audit: AuditLog;
  /** incidentId → ruleId → latest human decision (full history is in `audit`). */
  decisions: Record<string, Record<string, ActionDecisionRecord>>;
  /** "<pillId>@<version>" → shadow runs for that version. */
  shadowRuns: Record<string, ShadowRun[]>;
  /** incidentId → evidence key → human confirmation (full history is in `audit`). */
  evidenceConfirmations: Record<string, Record<string, EvidenceConfirmationRecord>>;
  /** incidentId → latest confirmed outcome (full history is in `audit`). */
  outcomes: Record<string, OutcomeRecord>;
  /** "<pillId>@<version>" → ruleId → latest Canvas review (full history is in `audit`). */
  ruleReviews: Record<string, Record<string, RuleReviewRecord>>;
}

/** Thrown when a store action is refused by governance policy (the refusal is audited first). */
export class GovernanceError extends Error {
  override name = "GovernanceError";
}

/**
 * Store actions. Every call either appends exactly one audit event (success,
 * or a policy refusal — recorded as a *_blocked event) or throws on malformed
 * input having changed nothing. seedPills is the system exception: one
 * pill_seeded event per pill it seeds.
 */
/** What the store persists: everything except the acting identity, which comes from the session. */
export type PersistedGovernanceData = Omit<GovernanceData, "currentActor">;

export interface GovernanceActions {
  /**
   * Act as the named persona of a roles.json role (the persona is bound to the
   * role; a name cannot be chosen). In the app only the session binding calls
   * this, with the role of the signed session. Binding the first identity onto
   * the unresolved actor is session start, not a switch, and is not audited;
   * every later change is audited as role_switched.
   */
  setRole: (role: string) => void;
  /** Seed any pill not already in the store (persisted edits survive reloads). */
  seedPills: (seeds: readonly PillSeed[]) => void;
  /** Throws GovernanceError (after auditing the refusal) when the changes leave the rules identical. */
  proposeVersion: (pillId: string, baseVersion: string, changes: readonly RuleChange[], reason: string) => PillVersion;
  /** Throws GovernanceError (after auditing the refusal) when the acting role lacks the pill-promotion grant. */
  promoteToShadow: (pillId: string, version: string) => void;
  recordShadowRun: (pillId: string, version: string, run: ShadowRun) => void;
  /** Runs canApprove(); approves only when allowed. Blocked attempts are audited too. */
  approveVersion: (
    pillId: string,
    version: string,
    evalReport: Pick<ComparisonResult, "regressions"> | null,
    override?: ApprovalOverride,
  ) => ApprovalCheck;
  /** Throws GovernanceError (after auditing the refusal) when the grant or separation of duties forbids it. */
  rollback: (pillId: string, toVersion: string, reason: string) => PillVersion;
  /**
   * Record what actually happened on a closed incident (Learning step 1).
   * Only a role the pill's access block lets edit it; refusals are audited.
   */
  recordOutcome: (input: OutcomeInput) => OutcomeRecord;
  /**
   * Confirm, edit or reject one rule of the pill's live Approved version
   * (Decision Canvas). Only a role the pill's access block lets edit it;
   * refusals are audited.
   */
  reviewRule: (input: { pillId: string; ruleId: string; outcome: RuleReviewOutcome; decision?: string }) => RuleReviewRecord;
  /**
   * Publish a completed Canvas review as a Draft version: edited tiles change
   * the rule's decision text, rejected tiles remove the rule, confirmed tiles
   * stay as they are. Refused (and audited) until every tile is reviewed,
   * while another version is in review, or when nothing would change.
   */
  publishReview: (pillId: string) => PillVersion;
  /** Throws GovernanceError (after auditing the refusal) when the acting role lacks the grant. */
  decideAction: (
    input: Omit<ActionDecisionRecord, "actor" | "at"> & { at?: string; subject?: DecisionSubject },
  ) => ActionDecisionRecord;
  /**
   * Record evidence `key` as confirmed (value true) by the acting human. The
   * key must be a boolean declared in the pill's evidence.yaml, and the acting
   * role must be in its `confirmable_by`; otherwise the refusal is audited and
   * a GovernanceError thrown. Nothing else (no model) confirms evidence.
   */
  confirmEvidence: (input: {
    incidentId: string;
    pillId: string;
    pillVersion?: string;
    key: string;
    eventId: string;
    suggestion?: { model: string; probability: number };
  }) => EvidenceConfirmationRecord;
  resetDemo: () => void;
}

export type GovernanceState = GovernanceData & GovernanceActions;

export type GovernanceStore = Mutate<StoreApi<GovernanceState>, [["zustand/persist", unknown]]>;

export const shadowKey = (pillId: string, version: string): string => `${pillId}@${version}`;
/** Key of a version's Canvas reviews in `ruleReviews`. */
export const reviewKey = shadowKey;

function initialData(
  seedVersions: Record<string, PillVersion[]> = {},
  currentActor: Actor = UNRESOLVED_ACTOR,
): GovernanceData {
  return {
    currentActor: { ...currentActor },
    versions: structuredClone(seedVersions),
    seedVersions,
    audit: EMPTY_AUDIT_LOG,
    decisions: {},
    shadowRuns: {},
    evidenceConfirmations: {},
    outcomes: {},
    ruleReviews: {},
  };
}

const ACTION_AUDIT: Record<ActionOutcome, AuditInput["action"]> = {
  approved: "action_approved",
  rejected: "action_rejected",
  escalated: "action_escalated",
  evidence_requested: "action_evidence_requested",
};

/** Audit detail for a decision: the note if present, else a readable summary. */
function decisionDetail(record: ActionDecisionRecord): string {
  if (record.note) return record.note;
  if (record.outcome === "evidence_requested") {
    const keys = record.requestedEvidence ?? [];
    return keys.length > 0 ? `Requested evidence: ${keys.join(", ")}` : "Evidence requested";
  }
  return `${record.ruleId} ${record.outcome}`;
}

/** Freeze a value and everything reachable from it (already-frozen subtrees are skipped). */
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const v of Object.values(value)) {
    if (typeof v !== "function") deepFreeze(v);
  }
  return value;
}

/** In-memory storage for tests / SSR. */
export function memoryStorage(): StateStorage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

/** Same governance content as the baseline the file pill would seed (timestamps aside)? */
function sameBaseline(a: PillVersion, b: PillVersion): boolean {
  const strip = (v: PillVersion) => ({ ...v, createdAt: "", approvedAt: "" });
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}

/**
 * JSON storage that treats an unreadable snapshot (corrupt JSON, storage
 * access denied) as absent, so rehydration falls through to a fresh state
 * instead of rejecting and leaving the store unresolved.
 */
function tolerantJSONStorage(storage: StateStorage): PersistStorage<unknown> {
  const json = createJSONStorage<unknown>(() => storage)!;
  return {
    getItem: (name) => {
      try {
        const value = json.getItem(name);
        if (value instanceof Promise) return value.catch(() => null);
        // A non-numeric version would skip migrate() and be treated as current.
        if (value !== null && typeof (value as { version?: unknown }).version !== "number") return null;
        return value;
      } catch {
        if (typeof console !== "undefined") console.warn("[keystone] stored governance state unreadable; starting fresh");
        try {
          json.removeItem(name); // don't re-read (and re-warn about) the same garbage every load
        } catch {
          /* storage inaccessible */
        }
        return null;
      }
    },
    setItem: (name, value) => {
      try {
        return json.setItem(name, value);
      } catch {
        // Quota exceeded / storage disabled: keep working in memory.
      }
    },
    removeItem: (name) => json.removeItem(name),
  };
}

function browserStorage(): StateStorage {
  return typeof window !== "undefined" && window.localStorage ? window.localStorage : memoryStorage();
}

export function createGovernanceStore(
  storage: StateStorage = browserStorage(),
  now: () => string = () => new Date().toISOString(),
): GovernanceStore {
  return createStore<GovernanceState>()(
    persist<GovernanceState, [], [], unknown>(
      (rawSet, get) => {
        // Every state the store publishes is deep-frozen: a component (or a
        // caller holding a returned array) cannot mutate governance data in
        // place and bypass the actions + audit.
        const set: typeof rawSet = (partial, replace?: boolean) =>
          rawSet(
            ((s: GovernanceState) =>
              deepFreeze(typeof partial === "function" ? partial(s) : partial)) as never,
            replace as never,
          );
        const log = (input: AuditInput) => set((s) => ({ audit: appendAudit(s.audit, { at: now(), ...input }) }));
        const history = (pillId: string): PillVersion[] => {
          const h = get().versions[pillId];
          if (!h) throw new Error(`Unknown pill ${pillId}`);
          return h;
        };
        const actorFields = () => ({ actor: get().currentActor.name, role: get().currentActor.role });
        // Evidence catalogs of the seeded pills (from the pill files; not
        // persisted, so localStorage cannot widen who may confirm what).
        const catalogs = new Map<string, EvidenceCatalog>();
        // Who may change each seeded pill: its SKILL.md RACI + access block
        // (from the pill files; not persisted, for the same reason).
        const policies = new Map<string, PillEditPolicy>();
        const editAuthority = (pillId: string) => {
          const policy = policies.get(pillId);
          if (!policy) return { allowed: false, reason: `Unknown pill ${pillId}` };
          return pillEditAuthority(get().currentActor.role, policy);
        };
        /** Propose + audit; the shared path of proposeVersion and publishReview. */
        const propose = (pillId: string, baseVersion: string, changes: readonly RuleChange[], reason: string, via?: string) => {
          const h = history(pillId);
          const base = findVersion(h, baseVersion);
          if (!base) throw new Error(`Unknown version ${pillId}@${baseVersion}`);
          const refuse = (why: string): never => {
            log({ ...actorFields(), action: "version_proposal_blocked", pillId, pillVersion: baseVersion, detail: why });
            throw new GovernanceError(why);
          };
          if (!isKnownRole(get().currentActor.role)) {
            // No session identity bound yet: nobody to author the version.
            return refuse("No signed-in identity — sign in to propose a version");
          }
          const authority = editAuthority(pillId);
          if (!authority.allowed) return refuse(authority.reason ?? "Not authorised");
          let proposed: PillVersion;
          try {
            proposed = proposePure(base, changes, get().currentActor, reason, h, now());
          } catch (err) {
            // Malformed input (no reason, invalid rules) changes nothing; an
            // empty proposal is a policy refusal and is audited.
            if (!(err instanceof EmptyProposalError)) throw err;
            return refuse(err.message);
          }
          set((s) => ({ versions: { ...s.versions, [pillId]: [...h, proposed] } }));
          log({
            ...actorFields(),
            action: "version_proposed",
            pillId,
            pillVersion: proposed.version,
            detail: `Proposed v${proposed.version} from v${baseVersion}${via ? ` ${via}` : ""}: ${reason}`,
          });
          return proposed;
        };

        return {
          ...initialData(),

          setRole: (role) => {
            if (!isKnownRole(role)) throw new Error(`Role "${role}" is not defined in data/roles.json`);
            const actor = personaFor(role);
            const sessionStart = get().currentActor.role === UNRESOLVED_ROLE;
            set({ currentActor: actor });
            if (!sessionStart) {
              log({ ...actorFields(), action: "role_switched", detail: `Switched user to ${actor.name} (${roleLabel(role)})` });
            }
          },

          seedPills: (seeds) => {
            for (const s of seeds) {
              catalogs.set(s.id, s.pill.evidenceCatalog);
              const m = s.pill.manifest;
              policies.set(s.id, { owner: m.owner, steward: m.steward, approver: m.approver, access: m.access });
            }
            const at = now();
            const baseline = (pill: Pill, id: string) =>
              seedVersion(
                id,
                pill,
                { createdBy: personaFor(pill.manifest.owner), approvedBy: personaFor(pill.manifest.approver) },
                at,
              );
            // The pill files are authoritative. A stored baseline that no longer
            // matches them (pill updated by a deploy, or a hand-edited snapshot)
            // invalidates every version built on it: discard the stored state.
            const stale = seeds.filter((s) => {
              const stored = get().seedVersions[s.id]?.[0];
              return stored !== undefined && !sameBaseline(stored, baseline(s.pill, s.id));
            });
            if (stale.length > 0) {
              const actor = get().currentActor;
              set({ ...initialData({}, actor) });
              log({
                actor: "system",
                role: "system",
                action: "snapshot_discarded",
                detail: `Stored history discarded: baseline of ${stale.map((s) => s.id).join(", ")} no longer matches the pill files`,
              });
            }
            const missing = seeds.filter((s) => !get().seedVersions[s.id]);
            if (missing.length === 0) return;
            const added: Record<string, PillVersion[]> = {};
            for (const { id, pill } of missing) {
              added[id] = [baseline(pill, id)];
            }
            set((s) => ({
              seedVersions: { ...s.seedVersions, ...added },
              versions: { ...structuredClone(added), ...s.versions },
            }));
            for (const id of Object.keys(added)) {
              log({
                actor: "system",
                role: "system",
                action: "pill_seeded",
                pillId: id,
                pillVersion: added[id][0].version,
                detail: `Seeded ${id} v${added[id][0].version} from pill files`,
              });
            }
          },

          proposeVersion: (pillId, baseVersion, changes, reason) => propose(pillId, baseVersion, changes, reason),

          promoteToShadow: (pillId, version) => {
            const h = history(pillId);
            const target = findVersion(h, version);
            if (!target) throw new Error(`Unknown version ${pillId}@${version}`);
            const authority = shadowPromotionAuthority(target, get().currentActor);
            if (!authority.allowed && target.status === "Draft") {
              const why = authority.reason ?? "Not authorised";
              log({ ...actorFields(), action: "version_shadow_blocked", pillId, pillVersion: version, detail: why });
              throw new GovernanceError(why);
            }
            const next = promoteToShadow(h, version, get().currentActor, now());
            set((s) => ({ versions: { ...s.versions, [pillId]: next } }));
            log({ ...actorFields(), action: "version_shadowed", pillId, pillVersion: version, detail: `v${version} entered Shadow mode` });
          },

          recordShadowRun: (pillId, version, run) => {
            const key = shadowKey(pillId, version);
            set((s) => ({ shadowRuns: { ...s.shadowRuns, [key]: [...(s.shadowRuns[key] ?? []), run] } }));
            log({
              ...actorFields(),
              action: "shadow_run_recorded",
              pillId,
              pillVersion: version,
              incidentId: run.incidentId,
              detail: run.agree ? "Shadow agrees with approved version" : "Shadow disagrees with approved version",
            });
          },

          approveVersion: (pillId, version, evalReport, override) => {
            const h = get().versions[pillId];
            const target = h ? findVersion(h, version) : undefined;
            const actor = get().currentActor;
            const check: ApprovalCheck = target
              ? canApprove(target, evalReport, actor, override, { liveApprovedVersion: currentApproved(h)?.version })
              : {
                  allowed: false,
                  blockers: [`Unknown version ${pillId}@${version}`],
                  reasons: [{ code: "not_in_review", message: `Unknown version ${pillId}@${version}` }],
                  regressions: 0,
                  overridden: false,
                };
            if (!check.allowed || !h) {
              log({
                ...actorFields(),
                action: "version_approval_blocked",
                pillId,
                pillVersion: version,
                detail: check.blockers.join(" | "),
              });
              return check;
            }
            set((s) => ({ versions: { ...s.versions, [pillId]: markApproved(h, version, actor, now()) } }));
            // One event per approval; an override is an approval with its reason on record.
            log(
              check.overridden
                ? {
                    ...actorFields(),
                    action: "version_approval_overridden",
                    pillId,
                    pillVersion: version,
                    detail: `v${version} approved over ${check.regressions} eval regression(s): ${override?.reason.trim() ?? ""}`,
                  }
                : { ...actorFields(), action: "version_approved", pillId, pillVersion: version, detail: `v${version} approved` },
            );
            return check;
          },

          rollback: (pillId, toVersion, reason) => {
            const actor = get().currentActor;
            const h = get().versions[pillId];
            const target = h ? findVersion(h, toVersion) : undefined;
            const refuse = (why: string): never => {
              log({ ...actorFields(), action: "version_rollback_blocked", pillId, pillVersion: toVersion, detail: why });
              throw new GovernanceError(why);
            };
            if (!h) return refuse(`Unknown pill ${pillId}`);
            const authority = rollbackAuthority(target, currentApproved(h), actor);
            if (!authority.allowed) return refuse(authority.reason ?? "Not authorised");
            let next: PillVersion[];
            try {
              next = rollbackPure(h, pillId, toVersion, actor, reason, now());
            } catch (err) {
              return refuse((err as Error).message);
            }
            const restored = next[next.length - 1];
            set((s) => ({ versions: { ...s.versions, [pillId]: next } }));
            log({
              ...actorFields(),
              action: "version_rolled_back",
              pillId,
              pillVersion: restored.version,
              detail: `Rolled back to v${toVersion} rules as v${restored.version} (from v${restored.parentVersion}): ${reason}`,
            });
            return restored;
          },

          decideAction: ({ subject, ...input }) => {
            const actor = get().currentActor;
            const authority = decisionAuthority(actor.role, input.outcome, subject);
            if (!authority.allowed) {
              const why = authority.reason ?? "Not authorised";
              log({
                ...actorFields(),
                action: "action_decision_blocked",
                incidentId: input.incidentId,
                ruleId: input.ruleId,
                pillId: input.pillId,
                pillVersion: input.pillVersion,
                detail: `${input.outcome} refused: ${why}`,
              });
              throw new GovernanceError(why);
            }
            const record: ActionDecisionRecord = { ...input, actor, at: input.at ?? now() };
            set((s) => ({
              decisions: {
                ...s.decisions,
                [record.incidentId]: { ...(s.decisions[record.incidentId] ?? {}), [record.ruleId]: record },
              },
            }));
            log({
              ...actorFields(),
              action: ACTION_AUDIT[record.outcome],
              incidentId: record.incidentId,
              ruleId: record.ruleId,
              pillId: record.pillId,
              pillVersion: record.pillVersion,
              detail: decisionDetail(record),
            });
            return record;
          },

          confirmEvidence: ({ incidentId, pillId, pillVersion, key, eventId, suggestion }) => {
            const actor = get().currentActor;
            const refuse = (why: string): never => {
              log({
                ...actorFields(),
                action: "evidence_confirmation_blocked",
                incidentId,
                pillId,
                pillVersion,
                evidenceKey: key,
                detail: `Confirm ${key} refused: ${why}`,
              });
              throw new GovernanceError(why);
            };
            const catalog = catalogs.get(pillId);
            if (!catalog) return refuse(`Unknown pill ${pillId}`);
            const entry = Object.hasOwn(catalog, key) ? catalog[key] : undefined;
            if (!entry || entry.type !== "boolean") return refuse(`${key} is not a boolean evidence key of ${pillId}`);
            const authority = evidenceConfirmAuthority(actor.role, entry.confirmable_by);
            if (!authority.allowed) return refuse(authority.reason ?? "Not authorised");
            const record: EvidenceConfirmationRecord = {
              incidentId,
              key,
              value: true,
              eventId,
              pillId,
              ...(pillVersion ? { pillVersion } : {}),
              actor,
              at: now(),
              ...(suggestion ? { suggestion } : {}),
            };
            set((s) => ({
              evidenceConfirmations: {
                ...s.evidenceConfirmations,
                [incidentId]: { ...(s.evidenceConfirmations[incidentId] ?? {}), [key]: record },
              },
            }));
            log({
              ...actorFields(),
              action: "evidence_confirmed",
              incidentId,
              pillId,
              pillVersion,
              evidenceKey: key,
              detail:
                `Confirmed ${entry.label} (${key}) at ${eventId}` +
                (suggestion ? ` — Jev suggested ${suggestion.probability.toFixed(2)}, unconfirmed until now` : ""),
            });
            return record;
          },

          recordOutcome: (input) => {
            const { incidentId, pillId } = input;
            const numbers = [input.timeToIsolateMinutes, input.costSgd];
            if (numbers.some((n) => !Number.isFinite(n) || n < 0)) {
              throw new Error("Time-to-isolate and cost must be non-negative numbers");
            }
            const authority = editAuthority(pillId);
            if (!authority.allowed) {
              const why = authority.reason ?? "Not authorised";
              log({ ...actorFields(), action: "outcome_blocked", incidentId, pillId, detail: `Outcome refused: ${why}` });
              throw new GovernanceError(why);
            }
            const record: OutcomeRecord = { ...input, actor: get().currentActor, at: now() };
            set((s) => ({ outcomes: { ...s.outcomes, [incidentId]: record } }));
            log({
              ...actorFields(),
              action: "outcome_recorded",
              incidentId,
              pillId,
              detail: `Outcome confirmed: isolated in ${record.timeToIsolateMinutes} min · ${record.causeConfirmed}`,
            });
            return record;
          },

          reviewRule: ({ pillId, ruleId, outcome, decision }) => {
            const h = history(pillId);
            const live = currentApproved(h);
            if (!live) throw new Error(`${pillId} has no approved version to review`);
            const rule = live.rules.find((r) => r.id === ruleId);
            if (!rule) throw new Error(`Unknown rule ${ruleId} in ${pillId}@${live.version}`);
            const text = decision?.trim() ?? "";
            if (outcome === "edited" && !text) throw new Error("An edit needs the new decision text");
            const authority = editAuthority(pillId);
            if (!authority.allowed) {
              const why = authority.reason ?? "Not authorised";
              log({
                ...actorFields(),
                action: "rule_review_blocked",
                pillId,
                pillVersion: live.version,
                ruleId,
                detail: `${outcome} refused: ${why}`,
              });
              throw new GovernanceError(why);
            }
            const record: RuleReviewRecord = {
              pillId,
              pillVersion: live.version,
              ruleId,
              outcome,
              ...(outcome === "edited" ? { decision: text } : {}),
              actor: get().currentActor,
              at: now(),
            };
            const key = reviewKey(pillId, live.version);
            set((s) => ({ ruleReviews: { ...s.ruleReviews, [key]: { ...(s.ruleReviews[key] ?? {}), [ruleId]: record } } }));
            log({
              ...actorFields(),
              action: "rule_reviewed",
              pillId,
              pillVersion: live.version,
              ruleId,
              detail: outcome === "edited" ? `${ruleId} edited: ${text}` : `${ruleId} ${outcome}`,
            });
            return record;
          },

          publishReview: (pillId) => {
            const h = history(pillId);
            const live = currentApproved(h);
            if (!live) throw new Error(`${pillId} has no approved version to review`);
            const refuse = (why: string): never => {
              log({ ...actorFields(), action: "version_proposal_blocked", pillId, pillVersion: live.version, detail: why });
              throw new GovernanceError(why);
            };
            const pending = h.find((v) => v.status === "Draft" || v.status === "Shadow");
            if (pending) return refuse(`v${pending.version} is already in review — finish or roll it back before publishing another draft`);
            const reviews = get().ruleReviews[reviewKey(pillId, live.version)] ?? {};
            const undecided = live.rules.filter((r) => !reviews[r.id]).length;
            if (undecided > 0) return refuse(`${undecided} of ${live.rules.length} rules are not reviewed yet — decide every tile first`);
            const changes: RuleChange[] = [];
            const tally = { confirmed: 0, edited: 0, rejected: 0 };
            for (const r of live.rules) {
              const review = reviews[r.id];
              tally[review.outcome] += 1;
              if (review.outcome === "edited" && review.decision !== undefined) {
                changes.push({ op: "update", ruleId: r.id, patch: { decision: review.decision } });
              } else if (review.outcome === "rejected") {
                changes.push({ op: "remove", ruleId: r.id });
              }
            }
            const reason = `Decision Canvas review: ${tally.confirmed} confirmed, ${tally.edited} edited, ${tally.rejected} rejected`;
            return propose(pillId, live.version, changes, reason, "from the Decision Canvas");
          },

          resetDemo: () => {
            // Versions, decisions and shadow runs return to the seed; the audit
            // log is append-only and survives (the reset itself is audited).
            const actor = get().currentActor;
            const audit = get().audit;
            set({ ...initialData(get().seedVersions, actor), audit });
            log({ actor: actor.name, role: actor.role, action: "demo_reset", detail: "Demo reset to seeded pill versions" });
          },
        };
      },
      {
        name: GOVERNANCE_STORE_KEY,
        version: GOVERNANCE_STORE_VERSION,
        storage: tolerantJSONStorage(storage),
        partialize: (s): PersistedGovernanceData => ({
          versions: s.versions,
          seedVersions: s.seedVersions,
          audit: s.audit,
          decisions: s.decisions,
          shadowRuns: s.shadowRuns,
          evidenceConfirmations: s.evidenceConfirmations,
          outcomes: s.outcomes,
          ruleReviews: s.ruleReviews,
        }),
        // Unknown/older snapshot versions are discarded rather than half-migrated.
        migrate: () => undefined,
        // The snapshot is untrusted input: accept it only if it parses and
        // satisfies every governance invariant; otherwise start fresh.
        // The acting identity is always the in-memory (session-bound) one.
        merge: (persisted, current) => {
          const fresh = { ...current, ...initialData({}, current.currentActor) };
          if (persisted === undefined || persisted === null) return deepFreeze(fresh);
          const parsed = parseGovernanceSnapshot(persisted);
          if (!parsed.ok) {
            if (typeof console !== "undefined") console.warn(`[keystone] discarded stored governance state: ${parsed.reason}`);
            return deepFreeze(fresh);
          }
          return deepFreeze({ ...current, ...parsed.data, currentActor: current.currentActor });
        },
      },
    ),
  );
}

let browserStore: GovernanceStore | null = null;

/** Singleton store for the app (lazily created so SSR never touches localStorage). */
export function getGovernanceStore(): GovernanceStore {
  // Server render: a throwaway in-memory store, never shared between requests.
  if (typeof window === "undefined") return createGovernanceStore(memoryStorage());
  browserStore ??= createGovernanceStore();
  return browserStore;
}

export function useGovernanceStore<T>(selector: (state: GovernanceState) => T): T {
  return useStore(getGovernanceStore(), selector);
}
