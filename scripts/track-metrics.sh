#!/bin/bash
# Metric Tracking Script - Vete Refactoring Project
# Compares current metrics against baseline to track progress

SCRIPT_DIR="$(dirname "$0")"
METRICS_DIR="$SCRIPT_DIR/../metrics"
BASELINE_DIR="$METRICS_DIR/baseline"
HISTORY_DIR="$METRICS_DIR/history"
DATE=$(date +%Y-%m-%d)
REPORT_FILE="$METRICS_DIR/progress-report-$DATE.md"

echo "=== VETE REFACTORING PROGRESS TRACKER ==="
echo ""
echo "Analyzing current state vs baseline..."
echo ""

# Create history directory if doesn't exist
mkdir -p "$HISTORY_DIR"

# Run fresh analysis
cd "$SCRIPT_DIR"
./analyze-complexity.sh > /dev/null 2>&1

# Load baseline values
BASELINE_LOC=$(cat "$BASELINE_DIR/total-loc.txt" 2>/dev/null || echo "254573")
BASELINE_ROUTES=$(cat "$BASELINE_DIR/route-count.txt" 2>/dev/null || echo "309")
BASELINE_AVG_ROUTE=$(cat "$BASELINE_DIR/avg-route-size.txt" 2>/dev/null || echo "181")

# Calculate current values
cd "$SCRIPT_DIR/../web"

# Current LOC
CURRENT_LOC=$(cat "$METRICS_DIR/cloc-report.json" | grep -A 1 '"SUM"' | grep '"code"' | grep -o '[0-9]*' | head -1)
if [ -z "$CURRENT_LOC" ]; then
    CURRENT_LOC=$BASELINE_LOC
fi

# Current route count
CURRENT_ROUTES=$(find app/api -name "route.ts" 2>/dev/null | wc -l)

# Current avg route size
CURRENT_AVG_ROUTE=$(find app/api -name "route.ts" -exec wc -l {} \; 2>/dev/null | awk '{sum+=$1; count++} END {if(count>0) printf "%.0f", sum/count; else print "0"}')

# Current component count
CURRENT_COMPONENTS=$(find components -name "*.tsx" 2>/dev/null | wc -l)

# Current god components (>500 lines)
CURRENT_GOD_COMPONENTS=$(find components -name "*.tsx" -exec wc -l {} \; 2>/dev/null | awk '{if($1>500) count++} END {print count+0}')

# Current god routes (>400 lines)
CURRENT_GOD_ROUTES=$(find app/api -name "route.ts" -exec wc -l {} \; 2>/dev/null | awk '{if($1>400) count++} END {print count+0}')

# Current dependencies
CURRENT_DEPS=$(cat package.json 2>/dev/null | grep -A 200 '"dependencies"' | grep '":' | wc -l)

# Current test count
CURRENT_TESTS=$(find . -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" 2>/dev/null | wc -l)

# Calculate deltas
DELTA_LOC=$((CURRENT_LOC - BASELINE_LOC))
DELTA_ROUTES=$((CURRENT_ROUTES - BASELINE_ROUTES))
DELTA_AVG_ROUTE=$((CURRENT_AVG_ROUTE - BASELINE_AVG_ROUTE))

# Calculate percentages
if [ $BASELINE_LOC -ne 0 ]; then
    PERCENT_LOC=$(awk "BEGIN {printf \"%.1f\", ($DELTA_LOC / $BASELINE_LOC) * 100}")
else
    PERCENT_LOC="0.0"
fi

if [ $BASELINE_ROUTES -ne 0 ]; then
    PERCENT_ROUTES=$(awk "BEGIN {printf \"%.1f\", ($DELTA_ROUTES / $BASELINE_ROUTES) * 100}")
else
    PERCENT_ROUTES="0.0"
fi

if [ $BASELINE_AVG_ROUTE -ne 0 ]; then
    PERCENT_AVG_ROUTE=$(awk "BEGIN {printf \"%.1f\", ($DELTA_AVG_ROUTE / $BASELINE_AVG_ROUTE) * 100}")
else
    PERCENT_AVG_ROUTE="0.0"
fi

# Generate markdown report
cat > "$REPORT_FILE" << EOF
# Vete Refactoring - Progress Report

**Date**: $DATE  
**Baseline**: January 15, 2026  
**Phase**: [Current phase - update manually]  

---

## Summary

| Metric | Baseline | Current | Change | % Change | Target | Status |
|--------|----------|---------|--------|----------|--------|--------|
| **Total LOC** | $BASELINE_LOC | $CURRENT_LOC | $DELTA_LOC | ${PERCENT_LOC}% | 230,000 | $(if [ $CURRENT_LOC -lt 240000 ]; then echo "✅"; else echo "🟡"; fi) |
| **API Routes** | $BASELINE_ROUTES | $CURRENT_ROUTES | $DELTA_ROUTES | ${PERCENT_ROUTES}% | < 250 | $(if [ $CURRENT_ROUTES -lt 280 ]; then echo "✅"; else echo "🟡"; fi) |
| **Avg Route Size** | $BASELINE_AVG_ROUTE | $CURRENT_AVG_ROUTE | $DELTA_AVG_ROUTE | ${PERCENT_AVG_ROUTE}% | < 100 | $(if [ $CURRENT_AVG_ROUTE -lt 150 ]; then echo "✅"; elif [ $CURRENT_AVG_ROUTE -lt 181 ]; then echo "🟡"; else echo "🔴"; fi) |
| **Components** | 476 | $CURRENT_COMPONENTS | $((CURRENT_COMPONENTS - 476)) | - | ~550 | 🟡 |
| **God Components** | 14 | $CURRENT_GOD_COMPONENTS | $((CURRENT_GOD_COMPONENTS - 14)) | - | 0 | $(if [ $CURRENT_GOD_COMPONENTS -eq 0 ]; then echo "✅"; elif [ $CURRENT_GOD_COMPONENTS -lt 10 ]; then echo "🟡"; else echo "🔴"; fi) |
| **God Routes** | 13 | $CURRENT_GOD_ROUTES | $((CURRENT_GOD_ROUTES - 13)) | - | 0 | $(if [ $CURRENT_GOD_ROUTES -eq 0 ]; then echo "✅"; elif [ $CURRENT_GOD_ROUTES -lt 10 ]; then echo "🟡"; else echo "🔴"; fi) |
| **Dependencies** | 103 | $CURRENT_DEPS | $((CURRENT_DEPS - 103)) | - | < 70 | $(if [ $CURRENT_DEPS -lt 90 ]; then echo "✅"; elif [ $CURRENT_DEPS -lt 103 ]; then echo "🟡"; else echo "🔴"; fi) |
| **Test Files** | 707 | $CURRENT_TESTS | $((CURRENT_TESTS - 707)) | - | ~850 | $(if [ $CURRENT_TESTS -gt 800 ]; then echo "✅"; elif [ $CURRENT_TESTS -gt 707 ]; then echo "🟡"; else echo "🔴"; fi) |

---

## Key Metrics

### Code Volume

**Total Lines of Code**: $CURRENT_LOC  
**Change from Baseline**: $DELTA_LOC lines (${PERCENT_LOC}%)  
**Trend**: $(if [ $DELTA_LOC -lt 0 ]; then echo "✅ Decreasing (good - dead code removal)"; elif [ $DELTA_LOC -eq 0 ]; then echo "🟡 No change"; else echo "⚠️  Increasing (expected during refactoring)"; fi)

### API Routes

**Total Routes**: $CURRENT_ROUTES  
**Average Size**: $CURRENT_AVG_ROUTE lines  
**Change from Baseline**: $DELTA_AVG_ROUTE lines (${PERCENT_AVG_ROUTE}%)  
**God Routes (>400 lines)**: $CURRENT_GOD_ROUTES  
**Trend**: $(if [ $CURRENT_AVG_ROUTE -lt $BASELINE_AVG_ROUTE ]; then echo "✅ Improving"; elif [ $CURRENT_AVG_ROUTE -eq $BASELINE_AVG_ROUTE ]; then echo "🟡 No change"; else echo "⚠️  Worsening"; fi)

### Components

**Total Components**: $CURRENT_COMPONENTS  
**God Components (>500 lines)**: $CURRENT_GOD_COMPONENTS  
**Trend**: $(if [ $CURRENT_GOD_COMPONENTS -lt 14 ]; then echo "✅ Improving"; elif [ $CURRENT_GOD_COMPONENTS -eq 14 ]; then echo "🟡 No change"; else echo "⚠️  Worsening"; fi)

### Dependencies

**Production Dependencies**: $CURRENT_DEPS  
**Trend**: $(if [ $CURRENT_DEPS -lt 103 ]; then echo "✅ Decreasing"; elif [ $CURRENT_DEPS -eq 103 ]; then echo "🟡 No change"; else echo "⚠️  Increasing"; fi)

### Test Coverage

**Test Files**: $CURRENT_TESTS  
**Trend**: $(if [ $CURRENT_TESTS -gt 707 ]; then echo "✅ Increasing"; elif [ $CURRENT_TESTS -eq 707 ]; then echo "🟡 No change"; else echo "⚠️  Decreasing"; fi)

---

## Top 10 Largest Components

\`\`\`
$(head -10 "$METRICS_DIR/largest-components.txt")
\`\`\`

---

## Top 10 Largest API Routes

\`\`\`
$(head -10 "$METRICS_DIR/largest-routes.txt")
\`\`\`

---

## Circular Dependencies

\`\`\`
$(cat "$METRICS_DIR/circular-deps.txt")
\`\`\`

---

## Observations

[Add manual observations here after reviewing the data]

**What improved**:
- 

**What needs attention**:
- 

**Blockers**:
- 

---

## Next Week Focus

[Update manually with next week's priorities]

1. 
2. 
3. 

---

## Notes

- Automated report generated by \`./scripts/track-metrics.sh\`
- Baseline established: January 15, 2026
- See \`BASELINE_METRICS.md\` for detailed targets
- Previous reports: \`metrics/history/\`

EOF

# Save snapshot to history
cp "$REPORT_FILE" "$HISTORY_DIR/progress-$DATE.md"

# Display report
echo "✅ Analysis complete!"
echo ""
cat "$REPORT_FILE"
echo ""
echo "📁 Report saved to: $REPORT_FILE"
echo "📁 Historical snapshot: $HISTORY_DIR/progress-$DATE.md"
echo ""
