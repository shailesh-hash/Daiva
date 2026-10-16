# Daiva Stories — Cursor Build Pack

A staged implementation blueprint for a short-form devotional and mythology storytelling app, initially focused on **Guru Daiva Dutta** stories, with a path to many devotional and fictional story universes.

## Product goals

- One codebase for browser, iOS, and Android using **React Native + Expo + React Native Web + TypeScript**.
- Node.js + TypeScript API, PostgreSQL, object storage, CDN, and serverless deployment.
- Launch with 5–10 short videos, browse by story/episode, watch, resume, favorite, search, and basic account support.
- AI helps users discover content and helps the team tag/summarize content. AI must not make up religious claims or publish content without human review.
- Start as a **modular monolith**, not microservices. Design boundaries so components can be extracted only when real scale requires it.

## Recommended first cloud

Use **AWS** for the first deployment to keep the initial design coherent:
- Frontend web: S3 + CloudFront (or Amplify Hosting).
- API: API Gateway + Lambda running Node.js/TypeScript.
- Database: Aurora PostgreSQL Serverless v2 where available and cost-appropriate, or RDS PostgreSQL with a small instance for predictable early-stage costs.
- Video source files: S3; video delivery: CloudFront; transcoding: MediaConvert or a managed video platform.
- Authentication: Amazon Cognito.
- Secrets/observability: Secrets Manager, CloudWatch, X-Ray/OpenTelemetry as appropriate.
- Async jobs: SQS + Lambda; EventBridge for scheduled tasks.

**Do not run PostgreSQL inside Lambda or store videos in PostgreSQL.** Store metadata in PostgreSQL and video files in object storage. Use signed URLs/cookies only where access control is needed.

Azure equivalent path is documented in `08_CLOUD_ALTERNATIVES.md`. Do not build AWS and Azure deployments simultaneously for MVP.

## Files in this pack

1. `01_PRODUCT_REQUIREMENTS.md` — MVP scope and acceptance criteria.
2. `02_ARCHITECTURE.md` — system design, scale strategy, and key decisions.
3. `03_DATA_MODEL.md` — PostgreSQL schema proposal.
4. `04_API_CONTRACT.md` — API routes and response conventions.
5. `05_CURSOR_IMPLEMENTATION_PLAN.md` — sequential, test-gated Cursor prompts.
6. `06_AI_AND_CONTENT_PIPELINE.md` — responsible AI, content ingestion, video delivery.
7. `07_SECURITY_TESTING_DEPLOYMENT.md` — security, CI, testing, launch checklist.
8. `08_CLOUD_ALTERNATIVES.md` — AWS first and Azure mapping.
9. `09_CURSOR_RULES.md` — repository-level instructions for Cursor.
10. `10_DECISIONS_AND_OPEN_QUESTIONS.md` — assumptions and decisions to revisit.

## How to use with Cursor

1. Create a new Git repository and open it in Cursor.
2. Copy this entire pack into the repository root (or unzip it there).
3. Open `09_CURSOR_RULES.md` and add its contents to `.cursor/rules/project.mdc` (or ask Cursor to do so).
4. Ask Cursor to read `01_PRODUCT_REQUIREMENTS.md`, `02_ARCHITECTURE.md`, `03_DATA_MODEL.md`, `04_API_CONTRACT.md`, and `09_CURSOR_RULES.md`.
5. Follow **one phase at a time** in `05_CURSOR_IMPLEMENTATION_PLAN.md`. Do not ask Cursor to generate the whole production system in one prompt.
6. After every phase, run the commands Cursor reports, inspect the diff, and commit only when tests pass.
7. Keep secrets out of source control. Use `.env.example` with placeholders only.

## MVP boundary

Build a usable vertical slice first:
- responsive home/catalogue
- story detail and episode list
- accessible video player with captions and loading/error states
- progress/resume and favorites
- basic sign-in (can be deferred until after public catalogue/player works)
- admin-only content publishing workflow
- seed 5–10 **owned, commissioned, licensed, or public-domain/appropriately licensed** videos

No need initially for microservices, Kubernetes, Kafka, Redis, a creator marketplace, comments, live streaming, complex subscriptions, or ML ranking. Add those only when user demand and measurements justify them.
