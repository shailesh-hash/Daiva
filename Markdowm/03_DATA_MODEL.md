# 03 — PostgreSQL Data Model

Use UUID primary keys, UTC timestamps (`timestamptz`), migrations, foreign keys, check constraints, and indexes. Adapt exact ORM syntax to the selected stack (Prisma is recommended for the MVP). Keep migrations committed and never edit production schema manually.

## Suggested entities

- `app_users`: internal user record mapped to identity provider `subject`; do not store passwords.
- `story_universes`: extensible collection/brand such as Guru Daiva Dutta, other devotional collections, folklore, or fiction.
- `stories`: a series/title within a universe.
- `episodes`: individual short videos.
- `media_assets`: source file, HLS manifest, poster, captions, processing status, duration, technical metadata.
- `content_rights`: provenance, rights type, license/permission evidence, expiry/territory restrictions.
- `content_reviews`: editorial and cultural accuracy review, reviewer, decision, notes.
- `categories`, `tags`, `story_tags`: flexible classification.
- `favorites`: user-story or user-episode favorite.
- `playback_progress`: latest position and completion.
- `search_events` / `playback_events`: optional event ingestion; for scale, consider an analytics pipeline rather than unbounded OLTP writes.
- `admin_audit_log`: publication and sensitive admin actions.

## Prisma schema starter

Ask Cursor to create a complete valid `schema.prisma` based on this model and check it against the selected Prisma version. This is a conceptual baseline; Cursor must validate enum syntax and relation names before migration.

```prisma
enum PublishStatus {
  DRAFT
  IN_REVIEW
  PUBLISHED
  UNPUBLISHED
  ARCHIVED
}

enum MediaProcessingStatus {
  UPLOADED
  QUEUED
  PROCESSING
  READY
  FAILED
}

enum RightsType {
  ORIGINAL
  COMMISSIONED
  LICENSED
  PUBLIC_DOMAIN
}

enum ReviewDecision {
  PENDING
  APPROVED
  REJECTED
  NEEDS_CHANGES
}

model AppUser {
  id          String   @id @default(uuid()) @db.Uuid
  authSubject String   @unique
  preferredLanguage String? @db.VarChar(12)
  createdAt   DateTime @default(now()) @db.Timestamptz
  updatedAt   DateTime @updatedAt @db.Timestamptz
  favorites   Favorite[]
  progress    PlaybackProgress[]
}

model StoryUniverse {
  id          String   @id @default(uuid()) @db.Uuid
  slug        String   @unique @db.VarChar(100)
  title       String   @db.VarChar(200)
  description String?
  primaryLanguage String @default("kn") @db.VarChar(12)
  status      PublishStatus @default(DRAFT)
  createdAt   DateTime @default(now()) @db.Timestamptz
  updatedAt   DateTime @updatedAt @db.Timestamptz
  stories     Story[]
}

model Story {
  id          String   @id @default(uuid()) @db.Uuid
  universeId  String   @db.Uuid
  slug        String   @unique @db.VarChar(150)
  title       String   @db.VarChar(250)
  synopsis    String?
  language    String   @default("kn") @db.VarChar(12)
  posterAssetId String? @db.Uuid
  status      PublishStatus @default(DRAFT)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now()) @db.Timestamptz
  updatedAt   DateTime @updatedAt @db.Timestamptz
  universe    StoryUniverse @relation(fields: [universeId], references: [id])
  episodes    Episode[]
  favorites   Favorite[]
  @@index([universeId, status, sortOrder])
}

model Episode {
  id          String   @id @default(uuid()) @db.Uuid
  storyId     String   @db.Uuid
  slug        String   @db.VarChar(150)
  title       String   @db.VarChar(250)
  synopsis    String?
  episodeNumber Int
  language    String   @default("kn") @db.VarChar(12)
  durationSeconds Int?
  mediaAssetId String? @db.Uuid
  status      PublishStatus @default(DRAFT)
  publishedAt DateTime? @db.Timestamptz
  createdAt   DateTime @default(now()) @db.Timestamptz
  updatedAt   DateTime @updatedAt @db.Timestamptz
  story       Story @relation(fields: [storyId], references: [id], onDelete: Cascade)
  progress    PlaybackProgress[]
  @@unique([storyId, episodeNumber])
  @@unique([storyId, slug])
  @@index([storyId, status, episodeNumber])
}

model MediaAsset {
  id          String   @id @default(uuid()) @db.Uuid
  provider    String   @default("s3") @db.VarChar(40)
  sourceObjectKey String?
  playbackManifestUrl String?
  posterUrl   String?
  captionsUrl String?
  processingStatus MediaProcessingStatus @default(UPLOADED)
  durationSeconds Int?
  width       Int?
  height      Int?
  checksumSha256 String?
  createdAt   DateTime @default(now()) @db.Timestamptz
  updatedAt   DateTime @updatedAt @db.Timestamptz
}

model ContentRights {
  id          String   @id @default(uuid()) @db.Uuid
  mediaAssetId String @db.Uuid
  rightsType  RightsType
  sourceDescription String
  evidenceUrl String?
  territory   String? @db.VarChar(100)
  expiresAt   DateTime? @db.Timestamptz
  approvedBy  String?
  approvedAt  DateTime? @db.Timestamptz
  createdAt   DateTime @default(now()) @db.Timestamptz
  @@index([mediaAssetId])
}

model ContentReview {
  id          String   @id @default(uuid()) @db.Uuid
  episodeId   String   @db.Uuid
  decision    ReviewDecision @default(PENDING)
  reviewerId  String?
  notes       String?
  reviewedAt  DateTime? @db.Timestamptz
  createdAt   DateTime @default(now()) @db.Timestamptz
  @@index([episodeId, decision])
}

model Favorite {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @db.Uuid
  storyId     String   @db.Uuid
  createdAt   DateTime @default(now()) @db.Timestamptz
  user        AppUser @relation(fields: [userId], references: [id], onDelete: Cascade)
  story       Story @relation(fields: [storyId], references: [id], onDelete: Cascade)
  @@unique([userId, storyId])
  @@index([userId, createdAt])
}

model PlaybackProgress {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @db.Uuid
  episodeId   String   @db.Uuid
  positionSeconds Int @default(0)
  completed   Boolean @default(false)
  lastPlayedAt DateTime @default(now()) @db.Timestamptz
  user        AppUser @relation(fields: [userId], references: [id], onDelete: Cascade)
  episode     Episode @relation(fields: [episodeId], references: [id], onDelete: Cascade)
  @@unique([userId, episodeId])
  @@index([userId, lastPlayedAt])
}

model AdminAuditLog {
  id          String   @id @default(uuid()) @db.Uuid
  actorSubject String
  action      String
  entityType  String
  entityId    String
  details     Json?
  createdAt   DateTime @default(now()) @db.Timestamptz
  @@index([entityType, entityId, createdAt])
}
```

## Schema follow-ups for Cursor

1. Add `Category`, `Tag`, and `StoryTag` with unique slugs.
2. Add `ContentRights` relation to `MediaAsset`; require rights approval before publishing.
3. Add `Episode.mediaAssetId` relation to `MediaAsset`; enforce one-to-one or one-to-many as appropriate.
4. Add a `UserPreference` model only for explicit interests/language preferences; keep it minimal.
5. Add `AiRecommendationFeedback` if AI suggestions ship.
6. Use a stable internal user ID; never use an email as a primary key.
7. Consider soft deletion and data-retention policy for user data.
8. Ensure all public catalogue queries filter `status = PUBLISHED` and only expose `READY` media assets.
9. Add tests for publication rules and access control.
