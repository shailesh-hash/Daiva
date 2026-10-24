# Daiva Stories

Cross-platform short-video mythology and devotional storytelling app. This repository is an Expo + Fastify TypeScript monorepo. The first collection is Guru Daiva Dutta.

Phase 4 adds a Prisma 7 PostgreSQL schema and a repeatable development seed. Guru Daiva Dutta titles remain invented placeholders. A database row is never treated as public catalogue content unless the universe, story, and episode are published, rights are approved, editorial review is approved, and media is READY. Phase 7 adds managed authentication, favorites, and playback progress. Phase 8 adds a server-enforced admin workflow. Payments and AWS resources are not implemented yet.

## Prerequisites

- Node.js 22.13 or newer (22 LTS). This repo pins `.node-version` to 22.23.3
  and fails `pnpm install` on older versions (`engine-strict`).
- If this machine still has Node 20 on `PATH`, prepend the Phase 1 install:
  `export PATH="$HOME/.local/node-v22/bin:$PATH"`. Cursor terminals do this via
  `.vscode/settings.json`; direnv users can `direnv allow` the repo `.envrc`.
- pnpm 12, via Corepack: `corepack enable && corepack prepare pnpm@12.14.0 --activate`

## Workspace

| Path                  | Package             | Role                                      |
| --------------------- | ------------------- | ----------------------------------------- |
| `apps/client`         | `@daiva/client`     | Expo, Expo Router, React Native Web       |
| `apps/api`            | `@daiva/api`        | Fastify API (local + Lambda adapter stub) |
| `packages/domain`     | `@daiva/domain`     | Shared types and Zod schemas              |
| `packages/api-client` | `@daiva/api-client` | Typed HTTP client                         |
| `packages/config`     | `@daiva/config`     | Shared TypeScript config                  |

Product specs live in `Markdowm/`. Architecture decisions live in `docs/decisions/`.

## Commands

```bash
pnpm install
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build

pnpm dev:api    # Fastify on http://localhost:3000
pnpm dev:web    # Expo web
```

Copy `.env.example` to `.env` for local overrides. Never commit secrets.

## PostgreSQL (Phase 4)

Local development uses Docker Compose and Prisma 7. The Compose password `daiva` is a placeholder, not a production credential.

```bash
export PATH="$HOME/.local/node-v22/bin:$PATH"
# If the Docker CLI cannot see Colima: export DOCKER_HOST=unix://$HOME/.colima/default/docker.sock
cp .env.example .env
pnpm db:up
# Fallback when the Compose plugin is missing:
# docker run --name daiva-postgres -e POSTGRES_USER=daiva -e POSTGRES_PASSWORD=daiva -e POSTGRES_DB=daiva -p 5432:5432 -d postgres:16
pnpm --filter @daiva/api prisma:generate
pnpm db:migrate
pnpm db:seed
```

Use `pnpm exec prisma` / workspace scripts, never unpinned `npx prisma` (npm `latest` is Prisma 8 RC). Schema lives in `apps/api/prisma/schema.prisma`. Migrations live in `apps/api/prisma/migrations` and must stay in Git. The generated client in `apps/api/src/generated` is gitignored.

The seed creates one Guru Daiva Dutta universe, draft stories/episodes, unapproved rights, pending reviews, and a status-only PUBLISHED episode that still fails publication rules. Re-running seed is idempotent. It refuses to run when `NODE_ENV=production`.

## Public catalogue API (Phase 5)

Base path `/v1`. OpenAPI JSON is at `/v1/openapi.json`; Swagger UI is at `/docs`.

| Method | Path                              | Notes                                                          |
| ------ | --------------------------------- | -------------------------------------------------------------- |
| GET    | `/v1/universes`                   | Published universes that have at least one public episode      |
| GET    | `/v1/universes/:slug`             | 404 if draft/unpublished                                       |
| GET    | `/v1/stories`                     | Filters: `universe`, `language`, `category`, `limit`, `cursor` |
| GET    | `/v1/stories/:slug`               | Published stories with READY public episodes only              |
| GET    | `/v1/stories/:storySlug/episodes` | READY media only                                               |
| GET    | `/v1/episodes/:episodeId`         | READY media metadata; no object keys                           |
| GET    | `/v1/search?q=`                   | Published stories and episodes                                 |

A row is public only when the universe, story, and episode are `PUBLISHED`, rights are approved and unexpired, editorial review is `APPROVED`, and current media is `READY`. The development seed grants local publication to a few sample episodes so the client can fetch PostgreSQL data through the API. Those grants are marked `dev-seed` and are not production rights clearance. Draft and status-only rows stay hidden.

## Client catalogue (Phase 6)

The Expo app loads published catalogue data through `@daiva/api-client` and TanStack Query. `EXPO_PUBLIC_API_BASE_URL` is the only client API setting and must stay a public http(s) URL. Set `EXPO_PUBLIC_USE_CATALOGUE_FIXTURES=true` only when you explicitly want the in-repo mock catalogue.

```bash
export PATH="$HOME/.local/node-v22/bin:$PATH"
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev:api
pnpm dev:web
```

Open `http://localhost:8081`. Home, Search, Story, and Episode screens should show the development-published sample titles and must not show `unpublished-editorial-draft`.

## Authentication (Phase 7)

Browse remains public. Sign-in is required only to persist favorites and playback progress.

The API verifies **access tokens**. It never trusts a user id, role, or subject from the request body. The verified `sub` is mapped to `app_users.auth_subject`. Soft-deleted users are rejected.

| Mode                | When                                  | How                                                                                     |
| ------------------- | ------------------------------------- | --------------------------------------------------------------------------------------- |
| `AUTH_MODE=test`    | Local development and automated tests | HMAC-signed access tokens. `POST /v1/dev/sessions` mints one. Disabled in production.   |
| `AUTH_MODE=cognito` | Staging/production                    | `aws-jwt-verify` checks signature, issuer, expiry, `token_use=access`, and `client_id`. |

Create a Cognito **public** app client (no client secret) with Authorization Code + PKCE.

Callback / redirect URLs:

- Web: `http://localhost:8081/sign-in`
- Native: `daiva://sign-in`
- Production web: `https://<your-domain>/sign-in`

Cognito Hosted UI / OAuth endpoints:

- Authorize: `https://<COGNITO_DOMAIN>/oauth2/authorize`
- Token: `https://<COGNITO_DOMAIN>/oauth2/token`
- Revoke: `https://<COGNITO_DOMAIN>/oauth2/revoke`

Scopes: `openid email profile`. The API uses the returned **access token**, not the ID token.

Local sign-in:

1. Keep `AUTH_MODE=test` and `EXPO_PUBLIC_AUTH_MODE=test`
2. Start the API and Expo web
3. Open Sign in and continue with a label such as `dev:local-user`
4. Favorite a published story and play an episode
5. Refresh Library and confirm favorites and continue watching persist
6. Sign in as a second label and confirm the first user's library is not visible

Do not put `AUTH_TEST_SECRET` or a Cognito client secret in Expo public env vars or the git repo. Account deletion is deferred to the public-launch privacy work.

## Admin publishing (Phase 8)

Admin routes live under `/v1/admin`. The API decides admin access from `ADMIN_SUBJECTS` (comma-separated identity subjects). The client `isAdmin` flag is informational only.

| Method     | Path                                              | Notes                                                       |
| ---------- | ------------------------------------------------- | ----------------------------------------------------------- |
| POST/PATCH | `/v1/admin/universes`                             | Create/edit; status may be `PUBLISHED`                      |
| POST/PATCH | `/v1/admin/stories`                               | Create/edit; status may be `PUBLISHED`                      |
| POST/PATCH | `/v1/admin/episodes`                              | Metadata only. PATCH cannot set `PUBLISHED`                 |
| POST       | `/v1/admin/episodes/:id/media`                    | Creates `UPLOADED` media metadata. Upload bytes are Phase 9 |
| POST       | `/v1/admin/episodes/:id/media/mark-ready`         | Local `AUTH_MODE=test` only                                 |
| POST       | `/v1/admin/episodes/:id/rights`                   | Unapproved rights evidence                                  |
| POST       | `/v1/admin/episodes/:id/rights/:rightsId/approve` | Server sets approver and timestamp                          |
| POST       | `/v1/admin/episodes/:id/submit-review`            | Moves episode to `IN_REVIEW`                                |
| POST       | `/v1/admin/episodes/:id/review`                   | Human approve/reject                                        |
| POST       | `/v1/admin/episodes/:id/publish`                  | Fails unless review, rights, and READY media pass           |
| POST       | `/v1/admin/episodes/:id/unpublish`                | Removes the episode from the public catalogue               |
| GET        | `/v1/admin/audit-log`                             | Sensitive admin actions                                     |

Local walkthrough:

1. Set `ADMIN_SUBJECTS=dev:admin` (or rely on the test-mode default)
2. Sign in as `dev:admin`
3. Open Admin, create or edit a universe/story/episode
4. Publish is rejected until parents are published, media is READY, rights are approved, and review is approved
5. After publish, the public catalogue shows the episode; unpublish hides it again

Video upload sessions, S3, and MediaConvert are Phase 9.

## Sample player (Phase 3)

The episode screen plays `apps/client/assets/sample/sample.mp4`, a 4-second locally generated color clip with silent audio. It is not a Guru Daiva Dutta recording and does not come from a third-party host. Video bytes never pass through the API.

Leave `EXPO_PUBLIC_SAMPLE_VIDEO_URI` blank to use the bundled clip. A configured URI may be a relative path or `http://localhost` / `127.0.0.1` only. YouTube, Vimeo, TikTok, and other remote hosts are rejected.

### How to test

**Web**

1. `export PATH="$HOME/.local/node-v22/bin:$PATH"`
2. `pnpm dev:web` and open `http://localhost:8081/episodes/ep-lamp-01`
3. Confirm the poster, then Play, Pause, Back 10s / Forward 10s, Mute, volume, and Show captions
4. Open Library and confirm continue watching updates after playback progresses
5. Optional HLS check: serve a local `.m3u8` on localhost and set `EXPO_PUBLIC_SAMPLE_VIDEO_URI`

Safari can play HLS natively. Chromium uses `hls.js` for `.m3u8` sources. Progressive MP4 uses the HTML5 `<video>` element.

**iOS simulator**

1. Install Xcode and the iOS Simulator
2. `cd apps/client && pnpm exec expo start --ios`
3. Open the same episode. Native playback uses `expo-video` (AVPlayer). Volume buttons may be limited by the iOS silent switch; Mute still works on the player. Captions come from the muxed `mov_text` track when the native player exposes it.

**Android emulator**

1. Install Android Studio and an emulator image
2. `cd apps/client && pnpm exec expo start --android`
3. Open the same episode. Native playback uses `expo-video` (ExoPlayer / Media3). HLS works when the configured localhost URI ends in `.m3u8` or `contentType` is `hls`.

A development build is required for custom native config. Expo Go includes `expo-video` for SDK 58, but always verify on a current SDK 58 client. This phase did not run Xcode or Gradle compiles on this machine.

## License

MIT
