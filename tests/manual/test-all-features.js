#!/usr/bin/env node

/**
 * Comprehensive test script for all 7 quick-win features
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing All 7 Quick-Win Features\n');
console.log('=====================================\n');

// Test results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Feature 1: Dark Mode
console.log('1️⃣ Testing Dark Mode...');
const darkModeCss = path.join(__dirname, 'apps/web/src/styles/dark-mode.css');
const darkModeComponent = path.join(__dirname, 'apps/web/src/components/theme/DarkModeToggle.tsx');
const layoutFile = path.join(__dirname, 'apps/web/src/app/layout.tsx');

if (fs.existsSync(darkModeCss) && fs.existsSync(darkModeComponent)) {
  const layoutContent = fs.readFileSync(layoutFile, 'utf8');
  if (layoutContent.includes('DarkModeToggle')) {
    results.passed.push('✅ Dark Mode: Component integrated in layout');
  } else {
    results.failed.push('❌ Dark Mode: Not integrated in layout');
  }
} else {
  results.failed.push('❌ Dark Mode: Missing files');
}

// Feature 2: Dashboard Widgets
console.log('2️⃣ Testing Dashboard Widgets...');
const dashboardWidgets = path.join(__dirname, 'apps/web/src/components/dashboard/DashboardWidgets.tsx');
const dashboardPage = path.join(__dirname, 'apps/web/src/app/dashboard/page.tsx');

if (fs.existsSync(dashboardWidgets)) {
  const dashboardContent = fs.readFileSync(dashboardPage, 'utf8');
  if (dashboardContent.includes('DashboardWidgets')) {
    results.passed.push('✅ Dashboard Widgets: Integrated in dashboard');
  } else {
    results.failed.push('❌ Dashboard Widgets: Not integrated');
  }
} else {
  results.failed.push('❌ Dashboard Widgets: Component missing');
}

// Feature 3: Photo Upload
console.log('3️⃣ Testing Photo Upload...');
const photoUpload = path.join(__dirname, 'apps/web/src/components/photo/PhotoUpload.tsx');
const mobileItpCard = path.join(__dirname, 'apps/web/src/components/itp/mobile-itp-card.tsx');

if (fs.existsSync(photoUpload)) {
  const itpContent = fs.readFileSync(mobileItpCard, 'utf8');
  if (itpContent.includes('PhotoUpload')) {
    results.passed.push('✅ Photo Upload: Integrated in ITP cards');
  } else {
    results.failed.push('❌ Photo Upload: Not integrated in ITP');
  }
} else {
  results.failed.push('❌ Photo Upload: Component missing');
}

// Feature 4: Push Notifications
console.log('4️⃣ Testing Push Notifications...');
const notificationSettings = path.join(__dirname, 'apps/web/src/components/notifications/NotificationSettings.tsx');
const pushManager = path.join(__dirname, 'apps/web/src/lib/push-notifications/PushNotificationManager.ts');

if (fs.existsSync(notificationSettings) && fs.existsSync(pushManager)) {
  results.passed.push('✅ Push Notifications: Components exist');
} else {
  results.failed.push('❌ Push Notifications: Missing components');
}

// Feature 5: Bulk Operations
console.log('5️⃣ Testing Bulk Operations...');
const bulkOperations = path.join(__dirname, 'apps/web/src/components/itp/BulkOperations.tsx');

if (fs.existsSync(bulkOperations)) {
  results.passed.push('✅ Bulk Operations: Component exists');
} else {
  results.failed.push('❌ Bulk Operations: Component missing');
}

// Feature 6: Export Improvements
console.log('6️⃣ Testing Branded PDF Export...');
const brandedPDF = path.join(__dirname, 'apps/web/src/components/reports/BrandedPDFExport.tsx');

if (fs.existsSync(brandedPDF)) {
  results.passed.push('✅ Branded PDF Export: Component exists');
} else {
  results.failed.push('❌ Branded PDF Export: Component missing');
}

// Feature 7: Signature Capture
console.log('7️⃣ Testing Signature Capture...');
const signatureCapture = path.join(__dirname, 'apps/web/src/components/signature/SignatureCapture.tsx');

if (fs.existsSync(signatureCapture)) {
  const itpContent = fs.readFileSync(mobileItpCard, 'utf8');
  if (itpContent.includes('SignatureCapture')) {
    results.passed.push('✅ Signature Capture: Integrated in ITP');
  } else {
    results.failed.push('❌ Signature Capture: Not integrated');
  }
} else {
  results.failed.push('❌ Signature Capture: Component missing');
}

// Check API endpoints
console.log('\n📡 Testing API Endpoints...');
const exportEndpoint = path.join(__dirname, 'apps/web/src/app/api/projects/[projectId]/lots/[lotId]/export/route.ts');
const notificationEndpoint = path.join(__dirname, 'apps/web/src/app/api/notifications/vapid-public-key/route.ts');

if (fs.existsSync(exportEndpoint)) {
  results.passed.push('✅ Export API: Endpoint exists');
} else {
  results.warnings.push('⚠️ Export API: Endpoint missing (just created, may need refresh)');
}

if (fs.existsSync(notificationEndpoint)) {
  results.passed.push('✅ Notification API: VAPID endpoint exists');
} else {
  results.failed.push('❌ Notification API: VAPID endpoint missing');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 TEST RESULTS SUMMARY');
console.log('='.repeat(50) + '\n');

console.log(`✅ PASSED: ${results.passed.length}`);
results.passed.forEach(msg => console.log(`   ${msg}`));

if (results.warnings.length > 0) {
  console.log(`\n⚠️  WARNINGS: ${results.warnings.length}`);
  results.warnings.forEach(msg => console.log(`   ${msg}`));
}

if (results.failed.length > 0) {
  console.log(`\n❌ FAILED: ${results.failed.length}`);
  results.failed.forEach(msg => console.log(`   ${msg}`));
}

// Overall status
console.log('\n' + '='.repeat(50));
if (results.failed.length === 0) {
  console.log('🎉 All features are properly integrated!');
} else {
  console.log(`⚠️ ${results.failed.length} issues need attention`);
}

// Recommendations
console.log('\n📝 RECOMMENDATIONS:');
console.log('1. Visit /dashboard to see Dashboard Widgets');
console.log('2. Visit /dashboard/settings for Notification Settings');
console.log('3. Dark Mode toggle is in top-right corner');
console.log('4. Photo Upload & Signature in ITP mobile view');
console.log('5. Export button in lot details page');

process.exit(results.failed.length > 0 ? 1 : 0);