#!/bin/bash
# =============================================================================
# MIGRATION RENUMBERING SCRIPT
# =============================================================================
# Detects and fixes duplicate migration numbers
#
# TICKET: TICKET-DB-001
# =============================================================================

set -e

MIGRATIONS_DIR="$(dirname "$0")/../migrations"
cd "$MIGRATIONS_DIR"

echo "🔍 Scanning for duplicate migration numbers..."

# Find all SQL files and extract numbers
declare -A migration_numbers
duplicates=()

for file in [0-9]*.sql; do
    if [[ -f "$file" ]]; then
        num=$(echo "$file" | grep -oE '^[0-9]+')
        
        if [[ -n "${migration_numbers[$num]}" ]]; then
            # Duplicate found
            if [[ ! " ${duplicates[@]} " =~ " ${num} " ]]; then
                duplicates+=("$num")
            fi
            migration_numbers[$num]="${migration_numbers[$num]},$file"
        else
            migration_numbers[$num]="$file"
        fi
    fi
done

if [[ ${#duplicates[@]} -eq 0 ]]; then
    echo "✅ No duplicate migration numbers found!"
    exit 0
fi

echo ""
echo "❌ DUPLICATE MIGRATION NUMBERS FOUND:"
echo ""

for dup in "${duplicates[@]}"; do
    echo "Number $dup:"
    IFS=',' read -ra files <<< "${migration_numbers[$dup]}"
    for f in "${files[@]}"; do
        echo "  • $f"
    done
    echo ""
done

echo "🔧 Proposed renumbering:"
echo ""

# Find the highest migration number
max_num=0
for num in "${!migration_numbers[@]}"; do
    if [[ $num -gt $max_num ]]; then
        max_num=$num
    fi
done

# Propose new numbers for duplicates (starting after max)
next_num=$((max_num + 1))
rename_map=()

for dup in "${duplicates[@]}"; do
    IFS=',' read -ra files <<< "${migration_numbers[$dup]}"
    
    # Keep first file with original number
    echo "KEEP:   ${files[0]} (number $dup)"
    
    # Renumber the rest
    for (( i=1; i<${#files[@]}; i++ )); do
        old_file="${files[$i]}"
        new_name=$(echo "$old_file" | sed "s/^[0-9]\+/${next_num}/")
        echo "RENAME: $old_file → $new_name"
        rename_map+=("$old_file:$new_name")
        next_num=$((next_num + 1))
    done
    echo ""
done

echo ""
read -p "Apply these changes? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled."
    exit 1
fi

echo ""
echo "🔧 Applying renames..."

for mapping in "${rename_map[@]}"; do
    IFS=':' read -ra parts <<< "$mapping"
    old="${parts[0]}"
    new="${parts[1]}"
    
    if [[ -f "$old" ]]; then
        mv "$old" "$new"
        echo "  ✓ $old → $new"
    fi
done

echo ""
echo "✅ Migration renumbering complete!"
echo ""
echo "Next steps:"
echo "1. Review the changes: ls -1 *.sql | tail -20"
echo "2. Run validation: ./scripts/validate-migration-numbers.sh"
echo "3. Commit: git add migrations/ && git commit -m 'fix: renumber duplicate migrations'"
