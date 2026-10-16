# ADR 0001 — Phase 0: repository, stack, and delivery plan

- **Status:** Accepted — Phase 1 implemented against this record
- **Date:** 2026-10-16
- **Product:** Daiva Stories (provisional name)
- **Scope:** Architecture decisions, monorepo layout, compatibility risks, Phase 1 commands, and acceptance criteria
- **Out of scope:** Application features, cloud resources, package installation, and any claim that checks passed

This record follows `Markdowm/05_CURSOR_IMPLEMENTATION_PLAN.md` Phase 0. Versions below were observed from the local environment, npm registry, and official documentation on 2026-10-16. They are not a lockfile. Phase 1 must re-query and pin what is actually installed.

---

## 1. Current repository

Inspected on branch `main`, tracking `origin/main` (`https://github.com/shailesh-hash/Daiva.git`). HEAD is `3f12d44 Initial commit`.

**Tracked files**

- `README.md` — stub: “Daiva / Mythology stories”
- `LICENSE` — MIT, copyright 2026 `shailesh-hash`

**Present but untracked**

- `Markdowm/` — full Cursor build pack (specs 01–10 plus pack README)
- `.cursor/rules/project.mdc` — already matches `Markdowm/09_CURSOR_RULES.md`
- `.DS_Store`

**Not present**

- `package.json`, lockfile, `pnpm-workspace.yaml`, `apps/`, `packages/`
- TypeScript, Expo, API, Prisma, tests, CI, IaC
- `.gitignore`, `.env.example`, `.nvmrc` / `.node-version`

This is a documentation-only repository. Phase 1 will scaffold the monorepo; it will not implement catalogue, player, auth, AI, or AWS resources.

### Local toolchain actually observed

| Tool | Result | Notes |
| --- | --- | --- |
| Node.js | **v20.19.2** | `/Users/shaileshshivashettar/.local/node/bin/node` |
| npm | 10.8.2 | Bundled with that Node |
| corepack | 0.31.0 | Present |
| pnpm | **not working** | Not on PATH at inspection start. `corepack enable pnpm` created shims; invoking `pnpm` then failed with `Cannot find module .../corepack/v1/pnpm/12.14.0/bin/pnpm.cjs`. Do not treat pnpm as installed. |
| Yarn / Bun | not found | — |
| Docker | 28.0.4 | Engine present. `docker compose` was not found in this environment. |
| `psql` | not found | Local PostgreSQL client absent |
| AWS CLI | not found | Expected; no cloud work in Phase 0–1 |
| nvm / fnm / volta | not found | Node 22 upgrade path must be chosen in Phase 1 |

Node 20.19.2 is **not** compatible with Expo SDK 58 (requires Node `^22.13.0 \|\| ^24.3.0 \|\| ^26.0.0 \|\| >=27.0.0`). Phase 1 is blocked until Node is upgraded.

---

## 2. Decisions

| ID | Decision | Why |
| --- | --- | --- |
| D1 | pnpm workspaces monorepo | Required by the Phase 0 prompt; Expo documents first-class pnpm workspace support. |
| D2 | Apps: `apps/client` (Expo) and `apps/api` (Fastify). Shared: `packages/domain`, `packages/api-client`, `packages/config`. | Matches Phase 1 prompt. Keep the graph small. |
| D3 | Expo SDK **58** + Expo Router + React Native Web | Latest stable SDK on npm (`expo@58.0.13`). Official template is `default@sdk-58`. |
| D4 | Pin web output to **`web.output: "static"`** | SDK 58 defaults to server rendering, which cannot be hosted on S3 + CloudFront. Architecture specifies static web + CDN. |
| D5 | Fastify 5 + `@fastify/aws-lambda` | Compact Lambda adapter; do not introduce NestJS. |
| D6 | Prisma **7** (`prisma@7` / `@prisma/client@7`), not Prisma 8 | npm `prisma@latest` is `8.0.0-rc.23`. Official Prisma docs: lock v7 until v8 GA. Prisma is **not** installed in Phase 1; schema starts in Phase 4. |
| D7 | Zod 4 + `@fastify/type-provider-zod` for API validation | Zod is the spec’s schema library. Observed `@fastify/type-provider-zod@1.0.1` peers `zod >= 4.2.0` and `fastify ^5.5.0`. |
| D8 | Node.js **22 LTS** for local, CI, and Lambda `nodejs22.x` | Satisfies Expo 58, Prisma 7, and Vitest 5. AWS Lambda still lists `nodejs22.x` as supported (deprecation 2027-04-30). Do not stay on Node 20. |
| D9 | TypeScript **6.0.3** workspace-wide (not TypeScript 7) | Expo SDK 58’s `default@sdk-58` template pins `typescript@6.0.3`. Root, client, and `pnpm.overrides` use that same version. npm `typescript@latest` remains 7.x and is not used. Prisma 7’s peer is `>=5.4.0`. |
| D10 | ESLint **9.x** + `eslint-config-expo`, not ESLint 10 | npm `eslint@latest` is 10.13.0. Expo issue: `eslint-config-expo` crashes on ESLint 10 via `eslint-plugin-react`. Stay on 9. |
| D11 | Vitest for unit/API tests; React Native Testing Library for UI | Vitest 5 engines require Node `^22.12.0`. Jest is not the workspace default. |
| D12 | No Turbo / Nx in MVP | pnpm `-r` scripts are enough until measured CI time justifies a task runner. |
| D13 | Admin UI lives in `apps/client` as web-only `/admin` routes | Spec asks for a simple protected web interface, not a second frontend. Authorization remains server-side. |
| D14 | Provider interfaces only; AWS adapters later | `AiProvider`, `MediaStorageProvider`, `VideoProcessingProvider`, `IdentityProvider`, `QueuePublisher`. No Azure deployment in MVP. |
| D15 | IaC later: **AWS CDK in TypeScript** under `infra/` (Phase 12) | Same language as the app. Do not mix Terraform. Not created in Phase 1. |
| D16 | Identity: Amazon Cognito (Phase 7) | Spec AWS path. Never store passwords. Anonymous browse; sign-in required only for favorites/progress. |
| D17 | Video: `expo-video` on native; HTML5 + HLS (`hls.js` where needed) on web | Spec names `expo-video` or a currently supported player. `expo-video@58.0.11` exists. Player work is Phase 3. |
| D18 | pnpm `nodeLinker: hoisted` initially | Expo’s `create-expo-app` pnpm default. Isolated installs are supported from SDK 54, but React Native duplicate-native-module risk is lower with hoisting for a first scaffold. Revisit isolated installs if installs are clean. |
| D19 | Keep specs in `Markdowm/` for Phase 1; add `docs/decisions/` | Avoid a large unrelated move. Rename `Markdowm` → `docs/specs` only if requested. |
| D20 | Workspace package names use `@daiva/*` | Internal scope only; not published. Product name remains provisional (trademark still open). |

Assumptions that do **not** block Phase 1: Kannada-first content, English UI chrome, 5–10 Guru Daiva Dutta episodes, free pilot, human review before publish. Product naming, cultural reviewer, and media-production method remain as in `10_DECISIONS_AND_OPEN_QUESTIONS.md`.

---

## 3. Proposed monorepo

```text
.
├── apps/
│   ├── client/                 # Expo SDK 58, Expo Router, RN Web, TypeScript
│   │   ├── app/                # file-based routes (web URLs = native screens)
│   │   ├── src/
│   │   ├── app.json / app.config.ts
│   │   └── package.json        # @daiva/client
│   └── api/                    # Fastify modular monolith
│       ├── src/
│       │   ├── app.ts          # buildApp() — routes and plugins
│       │   ├── server.ts       # local listen
│       │   ├── lambda.ts       # @fastify/aws-lambda handler (stub until Phase 12)
│       │   └── modules/
│       │       └── health/     # GET /health in Phase 1; /v1/* from Phase 5
│       └── package.json        # @daiva/api  ("type": "module")
├── packages/
│   ├── domain/                 # shared types, Zod schemas, publication rules
│   ├── api-client/             # typed fetch client used by the app
│   └── config/                 # shared tsconfig, ESLint, Prettier
├── docs/
│   └── decisions/              # ADRs (this file)
├── Markdowm/                   # existing product/architecture pack
├── .cursor/rules/project.mdc
├── .env.example                # placeholders only
├── .gitignore
├── .node-version               # 22 (exact patch chosen at Phase 1)
├── package.json                # private workspace root
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── README.md
```

Later, not Phase 1:

- `packages/ui` — design-system primitives (Phase 2 if shared components need a home)
- `packages/adapters-aws` — S3, Cognito, SQS, MediaConvert (Phases 7–12)
- `infra/` — AWS CDK (Phase 12)
- `docker-compose.yml` — local PostgreSQL (Phase 4)

### Workspace protocol

- Internal deps: `"@daiva/domain": "workspace:*"`
- `packages/domain` exports TypeScript source (no React Native, no Node server APIs)
- Client: Metro compiles workspace packages
- API: `tsx` for local dev; `tsc` emit for Lambda bundle later

### Client routing (Phase 1 placeholder screens only)

- `app/index.tsx` — Home
- `app/search.tsx` — Search
- `app/stories/[slug].tsx` — Story detail
- `app/episodes/[id].tsx` — Player (stub until Phase 3)
- Deep links and CloudFront SPA fallback are documented in Phase 6/12, not implemented now

### API shape (Phase 1)

- Local: `GET /health` → `{ "status": "ok", "requestId": "..." }`
- Versioned product API starts at `/v1` in Phase 5
- Dual entry: `server.ts` for laptop; `lambda.ts` wraps the same `buildApp()`

### Root scripts (Phase 1)

```json
{
  "scripts": {
    "lint": "pnpm -r --if-present lint",
    "format:check": "prettier --check .",
    "typecheck": "pnpm -r --if-present typecheck",
    "test": "pnpm -r --if-present test",
    "build": "pnpm -r --if-present build",
    "dev:client": "pnpm --filter @daiva/client start",
    "dev:web": "pnpm --filter @daiva/client web",
    "dev:api": "pnpm --filter @daiva/api dev"
  }
}
```

---

## 4. Package metadata observed on 2026-10-16

Queried with `npm view` against the public registry. **Do not copy these as a lockfile.** Re-verify at Phase 1 install time.

### Runtime alignment (official docs)

Expo SDK compatibility table (https://docs.expo.dev/versions/latest/):

| Expo SDK | React Native | React | React Native Web | Min Node |
| --- | --- | --- | --- | --- |
| 58.0.0 | 0.88 | 19.3.0 | 0.21.0 | 22.13.x |
| 57.0.0 | 0.86 | 19.2.3 | 0.21.0 | 22.13.x |
| 56.0.0 | 0.85 | 19.2.3 | 0.21.0 | 20.19.x |

AWS Lambda Node runtimes (https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html): `nodejs22.x` supported; `nodejs20.x` already past deprecation date 2026-04-30. `nodejs24.x` exists; not required for MVP.

Node.js 22 LTS “Jod” latest listed on nodejs.org dist index: **v22.23.3** (2026-09-23).

### npm `latest` (and chosen pins where `latest` is unsafe)

| Package | `npm view … version` | Phase 1/later intent |
| --- | --- | --- |
| `expo` | 58.0.13 (`dist-tag latest`; engines Node `^22.13.0 \|\| ^24.3.0 \|\| ^26.0.0 \|\| >=27.0.0`) | SDK 58. Install Expo packages with `pnpm expo install` so they match the SDK. |
| `expo-router` | 58.0.22 | Client. Must pass `--template default@sdk-58` — Expo docs warn that untagged `create-expo-app@latest` may still scaffold SDK 57 during the transition. |
| `expo-video` | 58.0.11 | Phase 3, not Phase 1 |
| `react` / `react-dom` | 19.3.1 | Let Expo pin; docs table says 19.3.0 for SDK 58 |
| `react-native` | 0.88.0 | Expo-managed |
| `react-native-web` | 0.21.4 | Expo-managed |
| `create-expo-app` | 5.0.0 | Scaffold only |
| `fastify` | 5.12.7 | API |
| `@fastify/aws-lambda` | **6.4.2** | Must be **>= 6.4.1** (CVE-2026-18248 in 6.4.0) |
| `@fastify/cors` | 11.3.1 | API |
| `@fastify/swagger` | 9.9.2 | Phase 5 |
| `@fastify/swagger-ui` | 6.1.2 | Phase 5 |
| `@fastify/type-provider-zod` | 1.0.1 | peers: Fastify ^5.5.0, Zod >= 4.2.0 |
| `zod` | 4.6.7 | Domain + API |
| `prisma` | **8.0.0-rc.23** (`latest`); **7.10.1** on `prev` | **Install `prisma@7` / `@prisma/client@7`**. Never `npx prisma` unpinned. |
| `@prisma/client` | 7.10.1 | Phase 4 |
| `@prisma/adapter-pg` | 7.10.1 | Phase 4 (Prisma 7 requires a driver adapter) |
| `pg` | 8.23.1 | Phase 4 |
| `@tanstack/react-query` | 5.104.3 | Phase 6 |
| `typescript` | **7.0.2** (`latest`); 5.9.2 and **5.9.3** exist on the 5.9 line | **Use 5.9.x** |
| `vitest` | 5.0.5 (engines Node `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0`) | Tests |
| `eslint` | **10.13.0** (`latest`); 9.39.5 on the 9 line | **Use ESLint 9** |
| `eslint-config-expo` | 58.0.4 (peer `eslint >= 8.10`) | Client lint; still incompatible with ESLint 10 in practice |
| `prettier` | 3.9.10 | Format |
| `pnpm` | 12.14.0 (`latest`) | Workspace manager via corepack |
| `@testing-library/react-native` | 14.1.0 | UI tests (peer includes `jest` — confirm Vitest adapter in Phase 2) |
| `@types/react` | 19.3.0 | Client |
| `@types/node` | 26.6.5 | Do not blindly install latest; match Node 22 (`@types/node@22`) |

Prisma 7 constraints from https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7 and https://www.prisma.io/docs/orm/release-status:

- Node `^20.19.0 \|\| ^22.12.0 \|\| >=24.0.0`; recommended 22.x
- TypeScript 5.4+; recommended 5.9.x
- ESM (`"type": "module"`)
- Driver adapter required (`PrismaPg` + `pg`)
- `prisma.config.ts`; dotenv not auto-loaded
- `npx prisma` without `@7` installs Prisma 8 RC, which does not use `schema.prisma` / `migrate` the v7 way

---

## 5. Compatibility risks

### Blockers for Phase 1

1. **Node 20.19.2 vs Expo 58.** Local Node cannot run the chosen SDK. Upgrade to Node 22.13+ (prefer current 22 LTS, observed v22.23.3) before any `create-expo-app` or `pnpm install`.
2. **pnpm is not actually usable yet.** Corepack is present; a live `pnpm -v` did not succeed in this environment. Phase 1 must print a real pnpm version before scaffolding.
3. **SDK 58 template flag.** `pnpm create expo-app` without `--template default@sdk-58` may create SDK 57. That would split React Native / Node requirements.

### High — handle in Phase 1 config

4. **Expo Router web default is server output.** If left unchanged, `expo export --platform web` will not produce a static site for S3 + CloudFront. Set `web.output: "static"` in app config. Dynamic episode URLs then need `generateStaticParams` or a CloudFront 404 → `index.html` fallback (document in Phase 6/12).
5. **SDK 58 async routes on web default to on.** Fine for production splitting; if tests or first-load debugging get confusing, set `asyncRoutes: { web: false }` in the expo-router plugin.
6. **React 19 + duplicate copies in a monorepo.** Expo docs: duplicate `react` / `react-native` cause runtime errors. Use pnpm `overrides` / peer rules if `pnpm why react` shows two versions. Enable `experiments.autolinkingModuleResolution` if native builds see duplicate native modules (SDK 55+ auto-enables this in monorepos).
7. **Hoisted vs isolated pnpm.** Isolated is stricter and breaks some RN libraries. Start hoisted (`pnpm-workspace.yaml` `nodeLinker: hoisted`).

### High — later phases, design now

8. **Prisma 8 RC on npm `latest`.** Any unpinned `prisma` install will grab 8.0.0-rc.23. Pin `prisma@7.10.1` (or `^7`) and `@prisma/client@7.10.1` together in Phase 4. Use `pnpm exec prisma` / `pnpm dlx prisma@7`, never bare `npx prisma`.
9. **Prisma 7 on Lambda.** Rust-free client + `@prisma/adapter-pg` is the right Lambda direction (smaller bundle), but connection pooling vs Lambda concurrency is still a production risk. RDS Proxy / Aurora + reserved concurrency is Phase 11–12. Phase 4 uses local Postgres.
10. **`@fastify/aws-lambda@6.4.0` CVE-2026-18248.** Spoofable `x-apigateway-event` could forge authorizer claims. Require **6.4.1+** (observed latest 6.4.2). Do not authorize from `request.awsLambda.event` until the handler is reviewed in Phase 7/12.
11. **TypeScript 7 and ESLint 10 are `latest` and unsafe for this stack.** Workspace root must pin 5.9.x and ESLint 9 so `pnpm add typescript eslint` cannot silently jump majors.
12. **Vitest 5 vs Testing Library Jest peer.** `@testing-library/react-native@14.1.0` lists `jest >= 29` as a peer. Phase 2 must confirm the Vitest RN testing setup, or add a narrow Jest runner only for component tests. Do not invent a working config in this ADR.
13. **No local PostgreSQL client; Docker Compose plugin not found.** Phase 4 needs a database. Prefer `docker run` of the official `postgres` image, or install Compose. Do not install Postgres in Lambda or in Phase 1.
14. **Video rights and HLS.** Player and CDN work must not scrape third-party URLs. Sample asset must be owned/licensed. HLS on Chrome typically needs `hls.js`; Safari/iOS can play HLS natively. Isolate `.web` / `.native` modules in Phase 3.

### Medium

15. **Cognito + Expo web vs native auth** differ (Phase 7). Use the current Expo AuthSession / hosted-UI guidance at that time; do not pre-code an obsolete flow.
16. **Kannada + AI quality** is unproven (Phase 10). Deterministic search ships first.
17. **Product name / trademark** still open. `@daiva` is a code namespace only.
18. **Xcode 26.4+ / iOS 16.4+** for SDK 58 native builds. Web-first MVP is fine; native compile is a Phase 3 acceptance item.

---

## 6. Development commands

Nothing below was executed successfully as a full scaffold. Node 22 and a working pnpm must exist first.

### 6.1 Prerequisites (run before Phase 1 code)

```bash
# 1. Install Node.js 22 LTS (>= 22.13.0). Observed latest 22 LTS: v22.23.3
node -v   # must print v22.13.x or newer on the 22 line

# 2. Enable pnpm through Corepack and verify it actually runs
corepack enable
corepack prepare pnpm@12.14.0 --activate
command -v pnpm
pnpm -v   # must print 12.14.0 (or the version Corepack reports)

# 3. Confirm Docker engine (needed in Phase 4, not Phase 1)
docker version
```

If `pnpm -v` fails, stop. Do not scaffold with npm/yarn; the workspace contract is pnpm.

### 6.2 Exact Phase 1 commands (after approval)

Run from the repository root. Re-query versions if a command’s template has moved.

```bash
# Workspace metadata
# Create package.json (private, packageManager: "pnpm@12.14.0", engines.node: "^22.13.0")
# Create pnpm-workspace.yaml:
#   packages:
#     - "apps/*"
#     - "packages/*"
#   nodeLinker: hoisted
# Create .gitignore, .nvmrc/.node-version (22), .env.example (placeholders only)

export PNPM_NODE_LINKER=hoisted

# Client — force SDK 58
pnpm create expo-app --template default@sdk-58 apps/client
# Then rename the app package to @daiva/client and add workspace deps

# API and packages (created by hand in Phase 1, not via a third-party generator)
# apps/api, packages/domain, packages/api-client, packages/config

pnpm install

# Tooling: pin majors explicitly (do not install typescript@latest or eslint@latest)
pnpm add -Dw typescript@5.9.3 prettier@3.9.10 eslint@9.39.5 vitest@5.0.5
# Client Expo-managed packages:
pnpm --filter @daiva/client exec expo install typescript @types/react --dev
pnpm --filter @daiva/client exec expo install eslint eslint-config-expo --dev
pnpm --filter @daiva/client exec expo install react-dom react-native-web @expo/metro-runtime

# API runtime
pnpm --filter @daiva/api add fastify @fastify/aws-lambda@^6.4.2 zod
pnpm --filter @daiva/api add -D tsx @types/node@22

# Shared
pnpm --filter @daiva/domain add zod

# Checks — only claim pass/fail from this actual output
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm --filter @daiva/client exec expo export --platform web
pnpm --filter @daiva/api dev   # then GET http://localhost:<port>/health
```

Phase 1 must also set `web.output` to `"static"` in the Expo app config immediately after `create-expo-app`.

### 6.3 Commands that must not run in Phase 1

- `npx prisma` / `pnpm create prisma@latest` (would pull Prisma 8 RC)
- AWS CDK/Terraform apply, Cognito, S3, MediaConvert
- Installing both Fastify and NestJS
- Seeding “canonical” Guru Daiva Dutta stories or third-party video URLs

---

## 7. Phase 0 / Phase 1 acceptance criteria

### Phase 0 (this record) — done when you approve

- [x] All listed spec files read
- [x] Repository inspected (git, files, toolchain)
- [x] Stack chosen: pnpm workspaces, Expo Router + RN Web, Fastify + Lambda adapter, Prisma 7 (from Phase 4)
- [x] Monorepo layout proposed
- [x] Versions taken from npm/docs, not invented; failures of commands recorded
- [x] Risks and Phase 1 commands written
- [ ] **Your approval to start Phase 1**

### Phase 1 (next, after approval)

- Node 22.13+ and a verified `pnpm -v`
- `pnpm install` from lockfile succeeds
- `GET /health` responds locally from Fastify
- Expo web dev server starts; `expo export --platform web` produces a **static** `dist`
- Root `lint`, `format:check`, `typecheck`, `test` run; results reported honestly
- `.env.example` has placeholders only; no secrets
- No Prisma schema, no AWS resources, no catalogue UI beyond the Expo template

### Later gates (unchanged from the pack)

- Phase 4: draft content never appears in the public catalogue
- Phase 5: unpublished/not-READY media never returned by public APIs
- Phase 7: user A cannot read user B’s favorites/progress
- Phase 8: publish fails without approved rights, review, and READY media
- Phase 10: AI cannot invent IDs/URLs; deterministic fallback works

---

## 8. Mapping to later phases

| Phase | What this ADR implies |
| --- | --- |
| 1 | Scaffold only, Node 22 + pnpm + static Expo web + Fastify health |
| 2 | Browse UI in `apps/client` with fixtures in a dedicated module; Guru Daiva Dutta marked sample/draft |
| 3 | `VideoPlayerAdapter` + `expo-video` + web HLS; rights-cleared sample only |
| 4 | Prisma 7 schema from `03_DATA_MODEL.md` plus category/tag/rights relations; Docker Postgres |
| 5 | Fastify `/v1` catalogue; Zod; cursor pagination; OpenAPI |
| 6 | `@daiva/api-client` + TanStack Query |
| 7 | Cognito; ownership checks |
| 8 | `/admin` web routes + server role checks + audit log |
| 9 | Presigned S3 upload; SQS + MediaConvert behind interfaces |
| 10 | Postgres FTS first; `AiProvider` mock; no hallucinated IDs |
| 11 | Security/observability from `07_SECURITY_TESTING_DEPLOYMENT.md` |
| 12 | AWS CDK, `nodejs22.x`, RDS Proxy/Aurora, private source bucket, CloudFront |
| 13 | 5–10 rights-cleared episodes through admin, not through git LFS hacks |

---

## 9. Files this phase created

- `docs/decisions/0001-phase-0-repository-and-stack.md` (this file)

No application code, lockfile, or cloud resources.

## 10. Commands run in Phase 0

| Command | Result |
| --- | --- |
| `git status`, `git log`, `git ls-files`, `find` | Specs-only repo; untracked `Markdowm/` and `.cursor/` |
| `node -v` | v20.19.2 |
| `npm -v` | 10.8.2 |
| `pnpm -v` (initial) | not found |
| `corepack --version` | 0.31.0 |
| `docker --version` | 28.0.4 |
| `psql --version` / `aws --version` | not found |
| `npx expo --version` | **57.0.31** after ~41s (`npx` resolved Expo CLI; not an SDK 58 project). Confirms the need for `--template default@sdk-58`. |
| `corepack enable pnpm` then `pnpm -v` | shims created; runtime failed (`MODULE_NOT_FOUND` for pnpm 12.14.0 cjs) |
| `npm view` for expo, fastify, prisma, zod, typescript, eslint, vitest, pnpm, and related packages | Succeeded; versions in §4 |
| `curl https://nodejs.org/dist/index.json` | Latest listed Node 22 LTS: v22.23.3 |

No lint, typecheck, test, or web build was run because there is no app to build.

---

## 11. Stop

Phase 0 is documentation only. **Do not start Phase 1 until this ADR is approved**, including:

1. Upgrade to Node 22 LTS before scaffolding
2. Expo SDK 58 with **static** web output
3. Fastify 5 + `@fastify/aws-lambda` >= 6.4.2
4. Prisma 7 in Phase 4 (not Prisma 8 RC, not in Phase 1)
5. TypeScript 5.9.x and ESLint 9 (not TS 7 / ESLint 10)
6. Admin inside `apps/client`; CDK later under `infra/`
