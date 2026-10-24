# Phase 9 — private upload and HLS processing

This branch adds the API-side S3/MediaConvert integration. It is not deployable until AWS resources, IAM, EventBridge/Lambda wiring, and the production CDN origin/access policy are configured.

## Flow

1. Admin creates media metadata using the existing `POST /v1/admin/episodes/:id/media`.
2. Admin calls `POST /v1/admin/episodes/:id/media/:mediaId/upload-url` with `{ "contentType": "video/mp4", "fileName": "episode.mp4" }`.
3. Browser uploads the bytes directly to the returned presigned S3 PUT URL using the exact `content-type` header.
4. Admin calls `POST /v1/admin/episodes/:id/media/:mediaId/complete-upload`; the API verifies object metadata and claims the media row before submitting one MediaConvert job.
5. EventBridge forwards MediaConvert COMPLETE/ERROR/CANCELED events to a Lambda handler calling `handleMediaConvertEvent`.
6. The event handler verifies the expected master manifest exists and only then marks media READY. Existing publication checks still require rights approval and editorial approval.

## Required environment

```dotenv
AWS_REGION=ap-south-1
MEDIA_SOURCE_BUCKET=daiva-private-source-<account>-<suffix>
MEDIA_OUTPUT_BUCKET=daiva-private-output-<account>-<suffix>
MEDIACONVERT_ENDPOINT=https://<account-specific-endpoint>.mediaconvert.<region>.amazonaws.com
MEDIACONVERT_ROLE_ARN=arn:aws:iam::<account>:role/DaivaMediaConvertRole
CDN_DOMAIN=<private-origin-cloudfront-domain>
```

The output bucket should remain private. Use CloudFront Origin Access Control to serve playback, not public S3 ACLs. The source bucket must block all public access and should have lifecycle rules for incomplete multipart uploads and source retention/deletion. For a first pilot, the implementation limits uploads to 2 GB and supports MP4/QuickTime only.

## IAM and AWS setup

- API runtime role: `s3:PutObject` only for `uploads/*` in source bucket; `s3:GetObject`/ `s3:HeadObject` (via GetObject permission) for verifying uploaded objects; `mediaconvert:CreateJob` and `mediaconvert:GetJob`; `iam:PassRole` restricted to the dedicated MediaConvert role.
- MediaConvert role: read source bucket object; write output prefix in output bucket; decrypt/encrypt with KMS only if configured.
- EventBridge rule source `aws.mediaconvert`, detail-type `MediaConvert Job State Change`, status in `COMPLETE`, `ERROR`, `CANCELED`. Target a Lambda wrapper that builds Prisma and an S3 client and calls `handleMediaConvertEvent`. Set a DLQ and alarm on failed target delivery.
- Do not trust a client-supplied object key. This API creates the key from the database media ID.
- Never expose source object keys or presigned source URLs in public catalogue responses.

## Important deployment check

The handler currently expects the master playlist at `episodes/<mediaId>/index.m3u8`. Verify the exact MediaConvert output naming in a real test job before production; if your output group emits a different master playlist name, update the handler to discover/validate the actual master manifest. A job's COMPLETE event is at-least-once; handler transitions are guarded by media status and job ID.
