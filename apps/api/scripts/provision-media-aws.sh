#!/usr/bin/env bash
# Provision DAIVA Phase 9 storage, MediaConvert IAM, CloudFront OAC, EventBridge, DLQ and alarm.
# Requires AWS CLI v2, jq, and an authenticated AWS identity with S3/IAM/MediaConvert/
# CloudFront/EventBridge/Lambda/SQS/CloudWatch permissions. Review before running in production.
set -euo pipefail

REGION="${AWS_REGION:-ap-south-1}"
SUFFIX="${DAIVA_MEDIA_SUFFIX:-dev}"
ADMIN_ORIGIN="${DAIVA_ADMIN_ORIGIN:-https://stately-tanuki-2ac6c9.netlify.app}"
LAMBDA_NAME="daiva-mediaconvert-events-${SUFFIX}"
RULE_NAME="daiva-mediaconvert-state-${SUFFIX}"
DLQ_NAME="daiva-mediaconvert-dlq-${SUFFIX}"
OAC_NAME="daiva-output-oac-${SUFFIX}"
DIST_COMMENT="DAIVA private HLS playback (${SUFFIX})"
ROLE_NAME="DaivaMediaConvertRole"

command -v aws >/dev/null || { echo "Install AWS CLI v2 first." >&2; exit 1; }
command -v jq >/dev/null || { echo "Install jq first." >&2; exit 1; }
ACCOUNT="$(aws sts get-caller-identity --query Account --output text --region "$REGION")"
SOURCE_BUCKET="daiva-private-source-${ACCOUNT}-${SUFFIX}"
OUTPUT_BUCKET="daiva-private-output-${ACCOUNT}-${SUFFIX}"
PARTITION="$(aws sts get-caller-identity --query Arn --output text | cut -d: -f2)"
SOURCE_ARN="arn:${PARTITION}:s3:::${SOURCE_BUCKET}"
OUTPUT_ARN="arn:${PARTITION}:s3:::${OUTPUT_BUCKET}"
ROLE_ARN="arn:${PARTITION}:iam::${ACCOUNT}:role/${ROLE_NAME}"
LAMBDA_ARN="arn:${PARTITION}:lambda:${REGION}:${ACCOUNT}:function:${LAMBDA_NAME}"

echo "Target account=$ACCOUNT region=$REGION suffix=$SUFFIX"
echo "Source bucket=$SOURCE_BUCKET"
echo "Output bucket=$OUTPUT_BUCKET"
echo "No access keys or credentials will be printed."

create_bucket() {
  local name="$1"
  if aws s3api head-bucket --bucket "$name" --region "$REGION" >/dev/null 2>&1; then
    echo "Bucket exists: $name"
  elif [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$name" --region "$REGION" >/dev/null
  else
    aws s3api create-bucket --bucket "$name" --region "$REGION" \
      --create-bucket-configuration "LocationConstraint=$REGION" >/dev/null
  fi
}
create_bucket "$SOURCE_BUCKET"
create_bucket "$OUTPUT_BUCKET"

for name in "$SOURCE_BUCKET" "$OUTPUT_BUCKET"; do
  aws s3api put-public-access-block --bucket "$name" --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  aws s3api put-bucket-ownership-controls --bucket "$name" --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'
  aws s3api put-bucket-encryption --bucket "$name" --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
done

aws s3api put-bucket-cors --bucket "$SOURCE_BUCKET" --cors-configuration "$(jq -cn --arg origin "$ADMIN_ORIGIN" '{
  CORSRules:[{AllowedOrigins:["http://localhost:8081",$origin],AllowedMethods:["PUT"],AllowedHeaders:["content-type"],ExposeHeaders:["ETag"],MaxAgeSeconds:3000}]
}')"
aws s3api put-bucket-lifecycle-configuration --bucket "$SOURCE_BUCKET" --lifecycle-configuration \
  '{"Rules":[{"ID":"abort-incomplete-uploads","Status":"Enabled","Filter":{"Prefix":"uploads/"},"AbortIncompleteMultipartUpload":{"DaysAfterInitiation":7}}]}'

TRUST="$(jq -cn '{Version:"2012-10-17",Statement:[{Effect:"Allow",Principal:{Service:"mediaconvert.amazonaws.com"},Action:"sts:AssumeRole"}]}')"
if ! aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document "$TRUST" >/dev/null
fi
aws iam update-assume-role-policy --role-name "$ROLE_NAME" --policy-document "$TRUST"
MC_POLICY="$(jq -cn --arg source "$SOURCE_ARN" --arg output "$OUTPUT_ARN" '{
 Version:"2012-10-17",Statement:[
 {Sid:"ReadSourceUploads",Effect:"Allow",Action:["s3:GetObject"],Resource:($source+"/uploads/*")},
 {Sid:"ListSourceUploads",Effect:"Allow",Action:["s3:ListBucket"],Resource:$source,Condition:{StringLike:{"s3:prefix":["uploads/*"]}}},
 {Sid:"WriteHlsOutputs",Effect:"Allow",Action:["s3:PutObject"],Resource:($output+"/episodes/*")},
 {Sid:"ListHlsOutputs",Effect:"Allow",Action:["s3:ListBucket"],Resource:$output,Condition:{StringLike:{"s3:prefix":["episodes/*"]}}}
]}')"
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name DaivaMediaConvertS3Access --policy-document "$MC_POLICY"

ENDPOINT="$(aws mediaconvert describe-endpoints --region "$REGION" --query 'Endpoints[0].Url' --output text)"
[ -n "$ENDPOINT" ] && [ "$ENDPOINT" != "None" ] || { echo "MediaConvert endpoint not returned for $REGION" >&2; exit 1; }

# CloudFront Origin Access Control: only the distribution gets read access to output objects.
OAC_ID="$(aws cloudfront list-origin-access-controls --query "OriginAccessControlList.Items[?Name=='$OAC_NAME'].Id | [0]" --output text)"
if [ "$OAC_ID" = "None" ] || [ -z "$OAC_ID" ]; then
  OAC_CONFIG="$(jq -cn --arg name "$OAC_NAME" '{Name:$name,Description:"DAIVA private HLS output origin",SigningProtocol:"sigv4",SigningBehavior:"always",OriginAccessControlOriginType:"s3"}')"
  OAC_ID="$(aws cloudfront create-origin-access-control --origin-access-control-config "$OAC_CONFIG" --query 'OriginAccessControl.Id' --output text)"
fi
DIST_ID="$(aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='$DIST_COMMENT'].Id | [0]" --output text)"
if [ "$DIST_ID" = "None" ] || [ -z "$DIST_ID" ]; then
  DIST_CONFIG="$(jq -cn --arg bucket "$OUTPUT_BUCKET.s3.$REGION.amazonaws.com" --arg oac "$OAC_ID" --arg comment "$DIST_COMMENT" '{
    CallerReference:($comment+"-"+$bucket),
    Comment:$comment,
    Enabled:true,
    HttpVersion:"http2",
    IsIPV6Enabled:true,
    PriceClass:"PriceClass_100",
    Origins:{Quantity:1,Items:[{Id:"daiva-private-output-s3",DomainName:$bucket,OriginAccessControlId:$oac,S3OriginConfig:{OriginAccessIdentity:""}}]},
    DefaultCacheBehavior:{
      TargetOriginId:"daiva-private-output-s3",
      ViewerProtocolPolicy:"redirect-to-https",
      AllowedMethods:{Quantity:2,Items:["GET","HEAD"],CachedMethods:{Quantity:2,Items:["GET","HEAD"]}},
      Compress:true,
      CachePolicyId:"4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
      TrustedSigners:{Enabled:false,Quantity:0}
    },
    Restrictions:{GeoRestriction:{RestrictionType:"none",Quantity:0}},
    ViewerCertificate:{CloudFrontDefaultCertificate:true,MinimumProtocolVersion:"TLSv1.2_2021"}
  }')"
  DIST_ID="$(aws cloudfront create-distribution --distribution-config "$DIST_CONFIG" --query 'Distribution.Id' --output text)"
fi
DIST_DOMAIN="$(aws cloudfront get-distribution --id "$DIST_ID" --query 'Distribution.DomainName' --output text)"
DIST_ARN="arn:${PARTITION}:cloudfront::${ACCOUNT}:distribution/${DIST_ID}"
BUCKET_POLICY="$(jq -cn --arg bucket "$OUTPUT_ARN" --arg dist "$DIST_ARN" '{
 Version:"2012-10-17",Statement:[{Sid:"AllowCloudFrontReadOnly",Effect:"Allow",Principal:{Service:"cloudfront.amazonaws.com"},Action:"s3:GetObject",Resource:($bucket+"/episodes/*"),Condition:{StringEquals:{"AWS:SourceArn":$dist}}}]
}')"
aws s3api put-bucket-policy --bucket "$OUTPUT_BUCKET" --policy "$BUCKET_POLICY"

# EventBridge rule + DLQ. Lambda target is attached only if the function already exists.
EVENT_PATTERN='{"source":["aws.mediaconvert"],"detail-type":["MediaConvert Job State Change"],"detail":{"status":["COMPLETE","ERROR","CANCELED"]}}'
RULE_ARN="$(aws events put-rule --name "$RULE_NAME" --description "DAIVA MediaConvert terminal job events" --event-pattern "$EVENT_PATTERN" --state ENABLED --region "$REGION" --query RuleArn --output text)"
DLQ_URL="$(aws sqs create-queue --queue-name "$DLQ_NAME" --attributes '{"MessageRetentionPeriod":"1209600","SqsManagedSseEnabled":"true"}' --region "$REGION" --query QueueUrl --output text)"
DLQ_ARN="$(aws sqs get-queue-attributes --queue-url "$DLQ_URL" --attribute-names QueueArn --region "$REGION" --query 'Attributes.QueueArn' --output text)"
DLQ_POLICY="$(jq -cn --arg queue "$DLQ_ARN" --arg rule "$RULE_ARN" '{
 Version:"2012-10-17",Statement:[{Sid:"AllowEventBridgeToSendDeadLetters",Effect:"Allow",Principal:{Service:"events.amazonaws.com"},Action:"sqs:SendMessage",Resource:$queue,Condition:{ArnEquals:{"aws:SourceArn":$rule}}}]
}')"
aws sqs set-queue-attributes --queue-url "$DLQ_URL" --attributes "$(jq -cn --arg policy "$DLQ_POLICY" '{Policy:$policy}')" --region "$REGION"
if aws lambda get-function --function-name "$LAMBDA_NAME" --region "$REGION" >/dev/null 2>&1; then
  aws lambda add-permission --function-name "$LAMBDA_NAME" --statement-id "AllowEventBridge-${SUFFIX}" --action lambda:InvokeFunction --principal events.amazonaws.com --source-arn "$RULE_ARN" --region "$REGION" 2>/dev/null || true
  TARGETS="$(jq -cn --arg arn "$LAMBDA_ARN" --arg id "DaivaMediaConvertHandler" --arg dlq "$DLQ_ARN" '[{Id:$id,Arn:$arn,DeadLetterConfig:{Arn:$dlq},RetryPolicy:{MaximumEventAgeInSeconds:86400,MaximumRetryAttempts:12}}]')"
  aws events put-targets --rule "$RULE_NAME" --targets "$TARGETS" --region "$REGION" >/dev/null
else
  echo "Lambda $LAMBDA_NAME not found; EventBridge rule and DLQ created, but target is NOT attached."
fi

aws cloudwatch put-metric-alarm --alarm-name "daiva-mediaconvert-eventbridge-failed-${SUFFIX}" \
  --alarm-description "EventBridge failed invocations for DAIVA MediaConvert events" \
  --namespace AWS/Events --metric-name FailedInvocations --dimensions "Name=RuleName,Value=$RULE_NAME" \
  --statistic Sum --period 300 --evaluation-periods 1 --threshold 1 --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching --region "$REGION"

# Emit the API runtime least-privilege policy as a file; do not attach it to an unknown runtime role.
API_POLICY_PATH="${DAIVA_API_POLICY_PATH:-apps/api/scripts/daiva-api-media-policy.json}"
mkdir -p "$(dirname "$API_POLICY_PATH")"
jq -n --arg source "$SOURCE_ARN" --arg role "$ROLE_ARN" '{
 Version:"2012-10-17",Statement:[
 {Sid:"UploadAndVerifySource",Effect:"Allow",Action:["s3:PutObject","s3:GetObject"],Resource:($source+"/uploads/*")},
 {Sid:"CreateAndInspectMediaConvertJobs",Effect:"Allow",Action:["mediaconvert:CreateJob","mediaconvert:GetJob"],Resource:"*"},
 {Sid:"PassOnlyDaivaMediaConvertRole",Effect:"Allow",Action:["iam:PassRole"],Resource:$role,Condition:{StringEquals:{"iam:PassedToService":"mediaconvert.amazonaws.com"}}}
]}' > "$API_POLICY_PATH"

echo
echo "Provisioning complete (CloudFront may take several minutes to deploy)."
echo "AWS_REGION=$REGION"
echo "MEDIA_SOURCE_BUCKET=$SOURCE_BUCKET"
echo "MEDIA_OUTPUT_BUCKET=$OUTPUT_BUCKET"
echo "MEDIACONVERT_ENDPOINT=$ENDPOINT"
echo "MEDIACONVERT_ROLE_ARN=$ROLE_ARN"
echo "CDN_DOMAIN=$DIST_DOMAIN"
echo "CLOUDFRONT_DISTRIBUTION_ID=$DIST_ID"
echo "EVENTBRIDGE_RULE=$RULE_NAME"
echo "EVENTBRIDGE_DLQ=$DLQ_URL"
echo "API policy written to $API_POLICY_PATH (attach to the actual API runtime role after review)."
echo "Do not set production API media variables until you have deployed and tested the Lambda target."
