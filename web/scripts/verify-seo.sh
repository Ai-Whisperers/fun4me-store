#!/bin/bash

# SEO Verification Script
# Checks if all public-facing pages have metadata implementation

echo "========================================="
echo "SEO Metadata Verification"
echo "========================================="
echo ""

# Find all public page files (excluding portal and dashboard)
PUBLIC_PAGES=$(find app/[clinic] -name "page.tsx" -type f | grep -v "portal" | grep -v "dashboard")

echo "Checking public pages for generateMetadata function..."
echo ""

TOTAL=0
WITH_METADATA=0
WITHOUT_METADATA=()

for page in $PUBLIC_PAGES; do
  TOTAL=$((TOTAL + 1))
  if grep -q "generateMetadata" "$page"; then
    echo "✅ $page"
    WITH_METADATA=$((WITH_METADATA + 1))
  else
    # Check if it's the homepage (handled by layout)
    if [[ "$page" == "app/[clinic]/page.tsx" ]]; then
      echo "✅ $page (handled by layout.tsx)"
      WITH_METADATA=$((WITH_METADATA + 1))
    else
      echo "❌ $page - MISSING METADATA"
      WITHOUT_METADATA+=("$page")
    fi
  fi
done

echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo "Total public pages: $TOTAL"
echo "Pages with metadata: $WITH_METADATA"
echo "Coverage: $(( WITH_METADATA * 100 / TOTAL ))%"
echo ""

if [ ${#WITHOUT_METADATA[@]} -gt 0 ]; then
  echo "Pages missing metadata:"
  for page in "${WITHOUT_METADATA[@]}"; do
    echo "  - $page"
  done
  exit 1
else
  echo "✅ All public pages have metadata!"
  exit 0
fi
