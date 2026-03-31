# Vete Platform Disaster Recovery Runbook

> **Last Updated**: January 2026
> **Owner**: Platform Engineering Team
> **Review Schedule**: Quarterly

## Recovery Objectives

| Metric | Target | Description |
|--------|--------|-------------|
| **RTO** | 4 hours | Maximum time to restore service |
| **RPO** | 1 hour | Maximum acceptable data loss |

## Quick Reference Card

### Emergency Contacts
- **On-Call Engineer**: Check #ops-oncall Slack channel
- **Supabase Support**: support@supabase.com (Pro plan priority)
- **Vercel Support**: enterprise@vercel.com

### Status Pages
- Supabase: https://status.supabase.com
- Vercel: https://www.vercel-status.com

### Key URLs
- Production: https://vete.com.py
- Supabase Dashboard: https://supabase.com/dashboard
- Vercel Dashboard: https://vercel.com/dashboard

---

## Incident Response Framework

### Severity Levels

| Level | Impact | Response Time | Example |
|-------|--------|---------------|---------|
| **SEV-1** | Complete outage | Immediate | Database down, all users affected |
| **SEV-2** | Major feature broken | 30 min | Payments failing, auth broken |
| **SEV-3** | Minor feature broken | 2 hours | Single API endpoint failing |
| **SEV-4** | Degraded performance | 8 hours | Slow queries, high latency |

### Response Timeline

```
0 min    - Incident detected (alert or report)
5 min    - Acknowledge and assess severity
15 min   - Notify stakeholders
30 min   - Initial diagnosis complete
1 hour   - Recovery action in progress
2 hours  - Status update to customers
4 hours  - Service restored (RTO target)
```

---

## Scenario 1: Database Corruption

### Symptoms
- Data inconsistency errors in logs
- Foreign key constraint violations
- Missing or duplicated records
- Verification checks failing (`/api/cron/verify-backup`)

### Recovery Procedure

#### Phase 1: Assessment (15 min)
1. **Check backup verification status**
   ```bash
   # Check latest verification result
   curl -X GET https://vete.com.py/api/cron/verify-backup \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

2. **Identify affected tables**
   - Check audit logs: `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100`
   - Review `backup_verification_results` for failed checks

3. **Determine corruption scope**
   - Single table vs multiple tables
   - Single tenant vs cross-tenant

#### Phase 2: Isolation (15 min)
1. **Enable maintenance mode**
   ```bash
   # Update Vercel environment variable
   vercel env set MAINTENANCE_MODE true --production
   ```

2. **Block writes to affected tables**
   - Disable RLS policies temporarily if needed
   - Note: Supabase doesn't support read-only mode per table

#### Phase 3: Recovery (1-2 hours)
1. **Point-in-Time Recovery (PITR)**
   - Go to Supabase Dashboard > Database > Backups
   - Select "Point in Time Recovery"
   - Choose timestamp BEFORE corruption (max 7 days)
   - Note: This restores ENTIRE database

2. **Selective Table Restore (Alternative)**
   ```sql
   -- If only specific tables affected
   -- Export clean data from backup, import to production
   -- Contact Supabase support for selective restore
   ```

3. **Verify data integrity**
   ```bash
   # Run backup verification
   curl -X POST https://vete.com.py/api/cron/verify-backup \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

#### Phase 4: Resume Operations (30 min)
1. **Disable maintenance mode**
2. **Monitor error rates for 1 hour**
3. **Notify affected tenants if data loss occurred**

#### Post-Incident
- [ ] Complete post-mortem within 48 hours
- [ ] Update runbook if new scenarios discovered
- [ ] Schedule follow-up verification checks

---

## Scenario 2: Complete Service Outage

### Symptoms
- All API endpoints return 5xx errors
- Vercel deployment unhealthy
- Database connections failing
- Users cannot access any features

### Recovery Procedure

#### Phase 1: Triage (5 min)
1. **Check external status pages**
   - Supabase: https://status.supabase.com
   - Vercel: https://www.vercel-status.com

2. **Identify root cause**
   | Symptom | Likely Cause |
   |---------|--------------|
   | Vercel 502 | Deployment issue |
   | Database timeout | Supabase issue |
   | DNS errors | Domain configuration |
   | SSL errors | Certificate expiry |

#### Phase 2: Communication (10 min)
1. **Internal notification**
   - Post in #incidents Slack channel
   - Tag on-call engineer

2. **Customer notification**
   - Update status page (if configured)
   - Prepare email template (see Appendix)

#### Phase 3: Recovery Actions

**If Vercel Issue:**
```bash
# Rollback to previous deployment
vercel rollback --yes

# Or redeploy from last known good commit
vercel deploy --prod
```

**If Supabase Issue:**
```sql
-- Test database connectivity
SELECT 1;

-- Check connection pool
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- If pooler issue, restart from dashboard
```

**If DNS/Domain Issue:**
- Check Vercel domain settings
- Verify DNS propagation: https://dnschecker.org
- Contact registrar if needed

#### Phase 4: Verification (30 min)
1. **Health check endpoints**
   ```bash
   curl https://vete.com.py/api/health
   curl https://vete.com.py/api/health/cron
   ```

2. **Critical path testing**
   - [ ] Homepage loads
   - [ ] Login works
   - [ ] Pet list loads
   - [ ] Appointment booking works
   - [ ] Store checkout works

3. **Cron job verification**
   - Check last run times in monitoring
   - Manually trigger critical crons if needed

---

## Scenario 3: Security Breach

### Symptoms
- Unauthorized access detected in audit logs
- Suspicious API activity patterns
- Customer reports of account compromise
- Data exfiltration indicators

### Recovery Procedure

#### Phase 1: Containment (IMMEDIATE)
1. **Isolate compromised components**
   ```bash
   # Enable maintenance mode
   vercel env set MAINTENANCE_MODE true --production

   # Revoke API keys (if compromised)
   # In Supabase Dashboard > Settings > API
   ```

2. **Preserve evidence**
   - Export audit logs: `SELECT * FROM audit_logs WHERE created_at > 'SUSPECT_TIME'`
   - Screenshot suspicious activity
   - Do NOT delete logs

3. **Disable compromised accounts**
   ```sql
   -- Disable specific user
   UPDATE auth.users SET banned_until = 'infinity' WHERE id = 'COMPROMISED_USER_ID';
   ```

#### Phase 2: Assessment (1-2 hours)
1. **Determine breach scope**
   - Which tenants affected?
   - What data accessed?
   - How long was access maintained?

2. **Check access patterns**
   ```sql
   -- Review API access
   SELECT * FROM audit_logs
   WHERE user_id = 'SUSPECT_USER_ID'
   ORDER BY created_at DESC;
   ```

#### Phase 3: Credential Rotation
1. **Supabase API keys**
   - Rotate anon key
   - Rotate service role key
   - Update Vercel environment variables

2. **Third-party integrations**
   - WhatsApp API key
   - Email service key (Resend)
   - Payment gateway keys

3. **Force password resets**
   ```sql
   -- For affected tenants
   UPDATE profiles SET password_reset_required = true
   WHERE tenant_id IN ('affected_tenant_ids');
   ```

#### Phase 4: Restoration
1. **Restore from clean backup if needed**
   - Use backup from BEFORE breach
   - Verify integrity before switching

2. **Apply security patches**
   - Update RLS policies if gaps found
   - Add additional rate limiting
   - Enable additional logging

#### Phase 5: Notification
1. **Internal documentation**
   - Complete incident report
   - Document timeline

2. **Customer notification** (within 72 hours for GDPR)
   - Use breach notification template (Appendix)
   - Include: what happened, what data, what we're doing, what they should do

3. **Regulatory compliance**
   - GDPR: Notify supervisory authority if applicable
   - Local regulations: Check Paraguay data protection requirements

---

## Scenario 4: Third-Party Service Outage

### Affected Services & Fallbacks

| Service | Impact | Fallback |
|---------|--------|----------|
| Supabase | Critical - No DB | None (wait for recovery) |
| Vercel | Critical - No hosting | None (wait for recovery) |
| Resend | Email not sent | Queue and retry |
| WhatsApp API | Messages fail | Queue and retry |
| Upstash | Rate limiting degraded | Graceful degradation |

### Recovery for Email/WhatsApp Failures
1. **Messages are queued in database**
2. **Cron jobs will retry automatically**
3. **Monitor `/api/cron/reminders` for backlog**

---

## Scenario 5: Data Loss (Accidental Deletion)

### Prevention Measures
- RLS policies prevent cross-tenant access
- Soft delete for critical entities where possible
- Audit logs capture all mutations

### Recovery Procedure
1. **Identify what was deleted**
   ```sql
   SELECT * FROM audit_logs
   WHERE action = 'DELETE'
   AND created_at > NOW() - INTERVAL '24 hours';
   ```

2. **Use Point-in-Time Recovery**
   - Supabase Dashboard > Backups > PITR
   - Restore to timestamp before deletion

3. **Selective data export**
   - For single-tenant issues, export from backup
   - Import to production

---

## Recovery Checklist

Use this checklist during any incident:

### Initial Response
- [ ] Acknowledge incident
- [ ] Start incident timer
- [ ] Assign incident commander
- [ ] Open incident channel

### Assessment
- [ ] Check Supabase status
- [ ] Check Vercel status
- [ ] Review error logs
- [ ] Identify affected components
- [ ] Determine severity level

### Communication
- [ ] Notify internal team
- [ ] Update status page
- [ ] Prepare customer communication

### Recovery
- [ ] Execute appropriate recovery procedure
- [ ] Verify service restoration
- [ ] Test critical paths
- [ ] Monitor for regression

### Post-Incident
- [ ] Disable maintenance mode
- [ ] Send all-clear notification
- [ ] Schedule post-mortem
- [ ] Update documentation

---

## Appendix A: Communication Templates

### Internal Incident Alert
```
🚨 INCIDENT: [Brief Description]
Severity: SEV-[1-4]
Impact: [Who/what is affected]
Status: Investigating / Mitigating / Resolved
Commander: [Name]
Channel: #incident-[date]
```

### Customer Status Update
```
Subject: Vete Platform - Service Disruption

We are currently experiencing issues with [affected feature].

Impact: [What customers can/cannot do]
Expected Resolution: [Time estimate]

We apologize for any inconvenience and will provide updates every [30 min/1 hour].

- The Vete Team
```

### Security Breach Notification (GDPR)
```
Subject: Important Security Notice - Vete Platform

Dear [Customer],

We are writing to inform you of a security incident that occurred on [date].

What happened: [Brief description]
What data was affected: [List affected data types]
What we've done: [Actions taken]
What you should do: [Recommended actions]

If you have questions, contact us at [email].

Sincerely,
[Name], Data Protection Officer
```

---

## Appendix B: DR Drill Schedule

### Quarterly Drill Calendar
- **Q1**: Database recovery drill
- **Q2**: Security incident simulation
- **Q3**: Complete failover test
- **Q4**: Communication and escalation drill

### Drill Procedure
1. Schedule drill 2 weeks in advance
2. Notify all participants
3. Use staging environment when possible
4. Document drill results
5. Update runbook based on findings

---

## Appendix C: Useful Commands

### Database Health
```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Slow queries
SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;

-- Table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC;
```

### Vercel Commands
```bash
# List deployments
vercel ls

# Rollback
vercel rollback [deployment-url]

# Check logs
vercel logs [deployment-url]

# Set environment variable
vercel env set [name] [value] --production
```

### Backup Verification
```bash
# Trigger manual verification
curl -X POST https://vete.com.py/api/cron/verify-backup \
  -H "Authorization: Bearer $CRON_SECRET"

# Check health
curl https://vete.com.py/api/health/cron
```

---

## Document History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01 | 1.0 | Initial creation | DATA-003 |

---

*This runbook should be reviewed quarterly and updated after any significant incident.*
