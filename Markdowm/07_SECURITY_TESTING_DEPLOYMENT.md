# 07 — Security, Testing, and Deployment

## Security baseline

- Use managed identity (Cognito on AWS path); never store raw passwords.
- Verify JWT issuer, audience/client, signature, expiry, and relevant claims.
- Enforce user ownership and admin roles on every protected endpoint.
- Use least-privilege IAM and separate dev/staging/prod accounts or environments.
- Keep S3 source bucket private; block public access; serve via controlled CDN origin access.
- Generate short-lived upload URLs; constrain key, content length/type where supported; verify actual media after upload.
- Validate input and limit request size, upload size, and request duration.
- Rate-limit login-adjacent, search, AI, playback-session, and upload endpoints.
- Use parameterized database access and reviewed migrations.
- Store secrets in Secrets Manager/managed environment configuration, never Git or client bundles.
- Do not log access tokens, signed URLs, full sensitive prompts, or private user history.
- Configure CORS to known origins; do not use wildcard origins with credentials.
- Set web security headers including a suitable Content Security Policy.
- Define retention, account deletion, consent, and privacy notice before public launch.
- Add abuse reporting/takedown and copyright complaint workflow before accepting third-party uploads.

## Testing pyramid

### Unit tests
- domain validation and publication eligibility
- pagination/cursor parsing
- recommendation deterministic ranking and AI output validation
- media processing state machine
- role/permission policy

### API integration tests
- published versus draft visibility
- missing media/rights/review blocks publishing
- favorites and progress ownership (IDOR prevention)
- expired/invalid tokens
- malformed body/query/path
- rate limit and error mapping
- AI provider failure fallback

### Frontend tests
- browse/search/detail/player states
- loading, empty, and failure states
- keyboard navigation and focus visibility on web
- captions control presence when captions exist
- responsive layouts and deep-link routing

### End-to-end tests
- visitor browse -> play
- signed-in user favorite -> refresh -> favorite persists
- playback progress -> continue watching
- admin upload -> processing -> review -> publish
- unpublish -> episode no longer appears in public catalogue

## CI pipeline

On every pull request:
1. install using lockfile
2. lint
3. format check
4. typecheck
5. unit tests
6. integration tests against disposable/test PostgreSQL
7. web production build
8. dependency and secret scan

On deployment:
1. deploy to dev/staging
2. run smoke tests
3. verify migrations are backward-compatible
4. require approval for production
5. deploy with rollback instructions and database backup plan

## Database and resilience

- Automated backups and point-in-time recovery where supported.
- Document restore procedure and test it periodically.
- Use backward-compatible expand/migrate/contract schema changes.
- Use bounded retries with exponential backoff and jitter for transient failures.
- Make queue handlers idempotent.
- Configure dead-letter queues and alert on growing backlog.
- Set Lambda reserved concurrency and database connection limits.
- Health endpoint must not leak internal infrastructure details.
- Document RPO and RTO; do not claim disaster recovery until tested.

## Cost guardrails

- Budget alarms for CDN egress, media transcoding, AI usage, database, logs, and serverless invocations.
- Set AI token/request budgets and rate limits.
- Set log retention.
- Test a typical watch session and estimate cost per watch-hour.
- Remember video egress and transcoding can dominate costs; “serverless” does not mean free or automatically cheap.

## Release checklist

- [ ] Rights and license evidence for every published asset.
- [ ] Human review and captions/metadata completed.
- [ ] Privacy policy, terms, account deletion and support contact ready.
- [ ] No secrets in repo, source maps, logs, or client bundles.
- [ ] Tests and dependency checks pass.
- [ ] Backup and restore procedure tested.
- [ ] Monitoring and cost alerts enabled.
- [ ] Web, iOS, and Android smoke tests performed.
- [ ] CDN caching and signed access behavior verified.
- [ ] Content takedown process documented.
