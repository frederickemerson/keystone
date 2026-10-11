// Keystone demo auth — constant-time passcode check (Node runtime only).

import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Compare a submitted passcode with the expected one in constant time. Both
 * sides are hashed first so the comparison never leaks the expected length.
 */
export function passcodeMatches(submitted: string, expected: string): boolean {
  const a = createHash("sha256").update(submitted, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}
