# Supabase MCP Setup for OpenCode

## Current Status
- ✅ Supabase MCP installed: `@supabase/mcp-server-postgrest@0.1.0`
- ❌ OAuth authentication pending: "No OAuth state saved"

## Quick Fix (UI Method)

### Step 1: Authenticate Supabase MCP in OpenCode

1. **Open OpenCode Settings**
   - Press `Ctrl + ,` or go to Settings
   - Navigate to **MCP Servers** section

2. **Find Supabase MCP Server**
   - Should show as: `supabase` with error status
   - Click **"Authenticate"** or **"Connect"** button

3. **Complete OAuth Flow**
   - Will open browser to Supabase OAuth consent
   - Login with your Supabase account
   - Authorize OpenCode to access your Supabase project
   - Return to OpenCode (should auto-redirect)

4. **Verify Connection**
   - Status should change to **Connected** (green)
   - Test with a query

### Step 2: Test Connection

Once authenticated, test with:

```
Query the tenants table and show the first 5 clinics
```

Or use a tool directly:
```
List all tables in the Vete database
```

---

## Manual Configuration (Alternative)

If OAuth doesn't work, configure manually:

### Create Manual MCP Configuration

Edit `~/.config/opencode/opencode.json` and add `mcpServers` section:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "theme": "opencode",
  "model": "anthropic/claude-sonnet-4-5",
  "autoupdate": true,
  "plugin": [...],
  "provider": {...},
  
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-postgrest"
      ],
      "env": {
        "SUPABASE_URL": "https://okddppczckbjdotrxiev.supabase.co",
        "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZGRwcGN6Y2tiamRvdHJ4aWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MTgzNjgsImV4cCI6MjA4MTQ5NDM2OH0.ZaGuchvSsLLH5KSqSdOZO_2Cdaoa9zLExyIL37XS5jE"
      }
    }
  }
}
```

**Restart OpenCode** after editing.

---

## Alternative: Use PostgreSQL MCP Instead

For direct database access without OAuth:

```json
"mcpServers": {
  "vete-db": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-postgres"],
    "env": {
      "POSTGRES_CONNECTION_STRING": "postgresql://postgres:VetePlatform2024!@db.okddppczckbjdotrxiev.supabase.co:5432/postgres"
    }
  }
}
```

This gives full SQL access without OAuth requirements.

---

## What You'll Be Able to Do

Once connected, you can:

### 1. Query Database Directly
```
Show me all tenants with their subscription tiers
```

### 2. Schema Inspection
```
Describe the appointments table structure
```

### 3. Data Analysis
```
Count how many pets are registered per clinic
```

### 4. RLS Policy Inspection
```
Show me the RLS policies on the profiles table
```

### 5. Quick Data Lookups
```
Find all pending appointments for clinic 'adris'
```

---

## Troubleshooting

### "No OAuth state saved"
- **Cause**: OAuth flow not completed
- **Fix**: Use UI authentication or switch to manual config

### "Connection refused"
- **Cause**: Wrong credentials or network issue
- **Fix**: Verify SUPABASE_URL and ANON_KEY in .env.local

### "RLS policy violation"
- **Cause**: Using ANON_KEY (has RLS restrictions)
- **Fix**: Use SERVICE_ROLE_KEY for full access (admin only):
  ```json
  "env": {
    "SUPABASE_URL": "https://okddppczckbjdotrxiev.supabase.co",
    "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGci..."
  }
  ```

---

## Security Notes

⚠️ **Important**:
- **ANON_KEY**: Row-Level Security enforced (safe for queries)
- **SERVICE_ROLE_KEY**: Bypasses RLS (use carefully, full admin access)
- Never commit keys to git
- The manual config exposes keys in config file (use OAuth when possible)

---

## Next Steps

1. Try OAuth authentication first (UI method)
2. If OAuth fails, use manual PostgreSQL MCP configuration
3. Test connection with simple queries
4. Once working, you can query the database directly through Claude!

