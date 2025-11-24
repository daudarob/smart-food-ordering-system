#!/bin/bash

# Comprehensive health check script for SFO application
# This script checks all components of the system

set -e

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
TIMEOUT=30
RETRIES=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check function with retry logic
check_with_retry() {
    local url=$1
    local expected_code=${2:-200}
    local description=$3

    for i in $(seq 1 $RETRIES); do
        log_info "Checking $description (attempt $i/$RETRIES)..."

        if curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" | grep -q "^$expected_code$"; then
            log_info "$description is healthy"
            return 0
        fi

        if [ $i -lt $RETRIES ]; then
            log_warn "Attempt $i failed, retrying in 2 seconds..."
            sleep 2
        fi
    done

    log_error "$description is unhealthy"
    return 1
}

# Main health checks
main() {
    local failed_checks=0

    echo "=========================================="
    echo "SFO Application Health Check"
    echo "=========================================="
    echo "Timestamp: $(date)"
    echo

    # Backend health check
    if ! check_with_retry "$BACKEND_URL/health" 200 "Backend API"; then
        ((failed_checks++))
    fi

    # Frontend health check
    if ! check_with_retry "$FRONTEND_URL" 200 "Frontend Application"; then
        ((failed_checks++))
    fi

    # Backend metrics endpoint
    if ! check_with_retry "$BACKEND_URL/metrics" 200 "Backend Metrics"; then
        ((failed_checks++))
    fi

    # Database connectivity (through backend)
    if ! check_with_retry "$BACKEND_URL/api/menu/categories" 200 "Database Connectivity"; then
        ((failed_checks++))
    fi

    # Authentication endpoint
    if ! check_with_retry "$BACKEND_URL/api/auth/verify" 401 "Authentication System"; then
        ((failed_checks++))
    fi

    echo
    echo "=========================================="

    if [ $failed_checks -eq 0 ]; then
        log_info "All health checks passed!"
        exit 0
    else
        log_error "$failed_checks health check(s) failed!"
        exit 1
    fi
}

# Run main function
main "$@"