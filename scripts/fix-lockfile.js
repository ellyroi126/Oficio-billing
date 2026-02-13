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

console.log('Replacing Apple npm URLs with public npm registry...');
// Replace both artifactory and npm.apple.com URLs
let fixed = lockfile.replace(
  /https:\/\/artifacts\.apple\.com\/artifactory\/api\/npm\/npm-apple\//g,
  'https://registry.npmjs.org/'
);
fixed = fixed.replace(
  /https:\/\/npm\.apple\.com\//g,
  'https://registry.npmjs.org/'
);

const beforeArtifactory = (lockfile.match(/artifactory/g) || []).length;
const beforeApple = (lockfile.match(/npm\.apple\.com/g) || []).length;
const beforeCount = beforeArtifactory + beforeApple;

const afterArtifactory = (fixed.match(/artifactory/g) || []).length;
const afterApple = (fixed.match(/npm\.apple\.com/g) || []).length;
const afterCount = afterArtifactory + afterApple;

console.log(`Before: ${beforeCount} Apple npm references (artifactory: ${beforeArtifactory}, npm.apple.com: ${beforeApple})`);
console.log(`After: ${afterCount} Apple npm references`);

if (beforeCount > 0 && afterCount === 0) {
  fs.writeFileSync(lockfilePath, fixed, 'utf8');
  console.log('✅ Successfully fixed package-lock.json!');
} else if (afterCount > 0) {
  console.log('⚠️  Warning: Some Apple npm references remain');
  fs.writeFileSync(lockfilePath, fixed, 'utf8');
} else {
  console.log('✅ No changes needed - already using public registry');
}
