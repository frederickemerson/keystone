# Keystone — agent notes

- Read `LESSONS.md` (project) and `~/.claude/AAR_LESSONS.md` (global) before starting work.
- Verification gate before any push to `main` (auto-deploys to Vercel): `npx tsc --noEmit && npx vitest run && npx next build`.
- Pill content (`pills/`) and demo data (`data/`) share one contract: each pill's `evidence.yaml`; `lib/data/__tests__/consistency.test.ts` enforces it. Change the contract first, then the content.
- Safety invariant: gates are deterministic (`lib/engine`); LLM and Jev output is only ever a draft or an unconfirmed suggestion.
