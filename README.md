# Daiva Stories

Cross-platform short-video mythology and devotional storytelling app. This repository is an Expo + Fastify TypeScript monorepo. The first collection is Guru Daiva Dutta.

Phase 1 is workspace scaffolding only. Catalogue, player, authentication, AI, and AWS resources are not implemented yet.

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

## License

MIT
