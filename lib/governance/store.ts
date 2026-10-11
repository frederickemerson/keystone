// MOSAIC governance — client store (zustand + localStorage persistence).
// Composes versions, approval, shadow runs, incident action decisions and the
// append-only audit log. Seeded from file pills (PillBundle) passed down from
// server components; "Reset demo" restores the seed state.

import { useStore } from "zustand";
import { createJSONStorage, persist, type PersistStorage, type StateStorage } from "zustand/middleware";
import { createStore, type Mutate, type StoreApi } from "zustand/vanilla";
import type { ComparisonResult, Pill } from "@/lib/engine";
import { canApprove, type ApprovalCheck, type ApprovalOverride, type ShadowRun } from "./approval";
import {
  DEFAULT_ROLE,
  decisionAuthority,
  hasCapability,
  isKnownRole,
  personaFor,
  roleLabel,
  UNRESOLVED_ACTOR,
  type DecisionOutcome,
  type DecisionSubject,
} from "./access";
import { appendAudit, EMPTY_AUDIT_LOG, type AuditInput, type AuditLog } from "./audit";
import { parseGovernanceSnapshot } from "./snapshot";
import {
  currentApproved,
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
 *  v2: role `tenant_experience` renamed to `tenant_experience_manager` in roles.json. */
export const GOVERNANCE_STORE_VERSION = 2;

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

export interface GovernanceData {
  /** UNRESOLVED_ACTOR until the persisted snapshot has been read (SSR + hydration). */
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
export interface GovernanceActions {
  /** Act as the named persona of a roles.json role (the persona is bound to the role). */
  setRole: (role: string) => void;
  /** Seed any pill not already in the store (persisted edits survive reloads). */
  seedPills: (seeds: readonly PillSeed[]) => void;
  proposeVersion: (pillId: string, baseVersion: string, changes: readonly RuleChange[], reason: string) => PillVersion;
  promoteToShadow: (pillId: string, version: string) => void;
  recordShadowRun: (pillId: string, version: string, run: ShadowRun) => void;
  /** Runs canApprove(); approves only when allowed. Blocked attempts are audited too. */
  approveVersion: (
    pillId: string,
    version: string,
    evalReport: Pick<ComparisonResult, "regressions"> | null,
    override?: ApprovalOverride,
  ) => ApprovalCheck;
  rollback: (pillId: string, toVersion: string, reason: string) => PillVersion;
  /** Throws GovernanceError (after auditing the refusal) when the acting role lacks the grant. */
  decideAction: (
    input: Omit<ActionDecisionRecord, "actor" | "at"> & { at?: string; subject?: DecisionSubject },
  ) => ActionDecisionRecord;
  resetDemo: () => void;
}

export type GovernanceState = GovernanceData & GovernanceActions;

export type GovernanceStore = Mutate<StoreApi<GovernanceState>, [["zustand/persist", unknown]]>;

export const shadowKey = (pillId: string, version: string): string => `${pillId}@${version}`;

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
        if (typeof console !== "undefined") console.warn("[mosaic] stored governance state unreadable; starting fresh");
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

        return {
          ...initialData(),

          setRole: (role) => {
            if (!isKnownRole(role)) throw new Error(`Role "${role}" is not defined in data/roles.json`);
            const actor = personaFor(role);
            set({ currentActor: actor });
            log({ ...actorFields(), action: "role_switched", detail: `Switched to ${roleLabel(role)} (${actor.name})` });
          },

          seedPills: (seeds) => {
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

          proposeVersion: (pillId, baseVersion, changes, reason) => {
            const h = history(pillId);
            const base = findVersion(h, baseVersion);
            if (!base) throw new Error(`Unknown version ${pillId}@${baseVersion}`);
            const proposed = proposePure(base, changes, get().currentActor, reason, h, now());
            set((s) => ({ versions: { ...s.versions, [pillId]: [...h, proposed] } }));
            log({
              ...actorFields(),
              action: "version_proposed",
              pillId,
              pillVersion: proposed.version,
              detail: `Proposed v${proposed.version} from v${baseVersion}: ${reason}`,
            });
            return proposed;
          },

          promoteToShadow: (pillId, version) => {
            const next = promoteToShadow(history(pillId), version);
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
              : { allowed: false, blockers: [`Unknown version ${pillId}@${version}`], regressions: 0, overridden: false };
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
            const mayRollback =
              hasCapability(actor.role, "rollback_pill") || (target !== undefined && actor.role === target.approverRole);
            if (!mayRollback) return refuse(`Role ${actor.role} is not authorised to roll back pills`);
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
        partialize: (s): GovernanceData => ({
          currentActor: s.currentActor,
          versions: s.versions,
          seedVersions: s.seedVersions,
          audit: s.audit,
          decisions: s.decisions,
          shadowRuns: s.shadowRuns,
        }),
        // Unknown/older snapshot versions are discarded rather than half-migrated.
        migrate: () => undefined,
        // The snapshot is untrusted input: accept it only if it parses and
        // satisfies every governance invariant; otherwise start fresh.
        merge: (persisted, current) => {
          const fresh = { ...current, ...initialData({}, personaFor(DEFAULT_ROLE)) };
          if (persisted === undefined || persisted === null) return deepFreeze(fresh);
          const parsed = parseGovernanceSnapshot(persisted);
          if (!parsed.ok) {
            if (typeof console !== "undefined") console.warn(`[mosaic] discarded stored governance state: ${parsed.reason}`);
            return deepFreeze(fresh);
          }
          return deepFreeze({ ...current, ...parsed.data });
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
