# Immediate Emergency Fixes - Week 1

**Priority: CRITICAL - Business functions are broken**

## 🚨 Day 1: Fix Cron Job 404 Errors

### Issue
All cron jobs failing with 404: "The deployment could not be found on Vercel"

### Root Cause Analysis
1. **Wrong Production URL**: Cron jobs calling `https://vetic.ai-whisperers.org/api/cron/*`
2. **Missing Endpoints**: Vercel deployment may not have these routes
3. **DNS Issues**: `vetic.ai-whisperers.org` may not resolve to correct deployment

### Action Items
- [x] **Verify Vercel deployment status**
  ```bash
  gh vercel ls
  curl -I https://vetic.ai-whisperers.org/api/health
  ```
- [x] **Check cron endpoint routes exist in deployed code**
  ```bash
  # Locally test if endpoints exist
  npm run build
  npm run start &
  curl -I http://localhost:3000/api/cron/release-reservations
  ```
- [x] **Update cron.yml production URL** if deployment moved
  ```yaml
  # In .github/workflows/cron.yml
  env:
    PRODUCTION_URL: https://vetic.ai-whisperers.org
  ```
- [x] **Add cron job monitoring**
  ```yaml
  # Add to cron.yml
  - name: Health Check
        run: |
          response=$(curl -s -w "%{http_code}" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            "${{ env.PRODUCTION_URL }}/api/health")
          if [ "$response" -ne "200" ]; then
            echo "::error::Health check failed with status $response"
            exit 1
          fi
  ```

## 🛠️ Day 2: Fix Node Version Conflicts

### Issue
Dependencies require Node 20+, but CI tests Node 18

### Action Items
- [x] **Update all workflows to Node 20 only**
  ```yaml
  # In ci.yml and test.yml
  strategy:
    matrix:
      node-version: ["20"]  # Remove "18"
  ```
- [x] **Update package.json engines field**
  ```json
  {
    "engines": {
      "node": ">=20.0.0"
    }
  }
  ```
- [x] **Update Dockerfiles to Node 20**
  ```dockerfile
  # In both Dockerfiles
  FROM node:20-alpine AS base
  ```
- [x] **Update deploy-gcp.yml to Node 20**
  ```yaml
  - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: '20'  # Remove matrix, hardcode 20
  ```

## 🔧 Day 3: Fix GCP Deployment Issues

### Issue
SSH authentication and deployment failures

### Action Items
- [ ] **Verify SSH key configuration**
  ```bash
  # Test SSH access manually
  ssh -i ~/.ssh/id_rsa ai-whisperers@34.151.201.27 "pm2 list"
  ```
- [x] **Add deployment health checks**
  ```yaml
  # Add to deploy-gcp.yml
  - name: Health Check
        run: |
          sleep 30  # Wait for app to start
          response=$(curl -s -o /dev/null -w "%{http_code}" http://34.151.201.27:3000/api/health)
          if [ "$response" -ne "200" ]; then
            echo "::error::Deployment health check failed with status $response"
            exit 1
          fi
  ```
- [x] **Add rollback mechanism**
  ```yaml
  # Add to deploy-gcp.yml
  - name: Rollback on Failure
        if: failure()
        run: |
          git checkout HEAD~1  # Rollback to previous commit
          npm ci --legacy-peer-deps
          npm run build
          pm2 restart vete
          echo "Rolled back to previous commit"
  ```
- [ ] **Update GCP_SSH_PRIVATE_KEY** if needed
  ```bash
  # Generate new key and update in GitHub Secrets
  ssh-keygen -t rsa -b 4096 -C "deploy-key"
  # Add private key to GCP_SSH_PRIVATE_KEY
  # Add public key to GCP VM SSH keys
  ```

## 📊 Day 4-5: Add Monitoring & Verification

### Action Items
- [ ] **Set up cron job monitoring dashboard**
  ```yaml
  # Add to cron.yml
  - name: Update Status Dashboard
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            -d '{"status": "completed", "timestamp": "'$(date -u)"'}' \
            "${{ secrets.MONITORING_WEBHOOK_URL }}"
  ```
- [ ] **Add deployment success notifications**
  ```yaml
  # Add to deploy-gcp.yml
  - name: Notify Success
        if: success()
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            -d '{"deployment": "success", "url": "http://34.151.201.27:3000", "commit": "'${{ github.sha }}'"}' \
            "${{ secrets.SLACK_WEBHOOK_URL }}"
  ```
- [ ] **Test all cron jobs manually**
  ```bash
  # Test each endpoint
  for job in release-reservations stock-alerts-customers generate-recurring process-subscriptions reminders-pipeline inventory-alerts billing-daily monthly-invoicing; do
    echo "Testing $job..."
    curl -s -H "Authorization: Bearer $CRON_SECRET" \
         "https://vetic.ai-whisperers.org/api/cron/$job"
    echo "Response: $?"
    echo "---"
  done
  ```

## 🎯 Success Criteria for Week 1

### Daily Checklist
- [ ] All cron jobs respond with 200 status
- [ ] CI pipeline passes without Node version conflicts
- [ ] GCP deployment succeeds with health check
- [ ] Monitoring alerts configured and working
- [ ] Documentation updated with new procedures

### Rollback Plan
If any fix causes production issues:
1. **Immediately rollback** using previous git commit
2. **Notify team** via Slack/email
3. **Investigate** root cause before re-attempting
4. **Update documentation** with lessons learned

---

## Emergency Contacts

- **On-call Engineer**: [Contact info]
- **Vercel Support**: [Ticket link]
- **GCP Support**: [Project ID]
- **Monitoring Dashboard**: [URL]

## Post-Implementation

After completing Week 1 fixes:
1. **Verify cron job success rate** (should be 100%)
2. **Confirm CI pipeline stability** (no Node conflicts)
3. **Test GCP deployment reliability** (health checks pass)
4. **Update team** on new monitoring procedures

---

**Timeline**: Complete all fixes within 5 business days to restore critical business functions.