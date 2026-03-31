#!/usr/bin/env tsx

/**
 * API Route Auth Migration Script
 * 
 * Migrates API routes from manual authentication to withApiAuth middleware.
 * 
 * Usage:
 *   npm run migrate:auth <file-path> [--dry-run]
 *   
 * Examples:
 *   npm run migrate:auth app/api/billing/invoices/route.ts
 *   npm run migrate:auth app/api/billing/ --dry-run
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

interface MigrationStats {
  filesProcessed: number;
  filesModified: number;
  filesFailed: number;
  linesRemoved: number;
  errors: Array<{ file: string; error: string }>;
}

const stats: MigrationStats = {
  filesProcessed: 0,
  filesModified: 0,
  filesFailed: 0,
  linesRemoved: 0,
  errors: [],
};

/**
 * Detect if file already uses middleware
 */
function usesMiddleware(content: string): boolean {
  return content.includes('withApiAuth') || content.includes('withApiAuthParams');
}

/**
 * Extract role requirements from manual checks
 */
function extractRoles(content: string): string[] | null {
  // Look for patterns like: ['vet', 'admin'].includes(profile.role)
  const rolesMatch = content.match(/\[['"](\w+)['"],\s*['"](\w+)['"]\]\.includes\(profile\.role\)/);
  if (rolesMatch) {
    return [rolesMatch[1], rolesMatch[2]];
  }
  
  // Look for: profile.role !== 'admin'
  const singleRoleMatch = content.match(/profile\.role\s*!==\s*['"](\w+)['"]/);
  if (singleRoleMatch) {
    // Inverted logic - if checking !== 'owner', then roles should be ['vet', 'admin']
    const excludedRole = singleRoleMatch[1];
    if (excludedRole === 'owner') {
      return ['vet', 'admin'];
    }
  }
  
  // Look for: profile.role === 'admin'
  const exactRoleMatch = content.match(/profile\.role\s*===\s*['"](\w+)['"]/);
  if (exactRoleMatch) {
    return [exactRoleMatch[1]];
  }
  
  return null;
}

/**
 * Check if route has dynamic params
 */
function hasDynamicParams(filePath: string): boolean {
  const parts = filePath.split('/');
  return parts.some(part => part.startsWith('[') && part.endsWith(']'));
}

/**
 * Extract param name from file path
 */
function extractParamName(filePath: string): string | null {
  const parts = filePath.split('/');
  const paramPart = parts.find(part => part.startsWith('[') && part.endsWith(']'));
  if (paramPart) {
    return paramPart.slice(1, -1); // Remove [ and ]
  }
  return null;
}

/**
 * Migrate a single file
 */
function migrateFile(filePath: string, dryRun: boolean): boolean {
  stats.filesProcessed++;
  
  console.log(`\n📄 Processing: ${filePath}`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const originalLineCount = content.split('\n').length;
    
    // Skip if already migrated
    if (usesMiddleware(content)) {
      console.log('   ✓ Already using middleware - SKIPPED');
      return false;
    }
    
    // Skip if no manual auth found
    if (!content.includes('createClient') && !content.includes('auth.getUser')) {
      console.log('   ⚠ No authentication code found - SKIPPED');
      return false;
    }
    
    // Extract roles
    const roles = extractRoles(content);
    const roleOption = roles ? `{ roles: ${JSON.stringify(roles)} }` : '';
    
    // Determine middleware type
    const hasParams = hasDynamicParams(filePath);
    const paramName = hasParams ? extractParamName(filePath) : null;
    const middlewareName = hasParams ? 'withApiAuthParams' : 'withApiAuth';
    const paramType = paramName ? `<{ ${paramName}: string }>` : '';
    const contextType = hasParams ? 'ApiHandlerContextWithParams' : 'ApiHandlerContext';
    
    // Build new imports
    let newImports = `import { ${middlewareName}, type ${contextType}`;
    if (hasParams) {
      newImports += paramType;
    }
    newImports += ` } from '@/lib/auth/api-wrapper';`;
    
    // Pattern to match: export async function GET(request: NextRequest)
    const handlerPattern = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\([^)]*\)/;
    const handlerMatch = content.match(handlerPattern);
    
    if (!handlerMatch) {
      console.log('   ❌ Could not find HTTP handler - SKIPPED');
      stats.errors.push({ file: filePath, error: 'No handler found' });
      stats.filesFailed++;
      return false;
    }
    
    const httpMethod = handlerMatch[1];
    
    // Build migration report
    console.log('   → Migration plan:');
    console.log(`     - Middleware: ${middlewareName}${paramType}`);
    if (roles) {
      console.log(`     - Roles: ${roles.join(', ')}`);
    }
    console.log(`     - HTTP Method: ${httpMethod}`);
    
    let newContent = content;
    
    // Step 1: Add middleware import (replace createClient import)
    newContent = newContent.replace(
      /import\s+{\s*createClient\s*}\s+from\s+['"]@\/lib\/supabase\/server['"]/,
      newImports
    );
    
    // Step 2: Remove manual auth boilerplate
    // Remove: const supabase = await createClient()
    newContent = newContent.replace(/const\s+supabase\s*=\s*await\s+createClient\(\)\s*;?\s*\n/g, '');
    
    // Remove: auth.getUser() block
    newContent = newContent.replace(
      /const\s*{\s*data:\s*{\s*user\s*},\s*error:\s*authError\s*}\s*=\s*await\s+supabase\.auth\.getUser\(\)[^}]*}\s*\n\s*if\s*\(authError\s*\|\|\s*!user\)\s*{[^}]*}\s*\n*/gs,
      ''
    );
    
    // Remove: profile fetch block
    newContent = newContent.replace(
      /const\s*{\s*data:\s*profile[^}]*}\s*=\s*await\s+supabase\s*\.from\(['"]profiles['"]\)[^;]*;\s*\n\s*if\s*\(!profile\)\s*{[^}]*}\s*\n*/gs,
      ''
    );
    
    // Remove: role check block
    newContent = newContent.replace(
      /if\s*\(!?\[['"][\w'"]+['"]\]\.includes\(profile\.role\)\)\s*{[^}]*}\s*\n*/gs,
      ''
    );
    newContent = newContent.replace(
      /if\s*\(profile\.role\s*!==\s*['"]admin['"]\)\s*{[^}]*}\s*\n*/gs,
      ''
    );
    
    // Step 3: Wrap handler in middleware
    const handlerStart = `export const ${httpMethod} = ${middlewareName}${paramType}(`;
    const handlerBody = `  async ({ request, profile, user, supabase, log${hasParams ? ', params' : ''} }: ${contextType}${paramType}) => {`;
    
    newContent = newContent.replace(
      new RegExp(`export\\s+async\\s+function\\s+${httpMethod}\\s*\\([^)]*\\)\\s*(:.*?)?\\s*{`),
      `${handlerStart}\n${handlerBody}`
    );
    
    // Add closing for middleware wrapper (at the end of the handler)
    // Find the last closing brace of the handler
    const lines = newContent.split('\n');
    let braceCount = 0;
    let handlerEndIndex = -1;
    let foundHandler = false;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(handlerStart)) {
        foundHandler = true;
      }
      if (foundHandler) {
        braceCount += (lines[i].match(/{/g) || []).length;
        braceCount -= (lines[i].match(/}/g) || []).length;
        
        if (braceCount === 0 && i > 0) {
          handlerEndIndex = i;
          break;
        }
      }
    }
    
    if (handlerEndIndex !== -1) {
      lines[handlerEndIndex] = lines[handlerEndIndex] + (roleOption ? `,\n  ${roleOption}` : '') + '\n);';
      newContent = lines.join('\n');
    }
    
    const newLineCount = newContent.split('\n').length;
    const linesRemoved = originalLineCount - newLineCount;
    stats.linesRemoved += linesRemoved;
    
    console.log(`   ✅ Migration complete: ${linesRemoved} lines removed`);
    
    if (!dryRun) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      stats.filesModified++;
    } else {
      console.log('   ⚠ DRY RUN - No changes written');
    }
    
    return true;
    
  } catch (error) {
    console.error(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    stats.errors.push({ 
      file: filePath, 
      error: error instanceof Error ? error.message : String(error) 
    });
    stats.filesFailed++;
    return false;
  }
}

/**
 * Main migration function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const targetPath = args.find(arg => !arg.startsWith('--'));
  
  if (!targetPath) {
    console.error('❌ Usage: npm run migrate:auth <file-or-directory> [--dry-run]');
    process.exit(1);
  }
  
  console.log('🚀 API Auth Migration Script');
  console.log(`   Target: ${targetPath}`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);
  
  // Determine if target is file or directory
  const fullPath = path.join(process.cwd(), targetPath);
  const stat = fs.statSync(fullPath);
  
  let files: string[] = [];
  
  if (stat.isDirectory()) {
    // Find all route.ts files in directory
    files = glob.sync(`${targetPath}/**/route.ts`);
  } else if (stat.isFile() && targetPath.endsWith('.ts')) {
    files = [targetPath];
  } else {
    console.error('❌ Target must be a .ts file or directory');
    process.exit(1);
  }
  
  console.log(`📂 Found ${files.length} route file(s)\n`);
  
  // Process each file
  for (const file of files) {
    migrateFile(file, dryRun);
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`Files Processed:  ${stats.filesProcessed}`);
  console.log(`Files Modified:   ${stats.filesModified}`);
  console.log(`Files Failed:     ${stats.filesFailed}`);
  console.log(`Lines Removed:    ${stats.linesRemoved}`);
  
  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach(({ file, error }) => {
      console.log(`   ${file}: ${error}`);
    });
  }
  
  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No files were modified');
    console.log('   Run without --dry-run to apply changes');
  }
  
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
