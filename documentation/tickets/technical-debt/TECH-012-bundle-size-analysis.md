# TECH-012: Add Bundle Size Analysis

**Category**: Technical Debt  
**Priority**: P2 - Medium  
**Status**: Open  
**Effort**: 1 hour  
**Impact**: Medium - Performance monitoring  
**Created**: 2025-01-19  
**Source**: critique/10-dependencies-roast.md (DEP-010)

## Summary

No bundle analysis tooling configured. Could be shipping 10MB of JavaScript and not know it.

## Problem

Current state:
- No visibility into bundle size
- No size limits or warnings
- No tracking of size growth over time
- Can't identify large dependencies

## Solution

### Step 1: Install Bundle Analyzer
```bash
cd web
npm install --save-dev @next/bundle-analyzer
```

### Step 2: Configure next.config.ts
```typescript
// next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig)
```

### Step 3: Add Analyze Script
```json
// package.json
{
  "scripts": {
    "analyze": "ANALYZE=true next build",
    "analyze:server": "ANALYZE=true BUNDLE_ANALYZE=server next build",
    "analyze:browser": "ANALYZE=true BUNDLE_ANALYZE=browser next build"
  }
}
```

### Step 4: Run Initial Analysis
```bash
npm run analyze
```

This will:
- Build the app
- Generate bundle visualization
- Open interactive treemap in browser

### Step 5: Set Size Budgets (Optional)
```javascript
// next.config.ts
module.exports = {
  performance: {
    maxAssetSize: 512000, // 500KB
    maxEntrypointSize: 512000, // 500KB
  },
}
```

## Acceptance Criteria
- [ ] Bundle analyzer installed and configured
- [ ] `npm run analyze` generates bundle report
- [ ] Initial analysis complete (document baseline sizes)
- [ ] Large dependencies identified
- [ ] Size budgets configured (optional)

## Expected Findings

Common bundle size issues:
- Moment.js (332KB) - Replace with date-fns (already using)
- Lodash (full bundle) - Use individual imports
- Unused icon sets - Tree-shake or remove
- Duplicate dependencies - Check for version conflicts

## Monitoring

After setup:
- Run analysis monthly
- Track size growth in PRs
- Set up CI check for size limits (future)
- Document size optimization wins

## Related
- TECH-011: Remove unused dependencies
- Performance optimization efforts
