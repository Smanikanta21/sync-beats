#!/bin/bash

# Cloud Run Deployment Script for sync-beats-sockets
# Usage: ./deploy-cloudrun.sh

# Configuration - EDIT THESE VALUES
PROJECT_ID="your-gcp-project-id"
SERVICE_NAME="sync-beats-sockets"
REGION="us-central1"
FRONTEND_ORIGIN="https://your-frontend-domain.com"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Cloud Run deployment for ${SERVICE_NAME}...${NC}"

# Set project
echo -e "${BLUE}Setting project to ${PROJECT_ID}...${NC}"
gcloud config set project $PROJECT_ID

# Build and push container
echo -e "${BLUE}Building container image...${NC}"
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed. Exiting.${NC}"
    exit 1
fi

# Deploy to Cloud Run
echo -e "${BLUE}Deploying to Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --timeout 3600 \
  --max-instances 10 \
  --min-instances 0 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars NODE_ENV=production,FRONTEND_ORIGIN=$FRONTEND_ORIGIN

if [ $? -ne 0 ]; then
    echo -e "${RED}Deployment failed. Exiting.${NC}"
    exit 1
fi

# Get service URL
echo -e "${GREEN}Deployment complete!${NC}"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')
echo -e "${GREEN}Service URL: ${SERVICE_URL}${NC}"
echo -e "${BLUE}Update your frontend .env with:${NC}"
echo -e "NEXT_PUBLIC_SOCKET_URL=${SERVICE_URL}"
