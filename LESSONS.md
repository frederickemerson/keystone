# Lessons

Written by /aar-loop after each session's After Action Review. Read this file before starting a new task in this project. Every entry should be concrete and checkable, never vague.

## 2026-10-12 -- TokenHub intl returns 401006 'service ID does not exist' for every model until the account completes identity verification (2-4 days); free quota claim fails with 'account is not verified'. Plan live-AI demos on a fallback chain from day 1.
- Expected: TokenHub key would serve hy4-preview immediately.
- Actual: All models 401006; KYC required; shipped CodeBuddy SDK -> TokenHub -> OpenAI -> recorded fixtures chain.
- Why: Inference endpoints are VIRTUAL/charge off until activation, which needs a verified account.
- tags: tokenhub,llm,fallback

## 2026-10-12 -- Builder-reported bugs are hypotheses: before fixing one, reproduce it with a failing vitest against the store. 'DRAFT-02 Propose is refused (in review)' was false; the store accepts it as v1.4.0 and stale_base guards approval. My first 'fix' (one-in-review in propose()) broke 2 tests that encode the intended parallel-draft design.
- Expected: Builder C's open issue described real store behaviour.
- Actual: No such refusal exists; adding one contradicted the stale_base design.
- Why: Builder inferred behaviour from publishReview's message without running proposeFromNote twice.
- tags: multi-agent,verification,governance
