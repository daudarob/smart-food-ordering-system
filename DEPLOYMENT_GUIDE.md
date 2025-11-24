# SFO System Deployment Guide

This guide provides comprehensive instructions for deploying the USIU-A Smart Food Ordering (SFO) System in various environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Development Deployment](#development-deployment)
4. [Production Deployment](#production-deployment)
5. [Docker Deployment](#docker-deployment)
6. [Cloud Deployment](#cloud-deployment)
7. [Monitoring Setup](#monitoring-setup)
8. [Backup & Recovery](#backup--recovery)
9. [Scaling](#scaling)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Windows Server 2019+
- **CPU**: 2+ cores (4+ recommended for production)
- **RAM**: 4GB minimum (8GB+ recommended)
- **Storage**: 20GB+ available space
- **Network**: Stable internet connection

### Software Dependencies
- **Node.js**: 18.0.0 or higher
- **PostgreSQL**: 15.0 or higher
- **Redis**: 7.0 or higher
- **Docker**: 24.0+ (optional, for containerized deployment)
- **Docker Compose**: 2.0+ (optional)

### External Services
- **M-Pesa API**: Sandbox or production credentials
- **SendGrid**: API key for email notifications
- **Firebase**: Project configuration for push notifications
- **Stripe**: Payment processing (optional alternative)

## Environment Setup

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git unzip software-properties-common

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installations
node --version
npm --version
```

### 2. Database Setup

#### PostgreSQL Installation
```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

```sql
-- In PostgreSQL shell
CREATE DATABASE sfo_prod;
CREATE USER sfo_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE sfo_prod TO sfo_user;
ALTER USER sfo_user CREATEDB;
\q
```

#### Redis Installation
```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis
sudo sed -i 's/supervised no/supervised systemd/' /etc/redis/redis.conf
sudo sed -i 's/# maxmemory <bytes>/maxmemory 512mb/' /etc/redis/redis.conf
sudo sed -i 's/# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf

# Start and enable Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 3. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000  # Backend
sudo ufw allow 5173  # Frontend (dev)
sudo ufw allow 5432  # PostgreSQL (restrict to app server)
sudo ufw allow 6379  # Redis (restrict to app server)
sudo ufw --force enable
```

## Development Deployment

### Local Development Setup

1. **Clone Repository**
```bash
git clone <repository-url>
cd sfo-system
```

2. **Backend Configuration**
```bash
cd backend
cp .env.example .env
# Edit .env with development settings
```

3. **Database Migration**
```bash
npm run migrate
npm run seed
```

4. **Start Development Servers**
```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
cd ../frontend
npm run dev
```

5. **Access Application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health

## Production Deployment

### 1. Application Build

```bash
# Backend build
cd backend
npm ci --only=production
npm run build  # If using TypeScript

# Frontend build
cd ../frontend
npm ci
npm run build
```

### 2. Environment Configuration

Create production `.env` files:

**backend/.env**
```env
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sfo_prod
DB_USER=sfo_user
DB_PASSWORD=your_secure_password
JWT_SECRET=your-super-secret-jwt-key-change-in-production
REDIS_URL=redis://localhost:6379

# External services
MPESA_CONSUMER_KEY=your_production_mpesa_key
MPESA_CONSUMER_SECRET=your_production_mpesa_secret
SENDGRID_API_KEY=SG.your_production_sendgrid_key
SLACK_WEBHOOK_URL=https://hooks.slack.com/your/webhook
ALERT_EMAIL=admin@usiu.ac.ke

# Frontend URL
FRONTEND_URL=https://sfo.usiu.ac.ke
```

**frontend/.env**
```env
VITE_API_URL=https://api.sfo.usiu.ac.ke
VITE_FIREBASE_API_KEY=your_production_firebase_key
```

### 3. Process Management

#### Using PM2
```bash
# Install PM2 globally
sudo npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'sfo-backend',
    script: 'backend/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Using systemd
```bash
# Create systemd service
sudo tee /etc/systemd/system/sfo-backend.service > /dev/null <<EOF
[Unit]
Description=SFO Backend Service
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=sfo-user
WorkingDirectory=/opt/sfo-system/backend
ExecStart=/usr/bin/node app.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable sfo-backend
sudo systemctl start sfo-backend
```

### 4. Web Server Configuration

#### Nginx Setup
```bash
# Install Nginx
sudo apt install -y nginx

# Create site configuration
sudo tee /etc/nginx/sites-available/sfo-app > /dev/null <<EOF
# Upstream backend servers
upstream sfo_backend {
    server localhost:3000;
    keepalive 32;
}

# HTTPS redirect
server {
    listen 80;
    server_name sfo.usiu.ac.ke api.sfo.usiu.ac.ke;
    return 301 https://\$server_name\$request_uri;
}

# Frontend (HTTPS)
server {
    listen 443 ssl http2;
    server_name sfo.usiu.ac.ke;

    ssl_certificate /etc/ssl/certs/sfo.crt;
    ssl_certificate_key /etc/ssl/private/sfo.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;

    root /opt/sfo-system/frontend/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://sfo_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Backend API (HTTPS)
server {
    listen 443 ssl http2;
    server_name api.sfo.usiu.ac.ke;

    ssl_certificate /etc/ssl/certs/sfo.crt;
    ssl_certificate_key /etc/ssl/private/sfo.key;

    location / {
        proxy_pass http://sfo_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/sfo-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. SSL Certificate Setup

#### Using Let's Encrypt
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d sfo.usiu.ac.ke -d api.sfo.usiu.ac.ke

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Docker Deployment

### 1. Docker Compose Setup

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: sfo_prod
      POSTGRES_USER: sfo_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    networks:
      - sfo_network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - sfo_network
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    networks:
      - sfo_network
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    environment:
      VITE_API_URL: ${VITE_API_URL}
    depends_on:
      - backend
    networks:
      - sfo_network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - backend
      - frontend
    networks:
      - sfo_network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  sfo_network:
    driver: bridge
```

### 2. Production Dockerfiles

**backend/Dockerfile.prod**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S sfo -u 1001

# Change ownership
RUN chown -R sfo:nodejs /app
USER sfo

EXPOSE 3000

CMD ["npm", "start"]
```

**frontend/Dockerfile.prod**
```dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 3. Deploy with Docker

```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

## Cloud Deployment

### AWS Deployment

#### 1. EC2 Setup
```bash
# Launch EC2 instance (t3.medium or larger)
# Ubuntu 20.04 LTS, security group with ports 22, 80, 443

# Connect to instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Run deployment script
wget https://raw.githubusercontent.com/your-org/sfo-system/main/scripts/deploy-aws.sh
chmod +x deploy-aws.sh
./deploy-aws.sh
```

#### 2. RDS PostgreSQL
- Create RDS instance (db.t3.micro for dev, db.t3.small+ for prod)
- Configure security groups
- Enable automated backups
- Set up Multi-AZ for production

#### 3. ElastiCache Redis
- Create Redis cluster
- Configure security groups
- Enable encryption in transit

#### 4. Load Balancer
```hcl
# Terraform configuration
resource "aws_lb" "sfo_lb" {
  name               = "sfo-load-balancer"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.lb_sg.id]
  subnets            = aws_subnet.public.*.id

  enable_deletion_protection = true
}

resource "aws_lb_target_group" "sfo_backend" {
  name     = "sfo-backend-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}
```

### Google Cloud Platform

#### 1. App Engine Deployment
```yaml
# app.yaml
runtime: nodejs18
instance_class: F4
automatic_scaling:
  min_instances: 2
  max_instances: 20
  target_cpu_utilization: 0.7

env_variables:
  NODE_ENV: production
  DB_HOST: /cloudsql/your-project:region:your-db
  REDIS_URL: redis://your-redis-instance

beta_settings:
  cloud_sql_instances: your-project:region:your-db
```

#### 2. Cloud SQL PostgreSQL
- Create Cloud SQL instance
- Configure private IP
- Set up automated backups
- Enable point-in-time recovery

### Azure Deployment

#### 1. App Service
```json
{
  "name": "sfo-backend",
  "type": "Microsoft.Web/sites",
  "properties": {
    "serverFarmId": "[resourceId('Microsoft.Web/serverfarms', variables('appServicePlanName'))]",
    "siteConfig": {
      "linuxFxVersion": "NODE|18-lts",
      "appSettings": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "DB_CONNECTION_STRING",
          "value": "[concat('postgresql://', variables('dbUsername'), '@', reference(resourceId('Microsoft.DBforPostgreSQL/servers', variables('dbServerName'))).fullyQualifiedDomainName, ':5432/', variables('dbName'), '?sslmode=require')]"
        }
      ]
    }
  }
}
```

## Monitoring Setup

### 1. Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'sfo-backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']
```

### 2. Grafana Dashboard

```json
{
  "dashboard": {
    "title": "SFO System Overview",
    "tags": ["sfo", "production"],
    "panels": [
      {
        "title": "HTTP Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      }
    ]
  }
}
```

### 3. Alert Manager

```yaml
# alert_rules.yml
groups:
  - name: sfo_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}%"

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / 1024 / 1024 > 800
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}MB"
```

## Backup & Recovery

### Database Backup

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/opt/sfo-backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/sfo_backup_$DATE.sql"

# Create backup
pg_dump -h localhost -U sfo_user -d sfo_prod > "$BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"

# Upload to cloud storage (example with AWS S3)
aws s3 cp "$BACKUP_FILE.gz" s3://sfo-backups/

# Clean old backups (keep last 30 days)
find "$BACKUP_DIR" -name "*.gz" -mtime +30 -delete
```

### Application Backup

```bash
# Backup uploads and configuration
tar -czf "/opt/sfo-backups/uploads_$DATE.tar.gz" /opt/sfo-system/backend/uploads/
tar -czf "/opt/sfo-backups/config_$DATE.tar.gz" /opt/sfo-system/backend/.env
```

### Recovery Procedure

```bash
# Stop application
sudo systemctl stop sfo-backend

# Restore database
gunzip sfo_backup_20251104_120000.sql.gz
psql -h localhost -U sfo_user -d sfo_prod < sfo_backup_20251104_120000.sql

# Restore uploads
tar -xzf uploads_20251104_120000.tar.gz -C /opt/sfo-system/backend/

# Start application
sudo systemctl start sfo-backend
```

## Scaling

### Horizontal Scaling

#### 1. Load Balancer Configuration
```nginx
upstream backend_cluster {
    least_conn;
    server backend-01:3000;
    server backend-02:3000;
    server backend-03:3000;
    keepalive 32;
}
```

#### 2. Database Read Replicas
```javascript
// Sequelize read replica configuration
const sequelize = new Sequelize({
  replication: {
    read: [
      { host: 'replica-01', port: 5432 },
      { host: 'replica-02', port: 5432 }
    ],
    write: { host: 'primary', port: 5432 }
  }
});
```

#### 3. Redis Cluster
```javascript
// Redis cluster configuration
const redis = require('redis');
const client = redis.createCluster({
  rootNodes: [
    { host: 'redis-01', port: 6379 },
    { host: 'redis-02', port: 6379 },
    { host: 'redis-03', port: 6379 }
  ]
});
```

### Vertical Scaling

#### Memory Optimization
```javascript
// Node.js memory optimization
node --max-old-space-size=4096 app.js

// PM2 cluster mode
pm2 start app.js -i max
```

#### Database Optimization
```sql
-- PostgreSQL performance tuning
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U sfo_user -d sfo_prod

# View logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

#### 2. Application Not Starting
```bash
# Check application logs
pm2 logs sfo-backend

# Check environment variables
cat /opt/sfo-system/backend/.env

# Test Node.js
cd /opt/sfo-system/backend && node -e "console.log('Node.js working')"
```

#### 3. High Memory Usage
```bash
# Monitor memory usage
pm2 monit

# Check for memory leaks
node --inspect app.js
# Use Chrome DevTools to analyze heap

# Restart application
pm2 restart sfo-backend
```

#### 4. Slow Performance
```bash
# Check system resources
top
iotop
free -h

# Database performance
psql -c "SELECT * FROM pg_stat_activity;"

# Redis performance
redis-cli info stats
```

### Health Checks

#### Application Health
```bash
curl -f http://localhost:3000/health
curl -f http://localhost:3000/metrics
```

#### Database Health
```bash
psql -c "SELECT 1;" sfo_prod
```

#### Cache Health
```bash
redis-cli ping
redis-cli info
```

### Log Analysis

```bash
# View recent errors
grep "ERROR" /opt/sfo-system/backend/logs/error.log | tail -20

# Monitor request patterns
grep "POST /api/orders" /opt/sfo-system/backend/logs/http.log | wc -l

# Check for security issues
grep "CSRF\|XSS\|SQL" /opt/sfo-system/backend/logs/error.log
```

## Security Checklist

### Pre-Deployment
- [ ] Environment variables configured securely
- [ ] SSL certificates installed and valid
- [ ] Firewall rules configured
- [ ] Database credentials rotated
- [ ] API keys secured
- [ ] File permissions set correctly

### Post-Deployment
- [ ] Security headers verified
- [ ] HTTPS enforcement confirmed
- [ ] Rate limiting tested
- [ ] Authentication working
- [ ] Authorization policies enforced
- [ ] Input validation active
- [ ] Error messages sanitized

## Performance Benchmarks

### Expected Performance
- **Response Time**: <200ms for API calls
- **Throughput**: 1000+ requests/second
- **Concurrent Users**: 10,000+ active users
- **Uptime**: 99.9% availability

### Monitoring Thresholds
- **CPU Usage**: <80% average
- **Memory Usage**: <85% of allocated
- **Disk I/O**: <90% utilization
- **Network**: <80% bandwidth usage

---

**Last updated:** November 4, 2025
**Version:** 1.0.0