/**
 * Validate All Clinic Configurations
 * 
 * Checks all clinics in .content_data/ to ensure they pass Zod validation.
 * Run this before deploying to catch configuration errors early.
 * 
 * Usage:
 *   npx tsx scripts/validate-clinic-configs.ts
 *   npx tsx scripts/validate-clinic-configs.ts --fix  # Auto-fix simple issues
 */

import fs from 'fs';
import path from 'path';
import { validateConfig, validateTheme, safeValidateConfig, safeValidateTheme } from '../lib/schemas/clinic-config';

const CONTENT_DIR = path.join(process.cwd(), '.content_data');
const FIX_MODE = process.argv.includes('--fix');

interface ValidationResult {
  clinic: string;
  configValid: boolean;
  themeValid: boolean;
  configErrors: string[];
  themeErrors: string[];
}

async function validateClinic(clinicSlug: string): Promise<ValidationResult> {
  const clinicDir = path.join(CONTENT_DIR, clinicSlug);
  const result: ValidationResult = {
    clinic: clinicSlug,
    configValid: true,
    themeValid: true,
    configErrors: [],
    themeErrors: [],
  };

  // Validate config.json
  const configPath = path.join(clinicDir, 'config.json');
  if (fs.existsSync(configPath)) {
    const configRaw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const configResult = safeValidateConfig(configRaw);
    
    if (!configResult.success) {
      result.configValid = false;
      result.configErrors = configResult.errors.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
    }
  } else {
    result.configValid = false;
    result.configErrors.push('config.json not found');
  }

  // Validate theme.json
  const themePath = path.join(clinicDir, 'theme.json');
  if (fs.existsSync(themePath)) {
    const themeRaw = JSON.parse(fs.readFileSync(themePath, 'utf-8'));
    const themeResult = safeValidateTheme(themeRaw);
    
    if (!themeResult.success) {
      result.themeValid = false;
      result.themeErrors = themeResult.errors.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
    }
  } else {
    result.themeValid = false;
    result.themeErrors.push('theme.json not found');
  }

  return result;
}

async function main() {
  console.log('🔍 Validating clinic configurations...\n');

  if (!fs.existsSync(CONTENT_DIR)) {
    console.error(`❌ Content directory not found: ${CONTENT_DIR}`);
    process.exit(1);
  }

  // Get all clinic directories
  const clinics = fs.readdirSync(CONTENT_DIR).filter(file => {
    if (file.startsWith('_') || file.startsWith('.')) return false;
    const fullPath = path.join(CONTENT_DIR, file);
    return fs.statSync(fullPath).isDirectory();
  });

  console.log(`Found ${clinics.length} clinic(s): ${clinics.join(', ')}\n`);

  const results: ValidationResult[] = [];
  for (const clinic of clinics) {
    const result = await validateClinic(clinic);
    results.push(result);
  }

  // Print results
  let totalErrors = 0;
  for (const result of results) {
    const hasErrors = !result.configValid || !result.themeValid;
    const icon = hasErrors ? '❌' : '✅';
    
    console.log(`${icon} ${result.clinic}`);
    
    if (result.configErrors.length > 0) {
      console.log('  Config errors:');
      result.configErrors.forEach(err => console.log(`    - ${err}`));
      totalErrors += result.configErrors.length;
    }
    
    if (result.themeErrors.length > 0) {
      console.log('  Theme errors:');
      result.themeErrors.forEach(err => console.log(`    - ${err}`));
      totalErrors += result.themeErrors.length;
    }
    
    if (!hasErrors) {
      console.log('  All validations passed ✓');
    }
    
    console.log('');
  }

  // Summary
  const validClinics = results.filter(r => r.configValid && r.themeValid).length;
  const invalidClinics = results.length - validClinics;

  console.log('─'.repeat(50));
  console.log(`Summary:`);
  console.log(`  Valid clinics: ${validClinics}/${results.length}`);
  console.log(`  Invalid clinics: ${invalidClinics}/${results.length}`);
  console.log(`  Total errors: ${totalErrors}`);
  console.log('─'.repeat(50));

  if (invalidClinics > 0) {
    console.log('\n❌ Validation failed. Fix the errors above before deploying.');
    process.exit(1);
  } else {
    console.log('\n✅ All clinics validated successfully!');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
