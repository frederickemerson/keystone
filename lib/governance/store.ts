// MOSAIC governance — client store (zustand + localStorage persistence).
// Composes versions, approval, shadow runs, incident action decisions and the
// append-only audit log. Seeded from file pills (PillBundle) passed down from
// server components; "Reset demo" restores the seed state.

import { useStore } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { createStore, type Mutate, type StoreApi } from "zustand/vanilla";
import type { ComparisonResult, Pill } from "@/lib/engine";
import { canApprove, type ApprovalCheck, type ApprovalOverride, type ShadowRun } from "./approval";
import { hasCapability, roleLabel } from "./access";
import { appendAudit, EMPTY_AUDIT_LOG, type AuditInput, type AuditLog } from "./audit";
import {
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
/** Bump when the persisted shape changes; older snapshots are discarded. */
export const GOVERNANCE_STORE_VERSION = 1;

/**
 * Demo personas — the named human behind each role in the role switcher.
 * Names come from data/assets.json `people` where that role is staffed.
 */
export const DEMO_PERSONAS: Record<string, string> = {
  technician: "Duty Technician",
  asset_operations_manager: "Priya Nair",
  tenant_experience: "Lim Hui Fen",
  executive: "Portfolio Executive",
  head_technical_services: "Goh Boon Kheng",
  chief_engineer: "Tan Wei Ming",
  duty_lew: "Rahul Menon",
  dc_critical_facilities_manager: "Steven Wong",
};

export function personaFor(role: string): Actor {
  return { name: DEMO_PERSONAS[role] ?? roleLabel(role), role };
}

/** Minimal seed input — structurally satisfied by lib/pills PillBundle. */
export interface PillSeed {
  id: string;
  pill: Pill;
}

export type ActionOutcome = "approved" | "rejected" | "escalated";

export interface ActionDecisionRecord {
  incidentId: string;
  ruleId: string;
  outcome: ActionOutcome;
  actor: Actor;
  at: string;
  note?: string;
  pillId?: string;
  pillVersion?: string;
}

export interface GovernanceData {
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

export interface GovernanceActions {
  setRole: (role: string, name?: string) => void;
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
  decideAction: (
    input: Omit<ActionDecisionRecord, "actor" | "at"> & { at?: string },
  ) => ActionDecisionRecord;
  resetDemo: () => void;
}

export type GovernanceState = GovernanceData & GovernanceActions;

export type GovernanceStore = Mutate<StoreApi<GovernanceState>, [["zustand/persist", unknown]]>;

export const shadowKey = (pillId: string, version: string): string => `${pillId}@${version}`;

function initialData(seedVersions: Record<string, PillVersion[]> = {}): GovernanceData {
  return {
    currentActor: personaFor("asset_operations_manager"),
    versions: structuredClone(seedVersions),
    seedVersions,
    audit: EMPTY_AUDIT_LOG,
    decisions: {},
    shadowRuns: {},
  };
}

const ACTION_AUDIT = {
  approved: "action_approved",
  rejected: "action_rejected",
  escalated: "action_escalated",
} as const;

/** In-memory storage for tests / SSR. */
export function memoryStorage(): StateStorage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
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
    persist(
      (set, get) => {
        const log = (input: AuditInput) => set((s) => ({ audit: appendAudit(s.audit, { at: now(), ...input }) }));
        const history = (pillId: string): PillVersion[] => {
          const h = get().versions[pillId];
          if (!h) throw new Error(`Unknown pill ${pillId}`);
          return h;
        };
        const actorFields = () => ({ actor: get().currentActor.name, role: get().currentActor.role });

        return {
          ...initialData(),

          setRole: (role, name) => {
            const actor = name ? { name, role } : personaFor(role);
            set({ currentActor: actor });
            log({ ...actorFields(), action: "role_switched", detail: `Switched to ${roleLabel(role)} (${actor.name})` });
          },

          seedPills: (seeds) => {
            const missing = seeds.filter((s) => !get().seedVersions[s.id]);
            if (missing.length === 0) return;
            const at = now();
            const added: Record<string, PillVersion[]> = {};
            for (const { id, pill } of missing) {
              added[id] = [
                seedVersion(
                  id,
                  pill,
                  { createdBy: personaFor(pill.manifest.owner), approvedBy: personaFor(pill.manifest.approver) },
                  at,
                ),
              ];
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
            const h = history(pillId);
            const target = findVersion(h, version);
            if (!target) throw new Error(`Unknown version ${pillId}@${version}`);
            const actor = get().currentActor;
            const check = canApprove(target, evalReport, actor, override);
            if (!check.allowed) {
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
            if (check.overridden) {
              log({
                ...actorFields(),
                action: "version_approval_overridden",
                pillId,
                pillVersion: version,
                detail: `Approved over ${check.regressions} eval regression(s): ${override?.reason ?? ""}`,
              });
            }
            log({ ...actorFields(), action: "version_approved", pillId, pillVersion: version, detail: `v${version} approved` });
            return check;
          },

          rollback: (pillId, toVersion, reason) => {
            const actor = get().currentActor;
            const h = history(pillId);
            const target = findVersion(h, toVersion);
            const mayRollback =
              hasCapability(actor.role, "rollback_pill") || (target !== undefined && actor.role === target.approverRole);
            if (!mayRollback) throw new Error(`Role ${actor.role} is not authorised to roll back pills`);
            const next = rollbackPure(h, pillId, toVersion, actor, reason, now());
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

          decideAction: (input) => {
            const record: ActionDecisionRecord = { ...input, actor: get().currentActor, at: input.at ?? now() };
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
              detail: record.note ?? `${record.ruleId} ${record.outcome}`,
            });
            return record;
          },

          resetDemo: () => {
            const actor = get().currentActor;
            set({ ...initialData(get().seedVersions), currentActor: actor });
            log({ actor: actor.name, role: actor.role, action: "demo_reset", detail: "Demo reset to seeded pill versions" });
          },
        };
      },
      {
        name: GOVERNANCE_STORE_KEY,
        version: GOVERNANCE_STORE_VERSION,
        storage: createJSONStorage(() => storage),
        partialize: (s): GovernanceData => ({
          currentActor: s.currentActor,
          versions: s.versions,
          seedVersions: s.seedVersions,
          audit: s.audit,
          decisions: s.decisions,
          shadowRuns: s.shadowRuns,
        }),
        // Unknown/older snapshot versions are discarded rather than half-migrated.
        migrate: () => initialData(),
        merge: (persisted, current) => {
          const p = (persisted ?? {}) as Partial<GovernanceData>;
          return {
            ...current,
            ...p,
            audit: Object.freeze((p.audit ?? current.audit).map((e) => Object.freeze({ ...e }))),
          };
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
