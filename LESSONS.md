# Lessons

Written by /aar-loop after each session's After Action Review. Read this file before starting a new task in this project. Every entry should be concrete and checkable, never vague.

## 2026-10-12 -- TokenHub intl returns 401006 'service ID does not exist' for every model until the account completes identity verification (2-4 days); free quota claim fails with 'account is not verified'. Plan live-AI demos on a fallback chain from day 1.
- Expected: TokenHub key would serve hy4-preview immediately.
- Actual: All models 401006; KYC required; shipped CodeBuddy SDK -> TokenHub -> OpenAI -> recorded fixtures chain.
- Why: Inference endpoints are VIRTUAL/charge off until activation, which needs a verified account.
- tags: tokenhub,llm,fallback
