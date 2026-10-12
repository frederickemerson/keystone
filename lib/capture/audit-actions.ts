// Audit action names the frontline-capture features append. Dependency-free so
// lib/governance/audit.ts can spread them into AUDIT_ACTIONS without pulling in
// the rest of the capture contract. Re-exported from ./contract.

/** Audit actions the capture features append (spread into AUDIT_ACTIONS). */
export const CAPTURE_AUDIT_ACTIONS = [
  "capture_task_created",
  "capture_task_answered",
  "capture_task_dismissed",
  "capture_task_blocked",
  "voice_note_recorded",
  "voice_note_blocked",
  "readback_confirmed",
  "readback_corrected",
  "readback_blocked",
  "draft_from_note_proposed",
  "draft_from_note_blocked",
  "peer_confirmed",
  "peer_disputed",
  "peer_confirm_blocked",
] as const;
export type CaptureAuditAction = (typeof CAPTURE_AUDIT_ACTIONS)[number];
