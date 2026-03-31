# Infrastructure Analysis

## Overview

The Vete platform has **multiple deployment pathways** with good Docker configuration but lacks infrastructure-as-code consistency and monitoring.

## Current Infrastructure Components

### 🐳 Docker Configuration

**Strengths:**
- Multi-stage builds optimized for production
- Security hardening (non-root user)
- Health checks implemented
- Both root and web-specific Dockerfiles
- Cloudflare tunnel support

**Configuration:**
- **Root Dockerfile**: `/d1/WEBSITEs/vete-and-websites/Dockerfile`
  - Multi-stage: base → deps → builder → runner
  - Next.js standalone output
  - Health check endpoint: `/api/health`
- **Web Dockerfile**: `/d1/WEBSITEs/vete-and-websites/web/Dockerfile`
  - Similar structure, supports build args
  - Handles NEXT_PUBLIC_* variables
- **Docker Compose**: `/d1/WEBSITEs/vete-and-websites/docker-compose.yml`
  - Services: web (Next.js app), cloudflared (optional tunnel)
  - Environment: `web/.env.local`
  - Network isolation with `vete-network`

### 🌐 Deployment Targets

#### Primary: GCP VM Production
- **Location**: `34.151.201.27:3000`
- **Method**: SSH deployment via GitHub Actions
- **Process**: PM2 process management
- **Workflow**: `.github/workflows/deploy-gcp.yml`
- **Status**: ❌ Failing (SSH issues)

#### Secondary: Vercel (Serverless)
- **URL**: `https://vetic.ai-whisperers.org`
- **Configuration**: `vercel.json` (root and web)
- **Workflow**: `.github/workflows/deploy-vercel.yml.disabled`
- **Status**: ⚠️ Disabled (manual deployment only)

#### Alternative: Self-Hosted
- **Method**: Docker Compose with Cloudflare tunnel
- **Configuration**: `docker-compose.cloudflare.yml`
- **Use Case**: Development and emergency production
- **Tunnel**: Cloudflare `cloudflared` service

### 📡 Domain Management

**Centralized DNS Control:**
- **Data Store**: `web/.content_data/domains.json`
- **CLI Tool**: `scripts/domains.mjs`
- **Supported Providers**: Vercel, Cloudflare
- **Features**: Add, remove, validate, sync, verify

**Current Domains:**
- `terrapet.vetic.vercel.app` (primary)
- `petlife.vetic.vercel.app` (secondary)
- Multiple subdomain configurations for different clinics

### 🏗️ Infrastructure Gaps

#### 1. No Infrastructure as Code
- **Missing**: Terraform, CloudFormation, or Pulumi
- **Impact**: Manual VM setup, drift potential
- **Risk**: Configuration inconsistencies

#### 2. No Environment Standardization
- **Issue**: Multiple deployment paths, unclear primary
- **Impact**: Confusion in deployment procedures
- **Risk**: Deploying to wrong environment

#### 3. Limited Monitoring
- **Missing**: Comprehensive health checks
- **Missing**: Performance monitoring
- **Missing**: Alerting for failures

#### 4. No Staging Environment
- **Missing**: Staging deployment pipeline
- **Impact**: Testing in production only
- **Risk**: Undiscovered issues before production

#### 5. Security Scanning Gaps
- **Missing**: Container vulnerability scanning
- **Missing**: Network security policies
- **Risk**: Unknown security posture

## Deployment Pipeline Analysis

### Current Process Flow

```
Code Push → CI/CD Pipeline → Production Target
    ├─┬─ CI: Lint, Test, Build
    │   ├─✅ GitHub Actions (failing)
    │   └─❌ High failure rate
    ├─┬─ Test: Unit, Integration, E2E
    │   ├─✅ Comprehensive coverage
    │   └─❌ Database setup issues
    ├─┬─ Deploy: 
    │   ├─❌ GCP VM (SSH issues)
    │   └─⚠️ Vercel (disabled)
    └─┬─ Monitor: Limited
        ├─❌ Cron jobs (100% failure)
        └─❌ No health checks
```

### Cost Analysis

**Current Monthly Costs:**
- GitHub Actions: ~$200 (high due to failures)
- GCP VM: $35 (e2-medium)
- Vercel: $20 (hobby plan)
- **Total**: ~$255/month

**Optimization Opportunities:**
- Fix failures → Reduce Actions cost by 50%
- Right-size GCP → e2-micro ($0/month with free tier)
- Consolidate deployments → Reduce complexity

## Infrastructure Recommendations

### 🚨 Immediate (Week 1)
1. **Add container security scanning**
   ```yaml
   - name: Container Security Scan
     uses: aquasecurity/trivy-action@master
     with:
       image-ref: ${{ env.DOCKER_IMAGE }}
   ```
2. **Standardize deployment paths**
   - Choose primary target (GCP or Vercel)
   - Update all documentation
   - Disable unused deployment workflows

### ⚠️ High Priority (Week 2-4)
1. **Implement Infrastructure as Code**
   ```hcl
   # Terraform example
   resource "google_compute_instance" "vete_prod" {
     name         = "vete-prod"
     machine_type = "e2-medium"
     zone         = "us-central1-a"
   }
   ```
2. **Add comprehensive monitoring**
   - Application performance monitoring
   - Infrastructure metrics
   - Health check dashboards
3. **Create staging environment**
   - Separate Vercel project for staging
   - Automated testing pipeline
4. **Implement canary deployments**
   - Gradual traffic shifting
   - Automated rollback triggers

### 📋 Medium Priority (Month 1-2)
1. **Optimize Docker builds**
   - Build caching
   - Layer caching
   - Parallel builds
2. **Add load balancing**
   - Multiple GCP instances
   - Health check routing
3. **Enhance security posture**
   - Regular vulnerability scanning
   - Network security policies
   - Secret rotation procedures

## Security Assessment

### Current State
- ✅ Non-root containers
- ✅ SSH key authentication
- ✅ Row-Level Security (RLS) in database
- ❌ No container vulnerability scanning
- ❌ No network security policies
- ⚠️ Limited secret rotation procedures

### Required Improvements
1. **Container Security**
   - Integrate Trivy/Grype scanning in CI
   - Base image vulnerability scanning
   - Runtime security monitoring

2. **Network Security**
   - GCP firewall rules documentation
   - VPC network isolation
   - SSL/TLS enforcement

3. **Secret Management**
   - Automated rotation schedule
   - Secure storage solutions
   - Access logging and auditing

## Cost Optimization Plan

### Phase 1: Emergency Cost Reduction
- Fix cron failures → Reduce failed workflow runs by 80%
- Optimize caching → Reduce build times by 40%
- Result: **$120/month savings**

### Phase 2: Infrastructure Efficiency
- Right-size GCP VM: e2-medium → e2-micro
- Implement auto-scaling: Pay only for resources used
- Result: **$35/month savings**

### Phase 3: Long-term Optimization
- Consolidate monitoring tools
- Implement infrastructure monitoring
- Reserved instance commitments
- Result: **$50/month additional savings**

---

**Bottom Line**: Infrastructure is functional but has critical reliability gaps and cost optimization opportunities. Immediate focus should be on fixing cron failures and standardizing deployment procedures.