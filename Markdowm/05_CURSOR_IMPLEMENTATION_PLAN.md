# 05 — Cursor Implementation Plan (One Phase at a Time)

## How to work

Paste **one phase prompt at a time** into Cursor Agent. Require Cursor to inspect the current repository, make a small coherent change, run checks, report files changed and commands/results, and stop. Review before starting the next phase. Do not accept a large rewrite that skips tests.

## Phase 0 — Repository and decisions

Prompt:

> Read `README.md`, `01_PRODUCT_REQUIREMENTS.md`, `02_ARCHITECTURE.md`, `03_DATA_MODEL.md`, `04_API_CONTRACT.md`, `07_SECURITY_TESTING_DEPLOYMENT.md`, and `09_CURSOR_RULES.md`. Do not implement features yet. Propose a repository structure for a TypeScript monorepo using pnpm workspaces, Expo Router with React Native Web, and a Node.js TypeScript API suitable for AWS Lambda. Choose Fastify plus a Lambda adapter and Prisma unless a concrete compatibility issue requires a change. List risks, package versions to verify, and exact phase-1 commands. Do not invent current package versions; inspect the installed environment or official package metadata if tools are available. Stop for review.

Acceptance: architecture decision record, package layout, commands, and risks documented.

## Phase 1 — Monorepo scaffold

Prompt:

> Implement only the workspace scaffold agreed in Phase 0. Add apps/client (Expo + Expo Router + TypeScript + web), apps/api (Fastify + TypeScript), packages/domain (shared types/schemas), packages/api-client, and packages/config if useful. Add root scripts for lint, typecheck, test, and build. Add `.env.example` with placeholders only. Do not add real cloud resources or secrets. Keep dependencies compatible and lock them. Run install, lint, typecheck, tests, and web build; fix failures. Summarize exact results and stop.

Acceptance: clean install; web app opens; API health endpoint responds locally; checks pass.

## Phase 2 — Design system and browse UI with mock data

Prompt:

> Implement responsive Home, Search, Story Detail, and Episode list screens using accessible React Native components that work on web and native. Use typed mock data in a separate fixture module, not inline throughout components. Include Guru Daiva Dutta as the initial sample universe, but clearly mark all fictional placeholder titles as draft/sample content. Add loading, empty, and error states. Do not yet implement authentication, AI, payments, or cloud storage. Add component/screen tests and verify web build.

Acceptance: browse flow works with mock data at mobile and desktop widths; tests pass.

## Phase 3 — Video player adapter

Prompt:

> Implement a platform-aware video player abstraction. Use an HTML5/HLS-capable player for web and a currently supported Expo-compatible player for iOS/Android. Isolate platform-specific code in `.web` and `.native` modules if needed. Include play/pause, seek, volume/mute where supported, captions when supplied, loading/error states, and playback progress callbacks. Use only a local test clip or a rights-cleared sample asset. Do not scrape video sites or hardcode third-party URLs. Document how to test on web, iOS simulator, and Android emulator. Add tests for player state and progress callbacks; run typecheck/build.

Acceptance: player can play an approved sample asset on web; native code compiles for Expo-supported targets; platform limitations documented.

## Phase 4 — PostgreSQL + Prisma schema

Prompt:

> Implement the data model from `03_DATA_MODEL.md` as a valid Prisma schema, including missing category/tag relations, explicit relations for media assets and content rights, and constraints needed for safe publishing. Configure PostgreSQL via `DATABASE_URL` and create initial migration. Add seed data for one universe and a few draft stories/episodes with no fabricated rights approvals. Never seed production credentials. Add repository/service tests for status and relationship rules. Run Prisma format, validation, migration against a local/test database, and typecheck. Stop.

Acceptance: migration works from empty database; seed is repeatable; draft content does not appear in public catalogue.

## Phase 5 — Catalog API

Prompt:

> Implement public catalogue endpoints from `04_API_CONTRACT.md`: universes, stories, episodes, and search. Use Fastify, Zod (or one selected validation library), Prisma, cursor pagination, structured errors, and OpenAPI. Public endpoints must return only published content with READY media. Add unit and integration tests for pagination, invalid input, unpublished content, and empty results. No auth shortcuts or admin endpoints in this phase. Run all checks and stop.

Acceptance: API tests prove unpublished/draft content is never exposed.

## Phase 6 — Connect frontend to API

Prompt:

> Replace mock catalogue access with the typed `packages/api-client` and TanStack Query. Keep mock data available only through explicit development fixtures. Add API base URL configuration, query keys, loading/empty/error states, and retry behavior appropriate to the request. Do not expose secrets in the client. Add tests for API error handling and verify web build.

Acceptance: screens render seeded database data and recover gracefully from API failure.

## Phase 7 — Authentication and user features

Prompt:

> Integrate the chosen managed identity provider (AWS Cognito for the AWS path) using the current recommended Expo/web flow. Do not implement password storage ourselves. Create/resolve the internal app user by verified identity subject. Implement favorites and playback progress endpoints with ownership checks. Add sign-in/out UI, token refresh behavior, and tests for unauthenticated requests and cross-user IDOR attempts. Document local development setup. Run all checks.

Acceptance: user A cannot read or mutate user B's favorites/progress; tokens never appear in logs.

## Phase 8 — Admin content management

Prompt:

> Build a protected admin interface and server-side admin role checks. Support create/edit universe/story/episode, draft/review status, metadata, and rights evidence. Add an audit log for sensitive actions. Publishing must fail unless the episode has approved content review, valid rights record, and a READY media asset. Admin controls hidden in UI are not security; enforce everything in API. Add negative tests for every publishing precondition.

Acceptance: cannot publish missing-rights, unreviewed, or unprocessed content.

## Phase 9 — Video upload and processing

Prompt:

> Implement admin-only upload-session creation using short-lived S3 presigned URLs and server-generated object keys. Add upload completion validation and an asynchronous processing workflow using SQS/Lambda and MediaConvert or the selected managed video provider. Track processing states idempotently; add retry and dead-letter behavior. Keep source bucket private and serve renditions through CloudFront. Do not proxy video bytes through the API. Add integration tests around state transitions and document manual cloud setup. If AWS credentials are unavailable, use interfaces and a local fake adapter; do not pretend cloud deployment succeeded.

Acceptance: upload -> queued -> processing -> ready/failed is observable and repeatable.

## Phase 10 — Search and AI-assisted discovery

Prompt:

> Implement deterministic search first using PostgreSQL full-text search or indexed metadata. Add an `AiProvider` interface and a mock provider for tests. Implement AI discovery as optional reranking/semantic assistance over a bounded set of eligible published content; the AI must only recommend IDs from retrieved results and must not invent titles or URLs. If AI times out/errors, return deterministic results. Add rate limits, cost/latency metrics, feedback, prompt-injection defenses, and privacy minimization. Admin AI metadata is draft-only and requires human approval. Add tests for hallucinated IDs, provider failure, and unauthorized calls.

Acceptance: feature works with AI disabled; AI cannot publish content or return arbitrary external links.

## Phase 11 — Observability, security, and release hardening

Prompt:

> Apply `07_SECURITY_TESTING_DEPLOYMENT.md`. Add request IDs, structured logs, health/readiness checks, metrics, dependency scanning, rate limiting, CSP/security headers for web, safe CORS, DB connection strategy, backup/restore documentation, and cost alarms. Add a small load-test script for catalogue endpoints and playback-session creation (not video bandwidth). Run lint, typecheck, unit/integration tests, web build, and dependency audit. Report all remaining risks; do not claim a production readiness certification.

Acceptance: release checklist completed; known limitations and operational runbooks documented.

## Phase 12 — AWS deployment

Prompt:

> Implement infrastructure as code using AWS CDK or Terraform (choose one, do not mix). Deploy separate dev/staging environments first: frontend hosting/CDN, API Gateway/Lambda, PostgreSQL with safe connection pooling, Cognito, private S3 media buckets, CloudFront, SQS/DLQ, secrets, logs, alarms, and least-privilege IAM. Use placeholders/parameters for account and region; never commit credentials. Add deployment and rollback instructions. If credentials are absent, generate and validate IaC locally but explicitly state that no deployment was performed.

Acceptance: deployment can be reproduced from documented commands; rollback and restore path documented.

## Phase 13 — Launch content and product validation

Prompt:

> Add 5–10 rights-cleared Guru Daiva Dutta short episodes through the admin workflow. Do not invent stories as canonical facts; identify original dramatizations, source references, language, AI involvement, and reviewer approval. Verify captions, playback on low bandwidth, mobile browser, iOS, Android, privacy/terms, account deletion, and analytics opt-out where applicable. Create a launch checklist and record measured results.

Acceptance: all published episodes have documented rights and human review; playback tested on target platforms.

## Rules for every phase

- Do not skip earlier acceptance criteria.
- Do not implement payments until the core retention and content rights model is stable.
- Do not introduce Redis/Kafka/microservices without a documented measured need.
- Never claim tests or deployment succeeded unless commands actually ran and output supports the claim.
- If a cloud service, credential, or package API is unavailable, implement an interface/mock and clearly document the blocker.
