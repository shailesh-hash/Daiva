# 04 — API Contract

Base path: `/v1`. JSON responses. Use a consistent error shape. All list endpoints must paginate. Exact route framework is chosen in implementation phase.

## Conventions

Success list:
```json
{
  "data": [],
  "page": { "nextCursor": null }
}
```

Error:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "requestId": "correlation-id",
    "details": []
  }
}
```

Never expose stack traces, database errors, secrets, raw provider exceptions, or internal object keys in production responses.

## Public catalogue

- `GET /v1/universes?language=kn&limit=20&cursor=...`
- `GET /v1/universes/:slug`
- `GET /v1/stories?universe= guru-daiva-dutta&language=kn&category=...&limit=20&cursor=...`
- `GET /v1/stories/:slug`
- `GET /v1/stories/:storySlug/episodes?limit=30&cursor=...`
- `GET /v1/episodes/:episodeId` — only published episode and ready media metadata.
- `GET /v1/search?q=...&language=kn&limit=20&cursor=...`

## User endpoints (authenticated)

- `GET /v1/me`
- `GET /v1/me/favorites`
- `PUT /v1/me/favorites/:storyId` — idempotently add favorite.
- `DELETE /v1/me/favorites/:storyId`
- `GET /v1/me/progress?limit=20&cursor=...`
- `PUT /v1/me/progress/:episodeId` body: `{ "positionSeconds": 42, "completed": false }`
- `GET /v1/me/recommendations?limit=10` — deterministic fallback required.
- `POST /v1/me/recommendation-feedback` body: `{ "recommendationId": "...", "rating": "HELPFUL" }`

## Playback and media

- `POST /v1/episodes/:episodeId/playback-session` — verifies episode is published and media ready; returns playback URL or CDN manifest and any expiry metadata. Do not route video bytes through API.
- For public content, playback URL may be a CDN URL. For restricted content, return short-lived signed access after entitlement checks.
- `POST /v1/admin/media-upload-session` — admin-only; returns short-lived signed upload URL and server-generated object key.
- `POST /v1/admin/media-assets/:mediaAssetId/complete-upload` — validates upload metadata and enqueues processing.

## Admin endpoints (role-checked server side)

- `POST /v1/admin/universes`
- `PATCH /v1/admin/universes/:id`
- `POST /v1/admin/stories`
- `PATCH /v1/admin/stories/:id`
- `POST /v1/admin/episodes`
- `PATCH /v1/admin/episodes/:id`
- `POST /v1/admin/episodes/:id/submit-review`
- `POST /v1/admin/episodes/:id/review` — approve/reject with notes.
- `POST /v1/admin/episodes/:id/publish` — only if review, rights, and media readiness checks pass.
- `POST /v1/admin/episodes/:id/unpublish`

## AI endpoints

- `POST /v1/ai/discovery` body: `{ "query": "stories about courage", "language": "kn", "limit": 10 }`
- `POST /v1/admin/ai/draft-metadata` body: `{ "episodeId": "...", "sourceText": "...", "language": "kn" }`
- AI metadata endpoint is admin-only and returns a draft. It never auto-publishes.

## API implementation requirements

- Validate path, query, and body with schemas.
- Require request ID/correlation ID.
- Enforce per-user/IP rate limits, payload-size limits, and timeouts.
- Use parameterized queries/ORM, never string-concatenated SQL.
- Check authorization for every user-owned resource (prevent IDOR).
- Add OpenAPI and integration tests.
- Ensure cursors cannot be used to bypass tenant/user access boundaries.
