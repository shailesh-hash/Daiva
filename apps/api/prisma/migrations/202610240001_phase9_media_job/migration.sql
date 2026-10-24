ALTER TABLE "media_assets"
  ADD COLUMN "processing_job_id" VARCHAR(200);

CREATE UNIQUE INDEX "media_assets_processing_job_id_key"
  ON "media_assets"("processing_job_id");
