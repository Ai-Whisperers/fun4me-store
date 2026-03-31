#!/bin/bash
# =============================================================================
# MIGRATION VALIDATION SCRIPT
# =============================================================================
# Validates that migration numbers are unique and sequential
#
# TICKET: TICKET-DB-001
# =============================================================================

set -e

MIGRATIONS_DIR="$(dirname "$0")/../migrations"
cd "$MIGRATIONS_DIR"

echo "🔍 Validating migration numbers..."
echo ""

# Check 1: Find duplicates
echo "Check 1: Duplicate numbers"
declare -A seen_numbers
duplicates=()
has_duplicates=false

for file in [0-9]*.sql; do
    if [[ -f "$file" ]]; then
        num=$(echo "$file" | grep -oE '^[0-9]+')
        
        if [[ -n "${seen_numbers[$num]}" ]]; then
            if [[ ! " ${duplicates[@]} " =~ " ${num} " ]]; then
                duplicates+=("$num")
            fi
            has_duplicates=true
        fi
        seen_numbers[$num]="$file"
    fi
done

if [[ "$has_duplicates" == "true" ]]; then
    echo "❌ FAIL: Duplicate migration numbers found:"
    for dup in "${duplicates[@]}"; do
        echo "  • Number $dup appears multiple times"
    done
    echo ""
    echo "Run: ./scripts/renumber-migrations.sh"
    exit 1
else
    echo "✅ PASS: All migration numbers are unique"
fi

# Check 2: Gaps in sequence
echo ""
echo "Check 2: Sequential gaps"
numbers=($(ls [0-9]*.sql | grep -oE '^[0-9]+' | sort -n | uniq))
prev=0
gaps=()

for num in "${numbers[@]}"; do
    if [[ $prev -ne 0 ]]; then
        expected=$((prev + 1))
        if [[ $num -ne $expected ]]; then
            gaps+=("Gap between $prev and $num (expected $expected)")
        fi
    fi
    prev=$num
done

if [[ ${#gaps[@]} -gt 0 ]]; then
    echo "⚠️  WARN: Gaps in migration sequence:"
    for gap in "${gaps[@]}"; do
        echo "  • $gap"
    done
    echo ""
    echo "This is not critical but may indicate missing migrations."
else
    echo "✅ PASS: Migration sequence is continuous"
fi

# Check 3: File naming convention
echo ""
echo "Check 3: File naming convention"
invalid_names=()

for file in [0-9]*.sql; do
    if [[ -f "$file" ]]; then
        # Should match: NNN_description.sql
        if ! [[ "$file" =~ ^[0-9]{3}_[a-z0-9_]+\.sql$ ]]; then
            invalid_names+=("$file")
        fi
    fi
done

if [[ ${#invalid_names[@]} -gt 0 ]]; then
    echo "⚠️  WARN: Some files don't follow naming convention (NNN_snake_case.sql):"
    for name in "${invalid_names[@]}"; do
        echo "  • $name"
    done
else
    echo "✅ PASS: All files follow naming convention"
fi

# Summary
echo ""
echo "========================================"
if [[ "$has_duplicates" == "true" ]]; then
    echo "❌ VALIDATION FAILED"
    echo "Fix duplicates and re-run this script."
    exit 1
else
    echo "✅ VALIDATION PASSED"
    echo "Migration numbering is valid."
    exit 0
fi
