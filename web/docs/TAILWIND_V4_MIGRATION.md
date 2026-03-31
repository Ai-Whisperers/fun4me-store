# Tailwind CSS v4 Migration Guide

**Status**: 🔴 BLOCKED - Do not attempt until prerequisites are met  
**Version Locked**: 3.4.19 (exact pin in package.json)  
**Created**: January 2026

---

## Why We're Locked to v3

Tailwind CSS v4 introduces a new content scanning engine that breaks our current architecture. Specifically:

### The Problem

1. **JSON Color Values Misinterpreted**

   ```
   .content_data/terrapet/theme.json
   {
     "colors": {
       "primary": "#3B82F6",    // ← Scanner thinks this is class "primary"
       "blue-500": "#3B82F6"   // ← Scanner thinks this is class "blue-500"
     }
   }
   ```

2. **Build Failures**
   - Tailwind v4 scanner processes `.content_data/` JSON files
   - Treats color names and JSON keys as Tailwind class candidates
   - Generates thousands of invalid utility classes
   - Build process runs out of memory or takes 10+ minutes

3. **Content Path Collision**
   ```javascript
   // tailwind.config.js
   content: [
     './app/**/*.{js,ts,jsx,tsx}', // ✅ Correct
     './components/**/*.{js,ts,jsx,tsx}', // ✅ Correct
     // Problem: .content_data/ is in same directory tree
   ]
   ```

---

## Migration Prerequisites

Before upgrading to Tailwind v4, complete these steps:

### ✅ Step 1: Relocate Content Data (REQUIRED)

Move `.content_data/` outside the `web/` directory:

```bash
# Current structure
Vete/
├── web/
│   ├── .content_data/      # ← Problem: inside content scan path
│   ├── app/
│   └── components/

# Target structure
Vete/
├── content/                # ← Solution: outside web/
│   ├── _TEMPLATE/
│   ├── terrapet/
│   └── petlife/
├── web/
│   ├── app/
│   └── components/
```

**Implementation**:

```bash
cd Vete
mv web/.content_data ./content
```

**Update**: `web/lib/clinics.ts`

```typescript
// OLD
const contentPath = path.join(process.cwd(), '.content_data', clinicSlug)

// NEW
const contentPath = path.join(process.cwd(), '..', 'content', clinicSlug)
```

---

### ✅ Step 2: Update Tailwind Config

Add explicit content exclusions:

```javascript
// web/tailwind.config.js
module.exports = {
  content: {
    files: [
      './app/**/*.{js,ts,jsx,tsx,mdx}',
      './components/**/*.{js,ts,jsx,tsx,mdx}',
      './lib/**/*.{js,ts,jsx,tsx}',
    ],
    // Explicitly exclude data files
    exclude: [
      '**/node_modules/**',
      '**/.content_data/**', // Legacy path (just in case)
      '../content/**', // New path
      '**/db/**',
      '**/*.json', // Exclude ALL JSON files
    ],
  },
  // ... rest of config
}
```

---

### ✅ Step 3: Test All Clinic Themes

Verify that moving `.content_data/` doesn't break theme loading:

```bash
# Test theme loading
npm run dev

# Visit each clinic
http://localhost:3000/terrapet
http://localhost:3000/petlife

# Check browser console for errors
# Verify theme variables load correctly
```

**Validation Checklist**:

- [ ] Primary colors render correctly
- [ ] Custom fonts load
- [ ] Border radius variables work
- [ ] All clinic-specific styles apply

---

### ✅ Step 4: Update CI/CD

If build pipeline expects `.content_data/` in `web/`:

```yaml
# .github/workflows/deploy.yml

# OLD
- name: Setup content
  run: |
    cd web
    ls .content_data/

# NEW
- name: Setup content
  run: |
    ls content/
    cd web
```

---

## Tailwind v4 Upgrade Steps

**⚠️ DO NOT PROCEED until all prerequisites are complete**

### 1. Upgrade Package

```bash
cd web
npm install tailwindcss@^4.0.0
npm install @tailwindcss/postcss@^4.0.0
```

### 2. Update Config Format

Tailwind v4 uses a new config format:

```javascript
// web/tailwind.config.js

// v3 (current)
module.exports = {
  content: [...],
  theme: { extend: {...} },
  plugins: [...]
};

// v4 (new)
export default {
  content: [...],
  theme: {...},  // No more "extend"
  plugins: [...]
};
```

### 3. Update PostCSS Config

```javascript
// web/postcss.config.js

// v3 (current)
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

// v4 (new)
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

### 4. Test Build

```bash
npm run build
```

**Expected**:

- ✅ Build completes successfully
- ✅ No JSON files scanned
- ✅ Build time <2 minutes
- ✅ Bundle size similar to v3

---

## Rollback Plan

If upgrade fails:

```bash
cd web

# Revert package.json
git checkout package.json package-lock.json

# Reinstall v3
npm install

# Revert config changes
git checkout tailwind.config.js postcss.config.js

# Rebuild
npm run build
```

---

## Benefits of Upgrading to v4

Once prerequisites are met, Tailwind v4 offers:

### Performance

- **50% faster builds** (new Rust-based engine)
- **Smaller bundle sizes** (better tree-shaking)
- **Better caching** (incremental builds)

### Features

- **Native CSS variables** (simpler theming)
- **Container queries** (built-in, no plugin)
- **Better dark mode** (automatic variant generation)

### Developer Experience

- **Faster dev server** (instant HMR)
- **Better autocomplete** (improved IntelliSense)
- **Clearer errors** (better diagnostics)

---

## Timeline Estimate

| Phase                 | Duration      | Blocker         |
| --------------------- | ------------- | --------------- |
| Move `.content_data/` | 1 hour        | None            |
| Update imports        | 2 hours       | Testing         |
| CI/CD updates         | 1 hour        | DevOps access   |
| Tailwind v4 upgrade   | 2 hours       | Previous phases |
| Testing & fixes       | 4 hours       | QA              |
| **Total**             | **~10 hours** | Sequential      |

---

## Decision Log

| Date    | Decision               | Reason                      |
| ------- | ---------------------- | --------------------------- |
| 2025-01 | Lock to v3.4.19        | Prevent accidental upgrades |
| 2026-01 | Create migration guide | Document known issues       |
| TBD     | Schedule migration     | Waiting for bandwidth       |

---

## Questions & Answers

**Q**: Can we just exclude `.content_data/` in current config?  
**A**: No. Tailwind v4's scanner is more aggressive and processes all files in parent directories.

**Q**: Why not keep using v3 forever?  
**A**: v3 will eventually lose security updates. v4 also has significant performance improvements.

**Q**: Can we use v4 beta to prepare?  
**A**: Not recommended. Beta behavior may change. Wait for stable release and complete prerequisites first.

**Q**: What if we need a security patch for v3?  
**A**: Monitor Tailwind changelog. If critical CVE, we may need to expedite migration.

---

## Contact

For questions about this migration:

- **Owner**: DevOps Team
- **Blocker Resolution**: Complete prerequisites first
- **Emergency Patches**: Contact platform team

---

_Last Updated: January 2026_
