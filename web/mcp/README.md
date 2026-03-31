# Vete MCP Servers

> Model Context Protocol (MCP) servers for multi-tenant safe database operations and Spanish-first veterinary workflows

---

## 📦 What's Included

| Server                      | Purpose                      | Language | Tools                          |
| --------------------------- | ---------------------------- | -------- | ------------------------------ |
| **supabase-tenant-wrapper** | Multi-tenant safe DB queries | English  | 3 tools, 1 resource            |
| **veterinary-server**       | Veterinary clinic workflows  | Spanish  | 5 tools, 2 resources, 1 prompt |

---

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
cd web/mcp
npm install

# Build TypeScript to JavaScript
npm run build

# Verify build
ls dist/
```

### Test Servers

```bash
# Test supabase-tenant-wrapper
npm run start:supabase

# Test veterinary-tools
npm run start:veterinary
```

---

## 🛠️ Development

### Project Structure

```
web/mcp/
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── supabase-tenant-wrapper.ts  # Tenant-safe DB queries
├── veterinary-server.ts        # Spanish veterinary tools
└── dist/                       # Compiled JavaScript (generated)
    ├── supabase-tenant-wrapper.js
    ├── veterinary-server.js
    └── *.d.ts, *.map
```

### Build & Watch

```bash
# One-time build
npm run build

# Watch mode (rebuild on save)
npm run watch
```

### Adding New Tools

1. **Edit server file** (e.g., `veterinary-server.ts`)
2. **Add tool definition**:
   ```typescript
   server.setRequestHandler(ListToolsRequestSchema, async () => {
     return {
       tools: [
         // ... existing tools
         {
           name: 'nueva_herramienta',
           description: 'Nueva funcionalidad',
           inputSchema: {
             /* zod schema */
           },
         },
       ],
     }
   })
   ```
3. **Add tool handler**:
   ```typescript
   server.setRequestHandler(CallToolRequestSchema, async (request) => {
     if (request.params.name === 'nueva_herramienta') {
       // Implementation
     }
   })
   ```
4. **Rebuild**: `npm run build`

---

## 📖 Servers Documentation

### 1. supabase-tenant-wrapper

**Tools**:

- `query_with_tenant(table, tenant_id, columns?, filters?, limit?)` → Query with automatic tenant filtering
- `verify_rls_compliance(table_name)` → Check RLS enabled and policies
- `list_tenant_tables()` → List all multi-tenant tables

**Resources**:

- `mcp://vete/tenant-tables` → JSON list of tables with tenant_id

**Example**:

```typescript
// Query pets for tenant "terrapet"
{
  "tool": "query_with_tenant",
  "arguments": {
    "table": "pets",
    "tenant_id": "terrapet",
    "columns": "id, name, species",
    "limit": 10
  }
}
```

---

### 2. veterinary-server

**Tools** (All in Spanish):

- `obtener_historial_medico(pet_id, tenant_id)` → Medical history
- `crear_cita(pet_id, vet_id, tenant_id, fecha, motivo, duracion_minutos?)` → Create appointment
- `resumen_citas_veterinario(vet_id, tenant_id, fecha)` → Daily summary
- `revisar_vacunas_pendientes(tenant_id, dias_adelanto?)` → Pending vaccines
- `buscar_mascotas(tenant_id, query, limit?)` → Search pets

**Resources**:

- `mcp://veterinary/vets/{tenant_id}` → Available vets
- `mcp://veterinary/species` → Supported species

**Prompts**:

- `resumen_clinico(nombre_mascota, sintomas, diagnostico?)` → Clinical summary

**Example**:

```typescript
// Get medical history
{
  "tool": "obtener_historial_medico",
  "arguments": {
    "pet_id": "abc-123-def",
    "tenant_id": "terrapet"
  }
}
```

---

## 🔧 Troubleshooting

### Build Errors

**Error**: `Expected 2-3 arguments, but got 1`

**Fix**: Check `Server` constructor and `z.record()` usage:

```typescript
// Correct:
const server = new Server(
  {
    name: 'my-server',
    version: '1.0.0',
  },
  {
    capabilities: { tools: {} },
  }
)

// Correct:
z.record(z.string(), z.any()) // Not z.record(z.any())
```

---

### Runtime Errors

**Error**: `Missing Supabase environment variables`

**Fix**: Set environment variables:

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="ey..."
```

Or add to `.env.local` in `web/` directory.

---

### Supabase RPC Errors

**Error**: `function check_rls_enabled(text) does not exist`

**Fix**: Add helper functions to Supabase database:

```sql
-- See .opencode/MCP_AND_TOOLS_GUIDE.md for SQL functions
-- Or check web/db/XX_mcp_helpers.sql
```

---

## 📚 Scripts Reference

| Script             | Command                                | Purpose                          |
| ------------------ | -------------------------------------- | -------------------------------- |
| `build`            | `tsc`                                  | Compile TypeScript to JavaScript |
| `watch`            | `tsc --watch`                          | Auto-rebuild on file changes     |
| `start:supabase`   | `node dist/supabase-tenant-wrapper.js` | Test Supabase MCP                |
| `start:veterinary` | `node dist/veterinary-server.js`       | Test Veterinary MCP              |

---

## 🔐 Security Notes

1. **Service Role Key**: NEVER commit `SUPABASE_SERVICE_ROLE_KEY` to git
2. **Environment Variables**: Always use `.env.local` for secrets
3. **Tenant Filtering**: All queries MUST filter by `tenant_id`
4. **RLS Validation**: Use `verify_rls_compliance` before production

---

## 📖 Related Documentation

- **[.opencode/MCP_AND_TOOLS_GUIDE.md](../../.opencode/MCP_AND_TOOLS_GUIDE.md)** - Complete usage guide
- **[.opencode/MCP_SERVERS_GUIDE.md](../../.opencode/MCP_SERVERS_GUIDE.md)** - MCP ecosystem
- **[CLAUDE.md](../../CLAUDE.md)** - Vete coding standards

---

## 💡 Quick Tips

1. **Always rebuild** after TypeScript changes: `npm run build`
2. **Use watch mode** during development: `npm run watch`
3. **Test locally** before deploying: `npm run start:*`
4. **Check environment** variables are set before running
5. **Validate RLS** on all tables before using in production

---

**Last Updated**: January 2026  
**Version**: 1.0.0
