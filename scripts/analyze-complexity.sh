#!/bin/bash
# Code Complexity Analysis Script

echo "=== VETE CODEBASE ANALYSIS ==="
echo ""
echo "Analyzing code complexity and metrics..."
echo ""

# Navigate to web directory
cd "$(dirname "$0")/../web" || exit

# Create output directory
mkdir -p ../metrics

# 1. Count lines of code
echo "📊 Lines of Code Analysis..."
npx cloc app/ lib/ components/ --json --out=../metrics/cloc-report.json
npx cloc app/ lib/ components/ --by-file --quiet > ../metrics/cloc-by-file.txt

# 2. Circular dependencies
echo ""
echo "🔄 Checking for circular dependencies..."
npx madge --circular --extensions ts,tsx app/ lib/ components/ > ../metrics/circular-deps.txt

# 3. Component complexity
echo ""
echo "📦 Component Analysis..."
find components -name "*.tsx" -exec wc -l {} \; | sort -rn | head -20 > ../metrics/largest-components.txt

# 4. API route complexity
echo ""
echo "🌐 API Route Analysis..."
find app/api -name "route.ts" -exec wc -l {} \; | sort -rn | head -20 > ../metrics/largest-routes.txt

# 5. Dependency count
echo ""
echo "📚 Dependency Analysis..."
cat package.json | grep -A 200 '"dependencies"' | grep '":' | wc -l > ../metrics/dependency-count.txt

# 6. Test coverage summary
echo ""
echo "🧪 Test File Count..."
find . -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" | wc -l > ../metrics/test-count.txt

echo ""
echo "✅ Analysis complete! Results saved to metrics/"
echo ""
echo "Summary:"
echo "--------"
cat ../metrics/cloc-by-file.txt | tail -5
