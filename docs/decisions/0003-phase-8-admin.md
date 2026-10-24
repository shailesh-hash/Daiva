# 0003 — Phase 8 admin publishing

## Decision

Admin access is a server-side allowlist of identity subjects (`ADMIN_SUBJECTS`). The API never trusts a client-supplied role. `/v1/me.isAdmin` is derived from the same allowlist so the Expo admin screens can hide themselves; those screens are not a security boundary.

Episode publication is only available through `POST /v1/admin/episodes/:id/publish`. PATCH cannot set `PUBLISHED`. The handler uses `evaluatePublication`: approved editorial review, approved unexpired rights, READY media, and a published parent universe and story.

Media upload and transcoding stay in Phase 9. This phase records media metadata as `UPLOADED` and, in `AUTH_MODE=test` only, allows `mark-ready` so local publish can be exercised without S3.

## Consequences

- Production must set `ADMIN_SUBJECTS` explicitly. Local test mode defaults to `dev:admin`.
- Every create/update/review/publish writes `admin_audit_log`.
- Hiding the Admin nav link does not grant or deny access.
