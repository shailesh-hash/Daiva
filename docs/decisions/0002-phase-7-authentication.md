# 0002 — Phase 7 authentication

## Decision

Use Amazon Cognito as the production identity provider with Authorization Code + PKCE on a public app client. The API verifies Cognito **access tokens** with `aws-jwt-verify` (signature, issuer, expiry, `token_use`, `client_id`) and maps `sub` to `app_users.auth_subject`.

Local development and tests use `AUTH_MODE=test`: HMAC-signed access tokens minted by `POST /v1/dev/sessions`. That route is disabled in production and when `AUTH_MODE=cognito`.

## Consequences

- No passwords are stored.
- No client secret is shipped in Expo public env.
- `/v1/me/*` ownership always comes from the verified principal.
- Account deletion is not implemented in this phase.
- `/v1/admin/*` is role-checked in Phase 8 via `ADMIN_SUBJECTS`.
