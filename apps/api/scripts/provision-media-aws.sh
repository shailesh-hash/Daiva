#!/usr/bin/env bash
# Create Phase 9 media resources in the current AWS account.
# Requires AWS CLI v2 and credentials with S3, IAM, MediaConvert, EventBridge, Lambda, and CloudFront.
set -euo pipefail

REGION="${AWS_REGION:-ap-south-1}"
SUFFIX="${DAIVA_MEDIA_SUFFIX:-dev}"

if ! command -v aws >/dev/null 2>&1; then
  echo "AWS CLI is not installed. Install AWS CLI v2, authenticate, and re-run." >&2
  exit 1
fi

ACCOUNT="$(aws sts get-caller-identity --query Account --output text --region "$REGION")"
SOURCE_BUCKET="daiva-private-source-${ACCOUNT}-${SUFFIX}"
OUTPUT_BUCKET="daiva-private-output-${ACCOUNT}-${SUFFIX}"
ROLE_NAME="DaivaMediaConvertRole"
LAMBDA_NAME="daiva-mediaconvert-events-${SUFFIX}"
RULE_NAME="daiva-mediaconvert-state-${SUFFIX}"
OAC_NAME="daiva-output-oac-${SUFFIX}"

echo "account=$ACCOUNT"
echo "region=$REGION"
echo "source_bucket=$SOURCE_BUCKET"
echo "output_bucket=$OUTPUT_BUCKET"

create_bucket() {
  local name="$1"
  if aws s3api head-bucket --bucket "$name" --region "$REGION" 2>/dev/null; then
    echo "bucket exists: $name"
    return
  fi
  if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$name" --region "$REGION"
  else
    aws s3api create-bucket --bucket "$name" --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION"
  fi
}

create_bucket "$SOURCE_BUCKET"
create_bucket "$OUTPUT_BUCKET"

for name in "$SOURCE_BUCKET" "$OUTPUT_BUCKET"; do
  aws s3api put-public-access-block --bucket "$name" --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  aws s3api put-bucket-encryption --bucket "$name" --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
done

aws s3api put-bucket-cors --bucket "$SOURCE_BUCKET" --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["http://localhost:8081", "https://stately-tanuki-2ac6c9.netlify.app"],
    "AllowedMethods": ["PUT", "HEAD"],
    "AllowedHeaders": ["content-type", "content-length"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3000
  }]
}'

aws s3api put-bucket-lifecycle-configuration --bucket "$SOURCE_BUCKET" --lifecycle-configuration '{
  "Rules": [{
    "ID": "abort-incomplete-uploads",
    "Status": "Enabled",
    "Filter": { "Prefix": "uploads/" },
    "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
  }]
}'

TRUST='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"mediaconvert.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadSourceUploads",
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::${SOURCE_BUCKET}/uploads/*"
    },
    {
      "Sid": "ListSourcePrefix",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::${SOURCE_BUCKET}",
      "Condition": { "StringLike": { "s3:prefix": ["uploads/*"] } }
    },
    {
      "Sid": "WriteHlsOutputs",
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::${OUTPUT_BUCKET}/episodes/*"
    },
    {
      "Sid": "ListOutputPrefix",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::${OUTPUT_BUCKET}",
      "Condition": { "StringLike": { "s3:prefix": ["episodes/*"] } }
    }
  ]
}
EOF
)

if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  echo "role exists: $ROLE_NAME"
else
  aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document "$TRUST" >/dev/null
fi
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name DaivaMediaConvertS3Access --policy-document "$POLICY"

ENDPOINT="$(aws mediaconvert describe-endpoints --region "$REGION" --query 'Endpoints[0].Url' --output text)"
ROLE_ARN="arn:aws:iam::${ACCOUNT}:role/${ROLE_NAME}"

echo
echo "Set these in the API environment:"
echo "AWS_REGION=$REGION"
echo "MEDIA_SOURCE_BUCKET=$SOURCE_BUCKET"
echo "MEDIA_OUTPUT_BUCKET=$OUTPUT_BUCKET"
echo "MEDIACONVERT_ENDPOINT=$ENDPOINT"
echo "MEDIACONVERT_ROLE_ARN=$ROLE_ARN"
echo
echo "Remaining (requires a packaged Lambda zip and CloudFront OAC):"
echo "- Create Lambda $LAMBDA_NAME from apps/api/src/media/lambda.ts with DATABASE_URL, AWS_REGION, MEDIA_OUTPUT_BUCKET, CDN_DOMAIN"
echo "- EventBridge rule $RULE_NAME: source=aws.mediaconvert, detail-type=MediaConvert Job State Change, status COMPLETE|ERROR|CANCELED"
echo "- CloudFront OAC $OAC_NAME on $OUTPUT_BUCKET; set CDN_DOMAIN to the distribution domain"
echo
echo "This script created the private buckets and MediaConvert role. Lambda packaging and CloudFront were not applied automatically."
