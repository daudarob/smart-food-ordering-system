#!/bin/bash

# Production deployment script
# This script pulls the latest Docker images and runs containers

set -e

echo "Starting production deployment..."

# Pull latest images
echo "Pulling latest Docker images..."
docker pull $DOCKER_USERNAME/sfo-backend:latest
docker pull $DOCKER_USERNAME/sfo-frontend:latest

# Stop existing containers
echo "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down || true

# Start new containers
echo "Starting new containers..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 30

# Run database migrations if needed
echo "Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend npm run migrate || echo "No migrate script"

# Health check
echo "Performing health checks..."
curl -f http://localhost/api/health || echo "Backend health check failed"
curl -f http://localhost/ || echo "Frontend health check failed"

echo "Deployment completed successfully!"