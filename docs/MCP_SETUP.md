# 🧰 The Ultimate MCP & Tooling Setup Guide

You asked for the **complete suite** to give me full superpowers. Here is the recommended setup for **PostgreSQL**, **Supabase**, **Vercel**, and **Filesytem**.

## 1. Install the MCP Servers

Run this command in your terminal (Global Install):

```powershell
npm install -g @modelcontextprotocol/server-postgres @modelcontextprotocol/server-filesystem
```

## 2. Configure Your Agent (JSON Config)

You need to find your Agent's **MCP Settings File** (often called `cline_mcp_settings.json` or accessible via "Settings > MCP Servers").

**Copy & Paste this configuration:**

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres:AM$!KL$BLdjY9qc@db.okddppczckbjdotrxiev.supabase.co:5432/postgres"
      ],
      "env": {
        "description": "Direct access to local Supabase DB. Fast debugging."
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:\\Users\\Alejandro\\Documents\\Ivan\\Adris\\Vete"
      ],
      "env": {
        "description": "Allows reading/writing files outside the main workspace if needed."
      }
    },
    "supabase-cli": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-command"],
      "description": "Checking for a generic command runner if available, otherwise just use the terminal!"
    }
  }
}
```

### 🔑 Critical Note on Connections

- **Postgres URL**: The one above (`54322`) is for your **Local Supabase**.
- **Production**: If you want me to debug production, you would add a second entry (e.g., `"postgres-prod"`) with your production connection string from Supabase Dashboard.

## 3. Vercel & Supabase (CLI Integration)

There isn't a dedicated "Vercel MCP" yet. Instead, I use your **Terminal** to run their CLIs.

**Ensure these are installed:**

1.  **Supabase CLI**: `npm install -g supabase` (Already verified).
2.  **Vercel CLI**: `npm install -g vercel`.
    - _Action_: Run `vercel login` once so I can deploy for you.

## 4. Final Verification

Once you save that JSON config:

1.  **Restart** your Agent/Editor.
2.  I should see a "Connected to postgres" message or be able to use a tool like `postgres.query`.

---

## 🚨 Don't Forget!

We just updated the **Database Scripts** to fix the login bug perfectly.
Before you go, please run:

1.  Start Supabase if not running: `npx supabase start`
2.  Run the Master Script: **`web/db/complete.sql`** (in Supabase SQL Editor).
3.  Verify: `npx tsx web/scripts/fix-and-verify-auth.ts`
