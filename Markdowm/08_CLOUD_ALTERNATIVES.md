# 08 — AWS First, Azure Alternative

## Recommendation

Choose **one cloud for the MVP**. AWS is the primary path in this pack because the media pipeline maps naturally to S3, CloudFront, API Gateway, Lambda, Cognito, SQS, and MediaConvert. Keep provider-specific code behind interfaces where that is practical, but do not build two full deployments before product validation.

## Service mapping

| Capability | AWS primary | Azure alternative |
|---|---|---|
| Static web hosting/CDN | S3 + CloudFront or Amplify Hosting | Static Web Apps or Storage Static Website + Azure Front Door |
| Serverless API | API Gateway + Lambda | Azure Functions + API Management if needed |
| Identity | Amazon Cognito | Microsoft Entra External ID / supported customer identity offering |
| PostgreSQL | Aurora PostgreSQL Serverless v2 or RDS PostgreSQL | Azure Database for PostgreSQL Flexible Server |
| Connection management | RDS Proxy / appropriate pooling | PgBouncer where supported/configured; tune Functions concurrency |
| Object storage | S3 | Azure Blob Storage |
| CDN | CloudFront | Azure Front Door/CDN offering |
| Video encoding | AWS Elemental MediaConvert | Azure Media Services was retired; evaluate current third-party/partner video encoding or a managed video platform |
| Queue | SQS + DLQ | Azure Storage Queues or Service Bus |
| Event schedule | EventBridge | Azure Event Grid / Functions timer |
| Secrets | Secrets Manager + Parameter Store | Key Vault |
| Logs/metrics/traces | CloudWatch + X-Ray/OpenTelemetry | Azure Monitor + Application Insights/OpenTelemetry |
| IaC | AWS CDK or Terraform | Bicep or Terraform |

Cloud product names and availability can change. Confirm regional availability, retirement notices, pricing, data residency, and current SDK guidance before deployment.

## Cloud abstraction boundaries

Keep interfaces for:
- `MediaStorageProvider`: create upload URL, verify uploaded asset, delete asset.
- `VideoProcessingProvider`: submit job, inspect status, handle webhook/event.
- `IdentityProvider`: verify external identity and map claims.
- `AiProvider`: metadata drafting and discovery.
- `QueuePublisher`: enqueue idempotent work.

Avoid building an abstract cloud framework for every service. Abstract only where portability is a genuine goal or tests benefit from it.

## Migration strategy

- Keep domain logic independent from AWS SDK types.
- Keep media provider IDs/object keys in internal records; expose playback URLs via an API service.
- Store provider-neutral status enums and metadata.
- Keep database schema portable to PostgreSQL.
- Use separate adapter packages for cloud SDK calls.
- Write contract tests for provider adapters.
- Do not promise seamless multi-cloud failover; it requires replication, identity, media distribution, and operational design beyond an MVP.
