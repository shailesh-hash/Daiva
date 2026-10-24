# Phase 9 — private upload and HLS processing

Admin-only upload sessions use short-lived S3 PUT URLs. Video bytes never pass through the API. MediaConvert writes HLS renditions to a private output bucket; CloudFront Origin Access Control is the only playback path.

## Flow

1. Admin creates media metadata with `POST /v1/admin/episodes/:id/media`.
2. Admin calls `POST /v1/admin/episodes/:id/media/:mediaId/upload-url` with `{ "contentType": "video/mp4", "fileName": "episode.mp4" }`.
3. The browser PUTs the file to the presigned URL using the exact `content-type` header.
4. Admin calls `POST /v1/admin/episodes/:id/media/:mediaId/complete-upload`. The API heads the object, claims the row (`QUEUED` then `PROCESSING`), and submits one MediaConvert job.
5. EventBridge forwards MediaConvert `COMPLETE` / `ERROR` / `CANCELED` events to `apps/api/src/media/lambda.ts` (`handler`).
6. The handler verifies the HLS master playlist (MediaConvert names it `main.m3u8` by default, also accepted via `playlistFilePaths`) and only then marks media `READY`. Publication still requires rights and editorial approval.

## Required environment

```dotenv
AWS_REGION=ap-south-1
MEDIA_SOURCE_BUCKET=daiva-private-source-<account>-<suffix>
MEDIA_OUTPUT_BUCKET=daiva-private-output-<account>-<suffix>
MEDIACONVERT_ENDPOINT=https://<account-specific>.mediaconvert.ap-south-1.amazonaws.com
MEDIACONVERT_ROLE_ARN=arn:aws:iam::<account>:role/DaivaMediaConvertRole
CDN_DOMAIN=<cloudfront-domain>
```

Leave these unset for local tests; routes stay unregistered. Setting only some of them fails process startup.

## AWS resources (not created in this repository)

Create these in a dedicated AWS account/environment. Do not make either bucket public.

1. **Source bucket** `daiva-private-source-<account>-dev`
   - Block all public access
   - CORS allowing `PUT` from the admin origins (`http://localhost:8081` and the deployed web origin) with `Content-Type`
   - Abort incomplete multipart uploads after 7 days
2. **Output bucket** `daiva-private-output-<account>-dev`
   - Block all public access
   - No public ACLs; CloudFront Origin Access Control only
3. **MediaConvert role** `DaivaMediaConvertRole`
   - Trust `mediaconvert.amazonaws.com`
   - `s3:GetObject` on `arn:aws:s3:::SOURCE/uploads/*`
   - `s3:PutObject` on `arn:aws:s3:::OUTPUT/episodes/*`
   - `s3:ListBucket` limited to those prefixes
4. **API runtime role**
   - `s3:PutObject` on `SOURCE/uploads/*`
   - `s3:GetObject` / `s3:HeadObject` on `SOURCE/uploads/*`
   - `mediaconvert:CreateJob`, `mediaconvert:GetJob`
   - `iam:PassRole` only for `DaivaMediaConvertRole`
5. **EventBridge rule**
   - Source `aws.mediaconvert`
   - Detail type `MediaConvert Job State Change`
   - Status in `COMPLETE`, `ERROR`, `CANCELED`
   - Target: Lambda `handler` in `src/media/lambda.ts`
   - Configure a DLQ and alarm on failed invocations
6. **CloudFront**
   - Origin: output bucket with Origin Access Control
   - Default behavior: GET/HEAD, HTTPS only
   - Do not attach the source bucket as an origin

## Manual provision

Install the AWS CLI, authenticate to the target account, then run:

```bash
export PATH="$HOME/.local/node-v22/bin:$PATH"
export AWS_REGION=ap-south-1
# Fill ACCOUNT, then follow the command list in scripts/provision-media-aws.sh
./apps/api/scripts/provision-media-aws.sh
```

The script is idempotent where AWS APIs allow it. It prints resource names; copy those into `.env`. It does not print access keys.

## IAM notes

- Do not trust a client-supplied object key. Keys are `uploads/<mediaId>/source`.
- Never expose source keys or presigned source URLs in public catalogue responses.
- Do not log upload URLs or tokens.
