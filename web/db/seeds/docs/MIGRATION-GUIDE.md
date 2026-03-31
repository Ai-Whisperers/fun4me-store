# Migration Guide: SQL Setup → API Setup

## 🎯 Overview

Your seed data setup has been completely transformed from a **SQL generation approach** to an **API-based approach**. This guide explains what changed and why it's better.

## 📊 Before vs After

### ❌ OLD Approach (SQL Generation)

```bash
# Generated hardcoded SQL
npx tsx db/seeds/scripts/seed-from-json.ts > db/seeds/generated-seed.sql
psql -f db/seeds/generated-seed.sql
```

**Problems:**

- Hardcoded UUIDs everywhere
- No backend validation
- Foreign key issues
- Manual ID management
- Not testing real workflows

### ✅ NEW Approach (API Calls)

```bash
# Real API calls with backend-generated IDs
npm run env:setup:demo
# or
./db/seeds/scripts/setup demo
```

**Benefits:**

- Backend generates all IDs
- Full API validation
- Real user workflows
- Automatic relationships
- No ID maintenance

## 🔄 What Changed

### 1. **No More Hardcoded IDs**

```json
// OLD: Hardcoded UUIDs
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Ana González",
  "owner_id": "550e8400-e29b-41d4-a716-446655440001"
}

// NEW: ID removed, references resolved automatically
{
  "name": "Ana González"
  // owner_id resolved at runtime from tracker
}
```

### 2. **API Calls Instead of SQL**

```typescript
// OLD: Generate SQL INSERT
INSERT INTO profiles (id, name) VALUES ('uuid-1', 'Ana');

// NEW: Real API call
await api.createProfile({ name: 'Ana' });
// Backend returns: { id: 'auto-generated-uuid', name: 'Ana' }
```

### 3. **Automatic ID Tracking**

```typescript
// System tracks created IDs automatically
const created = await api.createProfile(profileData)
tracker.set('profile', 'original-json-id', created.id)

// Later references are resolved automatically
const appointmentData = { owner_id: 'original-json-id' }
const resolved = tracker.resolveReferences(appointmentData)
// Result: { owner_id: 'auto-generated-uuid' }
```

### 4. **Dependency-Aware Creation Order**

```
1. Tenants → 2. Clinic Setup → 3. Profiles → 4. Pets → 5. Appointments
   ↓             ↓                    ↓            ↓            ↓
Core Data    Services,           Pet Owners   Pet Data    Medical
             Payment Methods,    Vets                      Records
             Kennels
```

## 🚀 Quick Migration

### For Development

```bash
# Instead of: npm run db:seeds
npm run env:setup:full
```

### For Testing

```bash
# Instead of: psql -f generated-seed.sql
npm run env:setup:demo

# For testing iterations: clear and recreate
npm run env:reset  # Clear all data + setup demo
```

### Clear Environment Data

```bash
# Clear all data without recreating (for clean testing)
npm run env:clear

# Clear and recreate with different levels
npm run env:reset:basic   # Clear + basic setup
npm run env:reset:full    # Clear + full setup
npm run env:reset         # Clear + demo setup
```

### For Production

```bash
# Instead of: manual SQL execution
npx tsx db/seeds/scripts/setup-via-api.ts \
  --env https://your-api.com \
  --token your-admin-token \
  --type demo
```

## 📋 Setup Types Comparison

| Feature              | OLD SQL   | NEW Basic | NEW Full | NEW Demo |
| -------------------- | --------- | --------- | -------- | -------- |
| **Tenants**          | ✅        | ✅        | ✅       | ✅       |
| **Clinic Services**  | ✅        | ✅        | ✅       | ✅       |
| **Payment Methods**  | ✅        | ✅        | ✅       | ✅       |
| **Kennels**          | ✅        | ✅        | ✅       | ✅       |
| **QR Tags**          | ✅        | ❌        | ✅       | ✅       |
| **Pet Owners**       | ✅        | ❌        | ✅       | ✅       |
| **Pets**             | ✅        | ❌        | ✅       | ✅       |
| **Appointments**     | ✅        | ❌        | ✅       | ✅       |
| **Medical Records**  | ✅        | ❌        | ❌       | ✅       |
| **Vaccines**         | ✅        | ❌        | ❌       | ✅       |
| **Hospitalizations** | ✅        | ❌        | ❌       | ✅       |
| **Store Catalog**    | ✅        | ❌        | ❌       | ✅       |
| **ID Generation**    | Hardcoded | Backend   | Backend  | Backend  |
| **Validation**       | None      | Full API  | Full API | Full API |
| **Relationships**    | Manual    | Auto      | Auto     | Auto     |

## 🛠️ Usage Examples

### Development Setup

```bash
# Fast setup for development
npm run env:setup:basic
# Creates: tenant, services, payment methods, kennels
```

### Feature Testing

```bash
# Complete clinic for testing
npm run env:setup:full
# Creates: everything above + sample profiles, pets, appointments
```

### Demo Environment

```bash
# Full showcase environment
npm run env:setup:demo
# Creates: everything above + medical records, vaccines, hospitalizations, store
```

### Custom Environment

```bash
# Production setup with custom settings
npx tsx db/seeds/scripts/setup-via-api.ts \
  --env https://api.yourapp.com \
  --tenant myclinic \
  --type full \
  --token eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

## 🔧 Troubleshooting Migration

### "Entity already exists" errors

```bash
# Add --no-skip to overwrite existing data
npm run env:setup:demo -- --no-skip
```

### Authentication issues

```bash
# Provide explicit admin token
npm run env:setup:demo -- --token YOUR_TOKEN
```

### Network/API issues

```bash
# Verify API is running and accessible
curl http://localhost:3000/health

# Check API logs for validation errors
# The script will show detailed error messages
```

## 📈 Benefits Achieved

### ✅ **Maintainability**

- No more hardcoded ID management
- JSON files are cleaner and more readable
- Changes to data structure don't break references

### ✅ **Reliability**

- Backend validation ensures data quality
- Foreign key relationships maintained automatically
- Business rules enforced during creation

### ✅ **Realism**

- Data created through actual user workflows
- API responses match real application behavior
- Better testing of complete user journeys

### ✅ **Scalability**

- Easy to add new entities and relationships
- Automatic dependency resolution
- No manual coordination of ID references

### ✅ **Developer Experience**

- Simple commands replace complex SQL workflows
- Clear progress reporting and error messages
- Multiple setup scenarios for different needs

## 🔮 Future Enhancements

The new API-based approach enables:

- **Parallel entity creation** for better performance
- **Incremental updates** for existing environments
- **Custom setup profiles** for different clinic types
- **Data validation** against API schemas
- **Rollback capabilities** on setup failures

## 📞 Support

### Common Issues

1. **API not running**: Ensure your backend is started
2. **Authentication failed**: Check admin credentials or provide token
3. **Tenant not found**: Create tenant first or use existing one
4. **Entity conflicts**: Use `--no-skip` to overwrite or clean first

### Getting Help

- Check the detailed README-API-SETUP.md
- Review API logs for validation errors
- Test individual API endpoints manually
- Use the CLI wrapper for simpler commands

---

## 🎉 Summary

**The migration is complete!** Your seed data setup now uses real API calls instead of SQL generation. This provides:

- ✅ **Backend-generated IDs** (no more hardcoded UUIDs)
- ✅ **Full API validation** (business rules enforced)
- ✅ **Real user workflows** (data created like users would)
- ✅ **Automatic relationships** (no manual ID management)
- ✅ **Better maintainability** (cleaner, more reliable code)

**Start using the new approach today:**

```bash
npm run env:setup:full  # For development
npm run env:setup:demo  # For testing/showcase
```

The old SQL approach is still available in `seed-from-json.ts` if needed, but the new API approach is now the recommended way to set up your environments! 🚀
