-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MediaProcessingStatus" AS ENUM ('UPLOADED', 'QUEUED', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "RightsType" AS ENUM ('ORIGINAL', 'COMMISSIONED', 'LICENSED', 'PUBLIC_DOMAIN');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES');

-- CreateTable
CREATE TABLE "app_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_subject" TEXT NOT NULL,
    "preferred_language" VARCHAR(12),
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "preferred_language" VARCHAR(12),
    "interest_slugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_universes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(100) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "primary_language" VARCHAR(12) NOT NULL DEFAULT 'kn',
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "is_sample_content" BOOLEAN NOT NULL DEFAULT false,
    "sample_disclaimer" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "story_universes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "universe_id" UUID NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "title" VARCHAR(250) NOT NULL,
    "synopsis" TEXT,
    "language" VARCHAR(12) NOT NULL DEFAULT 'kn',
    "poster_asset_id" UUID,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "duration_seconds" INTEGER,
    "content_note" TEXT,
    "is_sample_content" BOOLEAN NOT NULL DEFAULT false,
    "sample_disclaimer" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "story_id" UUID NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "title" VARCHAR(250) NOT NULL,
    "synopsis" TEXT,
    "episode_number" INTEGER NOT NULL,
    "language" VARCHAR(12) NOT NULL DEFAULT 'kn',
    "duration_seconds" INTEGER,
    "media_asset_id" UUID,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ,
    "captions_available" BOOLEAN NOT NULL DEFAULT false,
    "is_sample_content" BOOLEAN NOT NULL DEFAULT false,
    "sample_disclaimer" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "episode_id" UUID,
    "provider" VARCHAR(40) NOT NULL DEFAULT 's3',
    "source_object_key" TEXT,
    "playback_manifest_url" TEXT,
    "poster_url" TEXT,
    "captions_url" TEXT,
    "processing_status" "MediaProcessingStatus" NOT NULL DEFAULT 'UPLOADED',
    "duration_seconds" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "checksum_sha256" VARCHAR(64),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_rights" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "media_asset_id" UUID NOT NULL,
    "rights_type" "RightsType" NOT NULL,
    "source_description" TEXT NOT NULL,
    "evidence_url" TEXT,
    "territory" VARCHAR(100),
    "expires_at" TIMESTAMPTZ,
    "approved_by" TEXT,
    "approved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_rights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "episode_id" UUID NOT NULL,
    "reviewer_id" UUID,
    "decision" "ReviewDecision" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(100) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(100) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_categories" (
    "story_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,

    CONSTRAINT "story_categories_pkey" PRIMARY KEY ("story_id","category_id")
);

-- CreateTable
CREATE TABLE "story_tags" (
    "story_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "story_tags_pkey" PRIMARY KEY ("story_id","tag_id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "story_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playback_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "episode_id" UUID NOT NULL,
    "position_seconds" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "last_played_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playback_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_subject" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_users_auth_subject_key" ON "app_users"("auth_subject");

-- CreateIndex
CREATE INDEX "app_users_deleted_at_idx" ON "app_users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "story_universes_slug_key" ON "story_universes"("slug");

-- CreateIndex
CREATE INDEX "story_universes_status_idx" ON "story_universes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "stories_slug_key" ON "stories"("slug");

-- CreateIndex
CREATE INDEX "stories_universe_id_status_sort_order_idx" ON "stories"("universe_id", "status", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "episodes_media_asset_id_key" ON "episodes"("media_asset_id");

-- CreateIndex
CREATE INDEX "episodes_story_id_status_episode_number_idx" ON "episodes"("story_id", "status", "episode_number");

-- CreateIndex
CREATE UNIQUE INDEX "episodes_story_id_episode_number_key" ON "episodes"("story_id", "episode_number");

-- CreateIndex
CREATE UNIQUE INDEX "episodes_story_id_slug_key" ON "episodes"("story_id", "slug");

-- CreateIndex
CREATE INDEX "media_assets_episode_id_idx" ON "media_assets"("episode_id");

-- CreateIndex
CREATE INDEX "media_assets_processing_status_idx" ON "media_assets"("processing_status");

-- CreateIndex
CREATE INDEX "content_rights_media_asset_id_approved_at_idx" ON "content_rights"("media_asset_id", "approved_at");

-- CreateIndex
CREATE INDEX "content_reviews_episode_id_decision_idx" ON "content_reviews"("episode_id", "decision");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "story_categories_category_id_idx" ON "story_categories"("category_id");

-- CreateIndex
CREATE INDEX "story_tags_tag_id_idx" ON "story_tags"("tag_id");

-- CreateIndex
CREATE INDEX "favorites_user_id_created_at_idx" ON "favorites"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_story_id_key" ON "favorites"("user_id", "story_id");

-- CreateIndex
CREATE INDEX "playback_progress_user_id_last_played_at_idx" ON "playback_progress"("user_id", "last_played_at");

-- CreateIndex
CREATE UNIQUE INDEX "playback_progress_user_id_episode_id_key" ON "playback_progress"("user_id", "episode_id");

-- CreateIndex
CREATE INDEX "admin_audit_log_entity_type_entity_id_created_at_idx" ON "admin_audit_log"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_log_actor_subject_created_at_idx" ON "admin_audit_log"("actor_subject", "created_at");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_universe_id_fkey" FOREIGN KEY ("universe_id") REFERENCES "story_universes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_poster_asset_id_fkey" FOREIGN KEY ("poster_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_rights" ADD CONSTRAINT "content_rights_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_categories" ADD CONSTRAINT "story_categories_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_categories" ADD CONSTRAINT "story_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_tags" ADD CONSTRAINT "story_tags_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_tags" ADD CONSTRAINT "story_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playback_progress" ADD CONSTRAINT "playback_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playback_progress" ADD CONSTRAINT "playback_progress_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Check constraints Prisma cannot express in schema.prisma
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_episode_number_positive" CHECK ("episode_number" > 0);
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_duration_seconds_nonnegative" CHECK ("duration_seconds" IS NULL OR "duration_seconds" >= 0);
ALTER TABLE "stories" ADD CONSTRAINT "stories_duration_seconds_nonnegative" CHECK ("duration_seconds" IS NULL OR "duration_seconds" >= 0);
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_duration_seconds_nonnegative" CHECK ("duration_seconds" IS NULL OR "duration_seconds" >= 0);
ALTER TABLE "playback_progress" ADD CONSTRAINT "playback_progress_position_seconds_nonnegative" CHECK ("position_seconds" >= 0);
ALTER TABLE "content_rights" ADD CONSTRAINT "content_rights_approval_pair" CHECK (
    ("approved_at" IS NULL AND "approved_by" IS NULL)
    OR ("approved_at" IS NOT NULL AND "approved_by" IS NOT NULL)
);
