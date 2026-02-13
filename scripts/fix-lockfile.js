#!/usr/bin/env node

/**
 * Fix package-lock.json to use public npm registry
 *
 * This script replaces all Apple artifactory URLs with the public npm registry
 */

const fs = require('fs');
const path = require('path');

const lockfilePath = path.join(__dirname, '..', 'package-lock.json');

console.log('Reading package-lock.json...');
const lockfile = fs.readFileSync(lockfilePath, 'utf8');

console.log('Replacing artifactory URLs with public npm registry...');
const fixed = lockfile.replace(
  /https:\/\/artifacts\.apple\.com\/artifactory\/api\/npm\/npm-apple\//g,
  'https://registry.npmjs.org/'
);

const beforeCount = (lockfile.match(/artifactory/g) || []).length;
const afterCount = (fixed.match(/artifactory/g) || []).length;

console.log(`Before: ${beforeCount} artifactory references`);
console.log(`After: ${afterCount} artifactory references`);

if (beforeCount > 0 && afterCount === 0) {
  fs.writeFileSync(lockfilePath, fixed, 'utf8');
  console.log('✅ Successfully fixed package-lock.json!');
} else if (afterCount > 0) {
  console.log('⚠️  Warning: Some artifactory references remain');
  fs.writeFileSync(lockfilePath, fixed, 'utf8');
} else {
  console.log('✅ No changes needed - already using public registry');
}
