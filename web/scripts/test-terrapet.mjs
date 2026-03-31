#!/usr/bin/env node

/**
 * Test script to verify Terra Pet configuration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.join(__dirname, '..', '.content_data', 'terrapet');

console.log('🧪 Testing Terra Pet Configuration...\n');

// Test 1: Check if directory exists
console.log('1️⃣ Checking content directory...');
if (!fs.existsSync(CONTENT_DIR)) {
  console.error('❌ Terra Pet content directory not found!');
  process.exit(1);
}
console.log('✅ Content directory exists');

// Test 2: Check required files
console.log('\n2️⃣ Checking required files...');
const requiredFiles = [
  'config.json',
  'theme.json',
  'home.json',
  'services.json',
  'about.json',
  'images.json',
  'faq.json'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  const filePath = path.join(CONTENT_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing: ${file}`);
    allFilesExist = false;
  } else {
    console.log(`✅ ${file}`);
  }
}

if (!allFilesExist) {
  console.error('\n❌ Some required files are missing!');
  process.exit(1);
}

// Test 3: Validate JSON files
console.log('\n3️⃣ Validating JSON syntax...');
for (const file of requiredFiles) {
  const filePath = path.join(CONTENT_DIR, file);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    JSON.parse(content);
    console.log(`✅ ${file} - valid JSON`);
  } catch (error) {
    console.error(`❌ ${file} - invalid JSON:`, error.message);
    process.exit(1);
  }
}

// Test 4: Check config values
console.log('\n4️⃣ Checking configuration values...');
const configPath = path.join(CONTENT_DIR, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

console.log('   Clinic ID:', config.id);
console.log('   Clinic Name:', config.name);
console.log('   Contact Email:', config.contact.email);
console.log('   Phone:', config.contact.phone_display);
console.log('   Address:', config.contact.address);

if (config.id !== 'terrapet') {
  console.error('❌ Config ID should be "terrapet"');
  process.exit(1);
}
if (!config.name || config.name === 'Template Clinic') {
  console.error('❌ Clinic name not configured');
  process.exit(1);
}

console.log('✅ Configuration values look good');

// Test 5: Check theme colors
console.log('\n5️⃣ Checking theme colors...');
const themePath = path.join(CONTENT_DIR, 'theme.json');
const theme = JSON.parse(fs.readFileSync(themePath, 'utf-8'));

console.log('   Primary Color:', theme.colors.primary.main);
console.log('   Secondary Color:', theme.colors.secondary.main);
console.log('   Accent Color:', theme.colors.accent);

if (theme.colors.primary.main === '#3B82F6') {
  console.warn('⚠️  Theme still using template blue color - consider customizing');
} else {
  console.log('✅ Custom theme colors configured');
}

// Test 6: Check services
console.log('\n6️⃣ Checking services...');
const servicesPath = path.join(CONTENT_DIR, 'services.json');
const services = JSON.parse(fs.readFileSync(servicesPath, 'utf-8'));

console.log(`   Services configured: ${services.services.length}`);
services.services.forEach((service, index) => {
  console.log(`   ${index + 1}. ${service.title}`);
});

if (services.services.length === 0) {
  console.error('❌ No services configured');
  process.exit(1);
}

console.log('✅ Services configured');

// Final summary
console.log('\n' + '='.repeat(50));
console.log('✅ All Terra Pet configuration tests passed!');
console.log('='.repeat(50));
console.log('\n📝 Next steps:');
console.log('   1. Start dev server: npm run dev');
console.log('   2. Visit: http://localhost:3000/terrapet');
console.log('   3. Verify tenant in database');
console.log('   4. Test login and booking flows');
console.log('\n');
