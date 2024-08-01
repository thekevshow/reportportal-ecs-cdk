# AWS ECR IMAGES

# Additional Noted MAC M3 Commands 
docker buildx create --use
docker buildx build --platform linux/amd64 -t {account-id}.dkr.ecr.us-east-1.amazonaws.com/rabbitmq:3.13.2 --push .

aws ecr create-repository --repository-name reportportal-service-index --profile {aws-profile} --region us-east-1
aws ecr create-repository --repository-name reportportal-service-ui --profile {aws-profile} --region us-east-1
aws ecr create-repository --repository-name reportportal-service-api --profile {aws-profile} --region us-east-1
aws ecr create-repository --repository-name reportportal-service-authorization --profile {aws-profile} --region us-east-1
aws ecr create-repository --repository-name reportportal-service-jobs --profile {aws-profile} --region us-east-1
aws ecr create-repository --repository-name reportportal-service-auto-analyzer --profile {aws-profile} --region us-east-1
aws ecr create-repository --repository-name reportportal-service-metrics-gatherer --profile {aws-profile} --region us-east-1
aws ecr create-repository --repository-name rabbitmq --profile {aws-profile} --region us-east-1
aws ecr create-repository --repository-name opensearch --profile {aws-profile} --region us-east-1
aws ecr create-repository --repository-name traefik --profile {aws-profile} --region us-east-1

aws ecr get-login-password --region us-east-1 --profile {aws-profile} | docker login --username AWS --password-stdin {account-id}.dkr.ecr.us-east-1.amazonaws.com

docker pull reportportal/service-index:5.11.0
docker pull reportportal/service-ui:5.11.1
<!-- docker pull reportportal/service-api:5.11.1 -->
docker pull reportportal/service-api:5.11.2
docker pull reportportal/service-authorization:5.11.1
docker pull reportportal/service-jobs:5.11.1
docker pull reportportal/service-auto-analyzer:5.11.0-r1
docker pull reportportal/service-metrics-gatherer:5.11.0-r1
docker pull bitnami/rabbitmq:3.13.2
docker pull traefik:v2.11.2

# For ReportPortal Service Index
docker tag reportportal/service-index:5.11.0 {account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-index:5.11.0
docker push {account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-index:5.11.0

# For ReportPortal Service UI
docker tag reportportal/service-ui:5.11.1 {account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-ui:5.11.1
docker push {account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-ui:5.11.1

# For ReportPortal Service API
<!-- docker tag reportportal/service-api:5.11.1 {account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-api:5.11.1
docker push {account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-api:5.11.1 -->
docker tag reportportal/service-api:5.11.2 {account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-api:5.11.2
docker push {account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-api:5.11.2

# For ReportPortal Service Authorization
docker tag reportportal/service-authorization:5.11.1 {account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-authorization:5.11.1
docker push {account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-authorization:5.11.1

# For ReportPortal Service Jobs
docker tag reportportal/service-jobs:5.11.1 {account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-jobs:5.11.1
docker push {account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-jobs:5.11.1

# For ReportPortal Service Auto Analyzer
docker tag reportportal/service-auto-analyzer:5.11.0-r1 {account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-auto-analyzer:5.11.0-r1
docker push {account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-auto-analyzer:5.11.0-r1

# For ReportPortal Service Metrics Gatherer
docker tag reportportal/service-metrics-gatherer:5.11.0-r1 {account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-metrics-gatherer:5.11.0-r1
docker push {account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-metrics-gatherer:5.11.0-r1

# For RabbitMQ
docker tag bitnami/rabbitmq:3.13.2 {account-id}.dkr.ecr.us-east-1.amazonaws.com/rabbitmq:3.13.2
docker push {account-id}.dkr.ecr.us-east-1.amazonaws.com/rabbitmq:3.13.2

# For OpenSearch
docker tag opensearchproject/opensearch:latest {account-id}.dkr.ecr.us-east-1.amazonaws.com/opensearch:latest
docker push {account-id}.dkr.ecr.us-east-1.amazonaws.com/opensearch:latest

# For Traefik
docker tag traefik:v2.11.2 {account-id}.dkr.ecr.us-east-1.amazonaws.com/traefik:v2.11.2
docker push {account-id}.dkr.ecr.us-east-1.amazonaws.com/traefik:v2.11.2

# Verify images 
aws ecr describe-images --repository-name rabbitmq --profile {aws-profile} --region us-east-1

# URI IMAGES TO USE
{account-id}.dkr.ecr.us-east-1.amazonaws.com/traefik
{account-id}.dkr.ecr.us-east-1.amazonaws.com/opensearch
{account-id}.dkr.ecr.us-east-1.amazonaws.com/rabbitmq
{account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-metrics-gatherer
{account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-auto-analyzer
{account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-jobs
{account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-authorization
{account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-api
{account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-ui
{account-id}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-index