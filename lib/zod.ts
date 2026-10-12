// The project's single zod entry point. Import `z` from here, never from "zod"
// directly (lib/__tests__/zod-entry.test.ts enforces it).
//
// Zod v4 JIT-compiles object parsers with `new Function`, and before doing so
// probes for eval support (`allowsEval`). Under our CSP (no 'unsafe-eval') that
// probe fails closed but is still reported as a `securitypolicyviolation` on
// every page load. `jitless` skips both the probe and the JIT (zod's own
// documented switch for eval-free environments). It is read when a schema is
// constructed, so it must be set before any schema exists — which importing
// `z` only from this module guarantees.

import { z } from "zod";

z.config({ jitless: true });

export { z };
