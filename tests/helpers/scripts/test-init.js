const { execSync } = require('child_process');
const path = require('path');

console.log('Setup Test Environment...');

// 1. Create Schema
require('../setupTestSchema');

// 2. Generate Client
const schemaPath = path.join(__dirname, '../../../prisma/schema.test.prisma');
console.log('Generating Prisma Test Client...');
try {
  // Suppress npm warnings by setting loglevel
  const env = { ...process.env, NPM_CONFIG_LOGLEVEL: 'error' };
  execSync(`npx prisma generate --schema "${schemaPath}"`, { 
    stdio: 'inherit', 
    shell: true,
    env 
  });
} catch (e) {
  console.error('Failed to generate client');
  process.exit(1);
}

// 3. Push DB
console.log('Pushing DB Schema...');
try {
  // Suppress npm warnings by setting loglevel
  const env = { ...process.env, NPM_CONFIG_LOGLEVEL: 'error' };
  execSync(`npx prisma db push --schema "${schemaPath}" --accept-data-loss --skip-generate`, { 
    stdio: 'inherit', 
    shell: true,
    env 
  });
} catch (e) {
  console.error('Failed to push db');
  process.exit(1);
}

console.log('Test Environment Ready.');
