/**
 * Migrate Hardcoded Tenant IDs to Constants
 * 
 * Finds and replaces hardcoded 'terrapet' and 'petlife' strings with
 * centralized constants from lib/constants/tenants.ts
 * 
 * Usage:
 *   npx tsx scripts/migrate-tenant-constants.ts --dry-run  # Preview changes
 *   npx tsx scripts/migrate-tenant-constants.ts            # Apply changes
 */

import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

interface Replacement {
  pattern: RegExp;
  replacement: string;
  description: string;
}

interface FileChange {
  file: string;
  changes: Array<{
    line: number;
    old: string;
    new: string;
  }>;
}

/**
 * Replacement patterns for different contexts
 */
const REPLACEMENTS: Replacement[] = [
  // tenant_id: 'terrapet' => tenant_id: TENANT_IDS.ADRIS
  {
    pattern: /tenant_id:\s*['"]terrapet['"]/g,
    replacement: "tenant_id: TENANT_IDS.ADRIS",
    description: "tenant_id property assignment",
  },
  {
    pattern: /tenant_id:\s*['"]petlife['"]/g,
    replacement: "tenant_id: TENANT_IDS.PETLIFE",
    description: "tenant_id property assignment",
  },
  
  // .eq('tenant_id', 'terrapet') => .eq('tenant_id', TENANT_IDS.ADRIS)
  {
    pattern: /\.eq\(['"]tenant_id['"],\s*['"]terrapet['"]\)/g,
    replacement: ".eq('tenant_id', TENANT_IDS.ADRIS)",
    description: "Supabase .eq() filter",
  },
  {
    pattern: /\.eq\(['"]tenant_id['"],\s*['"]petlife['"]\)/g,
    replacement: ".eq('tenant_id', TENANT_IDS.PETLIFE)",
    description: "Supabase .eq() filter",
  },
  
  // "tenant_id": "terrapet" (JSON format) => "tenant_id": TENANT_IDS.ADRIS
  // Note: This is for TypeScript/JavaScript, not actual JSON files
  {
    pattern: /"tenant_id":\s*"terrapet"/g,
    replacement: '"tenant_id": TENANT_IDS.ADRIS',
    description: "JSON-style object property",
  },
  {
    pattern: /"tenant_id":\s*"petlife"/g,
    replacement: '"tenant_id": TENANT_IDS.PETLIFE',
    description: "JSON-style object property",
  },
];

/**
 * Files to process (TypeScript and test files only, exclude JSON data files)
 */
const FILE_PATTERNS = [
  'tests/**/*.ts',
  'tests/**/*.tsx',
  'lib/test-utils/**/*.ts',
  'db/seeds/scripts/**/*.ts',
];

/**
 * Files/directories to exclude
 */
const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/.content_data/**', // Don't touch actual JSON config files
  '**/db/seeds/data/**/*.json', // Don't touch JSON seed data
];

/**
 * Check if a file should be processed
 */
function shouldProcessFile(filePath: string): boolean {
  // Check exclusions
  for (const exclude of EXCLUDE_PATTERNS) {
    if (filePath.includes(exclude.replace(/\*\*/g, ''))) {
      return false;
    }
  }
  
  // Must be TypeScript file
  return filePath.endsWith('.ts') || filePath.endsWith('.tsx');
}

/**
 * Check if file already has tenant constants imported
 */
function hasTenantsImport(content: string): boolean {
  return content.includes("from '@/lib/constants/tenants'") ||
         content.includes('from "../lib/constants/tenants"') ||
         content.includes('from "../../lib/constants/tenants"');
}

/**
 * Add import statement if needed
 */
function ensureImport(content: string, filePath: string): string {
  if (hasTenantsImport(content)) {
    return content; // Already has import
  }
  
  // Check if file needs TENANT_IDS
  if (!content.includes('TENANT_IDS.')) {
    return content; // No constants used, no import needed
  }
  
  // Find insertion point (after existing imports)
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^import .* from/)) {
      lastImportIndex = i;
    }
  }
  
  const importStatement = "import { TENANT_IDS } from '@/lib/constants/tenants';";
  
  if (lastImportIndex >= 0) {
    // Insert after last import
    lines.splice(lastImportIndex + 1, 0, importStatement);
  } else {
    // No imports found, add at top after any comments/pragmas
    let insertIndex = 0;
    while (insertIndex < lines.length && 
           (lines[insertIndex].startsWith('//') || 
            lines[insertIndex].startsWith('/*') ||
            lines[insertIndex].startsWith('*') ||
            lines[insertIndex].trim() === '')) {
      insertIndex++;
    }
    lines.splice(insertIndex, 0, importStatement, '');
  }
  
  return lines.join('\n');
}

/**
 * Process a single file
 */
function processFile(filePath: string): FileChange | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  let newContent = content;
  const changes: FileChange['changes'] = [];
  
  // Apply all replacement patterns
  for (const { pattern, replacement, description } of REPLACEMENTS) {
    const matches = content.matchAll(pattern);
    
    for (const match of matches) {
      if (match.index !== undefined) {
        // Find line number
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;
        
        changes.push({
          line: lineNumber,
          old: match[0],
          new: replacement,
        });
      }
    }
    
    newContent = newContent.replace(pattern, replacement);
  }
  
  if (changes.length === 0) {
    return null; // No changes needed
  }
  
  // Add import if needed
  newContent = ensureImport(newContent, filePath);
  
  if (!DRY_RUN) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }
  
  return {
    file: filePath,
    changes,
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Scanning for hardcoded tenant IDs...\n');
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No files will be modified\n');
  }
  
  // Collect all files to process
  const allFiles = new Set<string>();
  for (const pattern of FILE_PATTERNS) {
    const files = globSync(pattern, { cwd: process.cwd() });
    files.forEach(file => allFiles.add(file));
  }
  
  const filesToProcess = Array.from(allFiles).filter(shouldProcessFile);
  
  console.log(`Found ${filesToProcess.length} files to scan\n`);
  
  // Process each file
  const fileChanges: FileChange[] = [];
  let totalChanges = 0;
  
  for (const file of filesToProcess) {
    const changes = processFile(file);
    if (changes) {
      fileChanges.push(changes);
      totalChanges += changes.changes.length;
    }
  }
  
  // Report results
  console.log('═'.repeat(70));
  console.log('MIGRATION RESULTS');
  console.log('═'.repeat(70));
  console.log('');
  
  if (fileChanges.length === 0) {
    console.log('✅ No hardcoded tenant IDs found!');
    console.log('');
    return;
  }
  
  console.log(`📝 Files to modify: ${fileChanges.length}`);
  console.log(`🔄 Total replacements: ${totalChanges}`);
  console.log('');
  
  // Show detailed changes
  for (const { file, changes } of fileChanges) {
    console.log(`📄 ${file}`);
    console.log(`   ${changes.length} change(s):`);
    
    if (VERBOSE) {
      for (const change of changes) {
        console.log(`   Line ${change.line}:`);
        console.log(`     - ${change.old}`);
        console.log(`     + ${change.new}`);
      }
    }
    
    console.log('');
  }
  
  console.log('─'.repeat(70));
  
  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN. Run without --dry-run to apply changes.');
    console.log('💡 Add --verbose to see line-by-line changes.');
  } else {
    console.log('\n✅ Migration complete!');
    console.log('📌 Next steps:');
    console.log('   1. Review changes: git diff');
    console.log('   2. Run tests: npm test');
    console.log('   3. Fix any import paths if needed');
    console.log('   4. Commit changes');
  }
}

main().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
