# Cursor Project Rules — Daiva Stories

Paste into `.cursor/rules/project.mdc` and keep active for this repository.

## Product and architecture
- Read the relevant Markdown specs before implementing a phase.
- Build a cross-platform short-video storytelling app with Expo, React Native, React Native Web, and TypeScript.
- Backend is Node.js + TypeScript, modular monolith, PostgreSQL.
- AWS is the first deployment target. Keep provider adapters where useful; do not implement both AWS and Azure in the MVP.
- Use managed services and simple architecture. Do not introduce microservices, Kubernetes, Kafka, or Redis unless a documented measurement or requirement justifies them.
- Video bytes must not pass through the API or PostgreSQL. Use object storage and CDN.
- Use migrations for schema changes and keep migrations committed.

## Engineering practices
- Strict TypeScript; avoid `any`. If unavoidable, explain and isolate it.
- Validate all external inputs at runtime.
- Use typed API contracts and consistent errors.
- Add tests with each feature; do not defer all tests to the end.
- Run lint, format check, typecheck, unit/integration tests, and web build after each phase.
- Do not claim a command ran or passed unless it actually ran and succeeded.
- Make minimal, focused diffs. Do not rewrite unrelated files.
- Prefer accessible components, responsive layouts, and explicit loading/empty/error states.
- Use environment variables for configuration and `.env.example` for placeholders only.
- Never put secrets, real tokens, private keys, or production credentials in source control.
- Do not use real user data in tests.

## Security and content
- Never store passwords; use a managed identity provider.
- Enforce authorization on the server for every protected operation.
- Prevent IDOR by checking ownership on each resource.
- Do not trust client-provided role, media URL, object key, rights status, or publication status.
- Publishing requires human review, approved content rights, and ready media.
- Do not scrape or re-upload third-party videos without explicit redistribution rights.
- AI-generated content is a draft until reviewed by a human.
- AI must not invent catalog items/URLs or publish content.
- Do not infer sensitive personal attributes from devotional viewing behavior.
- Keep signed URLs/tokens out of logs.

## Working protocol
- Follow `05_CURSOR_IMPLEMENTATION_PLAN.md` in order, one phase at a time.
- Before coding, summarize the phase and files to change.
- If a decision is ambiguous, state the assumption and choose the simplest safe option; ask only when the decision blocks progress.
- If package APIs or cloud service availability may have changed, verify against official documentation rather than guessing.
- After coding, report changed files, commands run, pass/fail results, and remaining risks.
- Stop after each phase and wait for user review.
