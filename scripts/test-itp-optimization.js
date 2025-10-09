#!/usr/bin/env node
/**
 * ITP Query Optimization Validation Script
 * Tests the optimized ITP query implementation
 *
 * Usage: node scripts/test-itp-optimization.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 ITP Query Optimization Validation\n');

// Test 1: Verify backup file exists
console.log('✓ Test 1: Backup file validation');
const backupPath = path.join(__dirname, '../apps/web/src/app/api/projects/[projectId]/lots/[lotId]/itp/route.ts.backup');
if (fs.existsSync(backupPath)) {
  console.log('  ✅ Backup file exists');
  const backupStats = fs.statSync(backupPath);
  console.log(`  📁 Size: ${backupStats.size} bytes`);
} else {
  console.log('  ❌ Backup file not found!');
  process.exit(1);
}

// Test 2: Verify optimized file has correct structure
console.log('\n✓ Test 2: Optimized query structure');
const routePath = path.join(__dirname, '../apps/web/src/app/api/projects/[projectId]/lots/[lotId]/itp/route.ts');
const routeContent = fs.readFileSync(routePath, 'utf8');

const tests = [
  {
    name: 'Single query with template JOIN',
    pattern: /itp_templates\s*\(/,
    expected: true,
    description: 'Should include itp_templates in select'
  },
  {
    name: 'RLS compliance with projects join',
    pattern: /projects!inner/,
    expected: true,
    description: 'Should include projects!inner for RLS'
  },
  {
    name: 'Soft-delete filtering',
    pattern: /\.is\(['"]deleted_at['"],\s*null\)/,
    expected: true,
    description: 'Should filter deleted_at IS NULL'
  },
  {
    name: 'No separate template fetch',
    pattern: /\.from\(['"]itp_templates['"]\)\.select\(/,
    expected: false,
    description: 'Should NOT have separate template query'
  },
  {
    name: 'No client-side mapping',
    pattern: /templateMap\.get\(/,
    expected: false,
    description: 'Should NOT have template mapping'
  },
  {
    name: 'Optimization comment',
    pattern: /OPTIMIZED.*Single query/,
    expected: true,
    description: 'Should have optimization comment'
  }
];

let passed = 0;
let failed = 0;

tests.forEach(test => {
  const matches = test.pattern.test(routeContent);
  const success = matches === test.expected;

  if (success) {
    console.log(`  ✅ ${test.name}`);
    console.log(`     ${test.description}`);
    passed++;
  } else {
    console.log(`  ❌ ${test.name}`);
    console.log(`     ${test.description}`);
    console.log(`     Expected: ${test.expected}, Got: ${matches}`);
    failed++;
  }
});

// Test 3: Compare file sizes
console.log('\n✓ Test 3: Code size comparison');
const backupSize = fs.statSync(backupPath).size;
const optimizedSize = fs.statSync(routePath).size;
const reduction = backupSize - optimizedSize;
const reductionPercent = ((reduction / backupSize) * 100).toFixed(1);

console.log(`  📊 Original: ${backupSize} bytes`);
console.log(`  📊 Optimized: ${optimizedSize} bytes`);
console.log(`  📊 Reduction: ${reduction} bytes (${reductionPercent}%)`);

if (reduction > 0) {
  console.log(`  ✅ Code is ${reductionPercent}% smaller (removed N+1 pattern)`);
} else {
  console.log(`  ℹ️  Code size similar (slight increase for explicit JOIN)`);
}

// Test 4: Verify query line count reduction
console.log('\n✓ Test 4: Query complexity');
const backupContent = fs.readFileSync(backupPath, 'utf8');
const backupLines = backupContent.split('\n').length;
const optimizedLines = routeContent.split('\n').length;

console.log(`  📊 Original: ${backupLines} lines`);
console.log(`  📊 Optimized: ${optimizedLines} lines`);
console.log(`  📊 Reduction: ${backupLines - optimizedLines} lines`);

if (optimizedLines < backupLines) {
  console.log(`  ✅ Simplified by ${backupLines - optimizedLines} lines`);
} else {
  console.log(`  ℹ️  Line count similar`);
}

// Test 5: Verify template fields in select
console.log('\n✓ Test 5: Template field selection');
const templateFieldsPattern = /itp_templates\s*\(\s*id,\s*name,\s*description,\s*category,\s*structure,\s*is_active,\s*version\s*\)/;
if (templateFieldsPattern.test(routeContent)) {
  console.log('  ✅ All required template fields included');
  console.log('     Fields: id, name, description, category, structure, is_active, version');
} else {
  console.log('  ❌ Template fields may be incomplete');
  failed++;
}

// Test 6: Migration file validation
console.log('\n✓ Test 6: Migration file validation');
const migrationPath = path.join(__dirname, '../packages/database/migrations/0023_optimize_itp_queries.sql');
if (fs.existsSync(migrationPath)) {
  const migrationContent = fs.readFileSync(migrationPath, 'utf8');
  const indexCount = (migrationContent.match(/CREATE INDEX/g) || []).length;

  console.log('  ✅ Migration file exists');
  console.log(`  📁 Creates ${indexCount} indexes`);

  if (indexCount >= 5) {
    console.log('  ✅ All expected indexes present');
  } else {
    console.log(`  ⚠️  Expected 5 indexes, found ${indexCount}`);
  }
} else {
  console.log('  ❌ Migration file not found!');
  failed++;
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📋 Test Summary');
console.log('='.repeat(50));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total:  ${passed + failed}`);

if (failed === 0) {
  console.log('\n🎉 All validation tests passed!');
  console.log('\n📝 Next Steps:');
  console.log('  1. Apply migration: Run 0023_optimize_itp_queries.sql in Supabase');
  console.log('  2. Test in development: pnpm dev');
  console.log('  3. Verify ITP list loads correctly');
  console.log('  4. Check browser Network tab for single query');
  console.log('  5. Deploy to production when ready');
  process.exit(0);
} else {
  console.log('\n❌ Some validation tests failed!');
  console.log('Please review the errors above.');
  process.exit(1);
}
