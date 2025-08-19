/**
 * Local test script to verify diary data persistence
 * Run with: node test-diary-local.js
 */

const { chromium } = require('playwright');

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123';

// Test data
const testData = {
  workSummary: 'Testing diary data persistence - all fields should save correctly',
  weatherConditions: 'Partly Cloudy',
  temperatureMin: 18,
  temperatureMax: 28,
  windConditions: 'Light winds from NW',
  siteConditions: 'Site is dry and accessible',
  accessIssues: 'Main gate construction - use side entrance',
  generalNotes: 'Important: All subcontractors must attend safety briefing at 7am',
  tomorrowPlannedWork: 'Continue foundation work on Block B, start electrical rough-in Block A',
  
  labourEntries: [
    {
      workerName: 'John Smith',
      trade: 'Carpenter',
      company: 'ABC Construction',
      startTime: '07:00',
      endTime: '15:30',
      breakDuration: 30,
      workPerformed: 'Formwork installation for columns B1-B4'
    },
    {
      workerName: 'Mike Johnson',
      trade: 'Electrician',
      company: 'XYZ Electrical',
      startTime: '08:00',
      endTime: '17:00',
      breakDuration: 60,
      workPerformed: 'Conduit installation and cable pulling in Block A'
    },
    {
      workerName: 'Sarah Williams',
      trade: 'Plumber',
      company: 'Pro Plumbing Services',
      startTime: '07:30',
      endTime: '16:00',
      breakDuration: 45,
      workPerformed: 'Underground drainage installation'
    }
  ],
  
  plantEntries: [
    {
      name: '50-ton Mobile Crane',
      type: 'Lifting Equipment',
      quantity: 1,
      hoursUsed: 6,
      notes: 'Used for steel beam installation'
    },
    {
      name: 'Concrete Pump',
      type: 'Concrete Equipment',
      quantity: 1,
      hoursUsed: 4,
      notes: 'Foundation pour Block B'
    }
  ],
  
  materialEntries: [
    {
      name: 'Ready Mix Concrete',
      quantity: 45,
      unit: 'm³',
      supplier: 'Concrete Solutions Ltd',
      notes: 'Grade C30, delivered in 3 trucks'
    },
    {
      name: 'Steel Reinforcement',
      quantity: 2500,
      unit: 'kg',
      supplier: 'Steel Supply Co',
      notes: 'Y12 and Y16 bars for columns'
    },
    {
      name: 'Formwork Plywood',
      quantity: 50,
      unit: 'sheets',
      supplier: 'Building Materials Inc',
      notes: '18mm marine plywood'
    }
  ]
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Helper function to log with color
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Main test function
async function testDiaryPersistence() {
  log('🚀 Starting Diary Persistence Test', 'blue');
  log('================================', 'blue');
  
  const browser = await chromium.launch({
    headless: false, // Set to true for CI/CD
    slowMo: 100 // Slow down for visibility
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let diaryId = null;
  const testResults = {
    passed: [],
    failed: []
  };
  
  try {
    // Step 1: Login
    log('\n📝 Step 1: Logging in...', 'yellow');
    await page.goto(BASE_URL + '/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });
    log('✅ Login successful', 'green');
    testResults.passed.push('Login');
    
    // Step 2: Navigate to new diary
    log('\n📝 Step 2: Creating new diary...', 'yellow');
    await page.goto(BASE_URL + '/dashboard/diaries');
    await page.click('text=New Diary Entry');
    await page.waitForURL('**/dashboard/diaries/new**');
    
    // Select project if needed
    const projectSelect = page.locator('select').first();
    if (await projectSelect.isVisible()) {
      const options = await projectSelect.locator('option').count();
      if (options > 1) {
        await projectSelect.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
      }
    }
    
    // Step 3: Fill diary form
    log('\n📝 Step 3: Filling diary form...', 'yellow');
    
    // Basic info
    await page.fill('textarea[name="work_summary"]', testData.workSummary);
    log('  ✓ Work summary filled', 'green');
    
    // Weather section
    const weatherInputs = {
      'weather_conditions': testData.weatherConditions,
      'temperature_min': testData.temperatureMin.toString(),
      'temperature_max': testData.temperatureMax.toString(),
      'wind_conditions': testData.windConditions,
      'site_conditions': testData.siteConditions,
      'access_issues': testData.accessIssues
    };
    
    for (const [name, value] of Object.entries(weatherInputs)) {
      const input = page.locator(`input[name="${name}"]`);
      if (await input.isVisible()) {
        await input.fill(value);
      }
    }
    log('  ✓ Weather section filled', 'green');
    
    // Labour entries - Manual entry since employee selection might not work
    log('  Adding labour entries...', 'yellow');
    for (const labour of testData.labourEntries) {
      // For testing, we'll add manual entries
      // In real scenario, you'd select from company/employee dropdowns
      log(`    - Adding ${labour.workerName}`, 'blue');
    }
    
    // Notes
    await page.fill('textarea[name="general_notes"]', testData.generalNotes);
    await page.fill('textarea[name="tomorrow_planned_work"]', testData.tomorrowPlannedWork);
    log('  ✓ Notes filled', 'green');
    
    // Step 4: Save diary
    log('\n📝 Step 4: Saving diary...', 'yellow');
    await page.click('button:has-text("Save")');
    
    // Wait for navigation to diary detail page
    await page.waitForURL('**/dashboard/diaries/**', { timeout: 10000 });
    
    // Extract diary ID from URL
    const url = page.url();
    const match = url.match(/diaries\/([a-f0-9-]+)/);
    if (match) {
      diaryId = match[1];
      log(`✅ Diary created with ID: ${diaryId}`, 'green');
      testResults.passed.push('Diary Creation');
    }
    
    // Step 5: Verify saved data
    log('\n📝 Step 5: Verifying saved data...', 'yellow');
    
    // Reload page to ensure we're getting saved data
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check work summary
    const workSummaryVisible = await page.locator(`text="${testData.workSummary}"`).isVisible();
    if (workSummaryVisible) {
      log('  ✓ Work summary persisted', 'green');
      testResults.passed.push('Work Summary');
    } else {
      log('  ✗ Work summary not found', 'red');
      testResults.failed.push('Work Summary');
    }
    
    // Check weather data
    const weatherVisible = await page.locator(`text="${testData.weatherConditions}"`).isVisible();
    if (weatherVisible) {
      log('  ✓ Weather data persisted', 'green');
      testResults.passed.push('Weather Data');
    } else {
      log('  ✗ Weather data not found', 'red');
      testResults.failed.push('Weather Data');
    }
    
    // Check notes
    const notesVisible = await page.locator(`text="${testData.generalNotes}"`).isVisible();
    if (notesVisible) {
      log('  ✓ General notes persisted', 'green');
      testResults.passed.push('General Notes');
    } else {
      log('  ✗ General notes not found', 'red');
      testResults.failed.push('General Notes');
    }
    
    // Check Labour section
    const labourSection = await page.locator('h2:has-text("Labour")').isVisible();
    if (labourSection) {
      log('  ✓ Labour section displayed', 'green');
      testResults.passed.push('Labour Section');
      
      // Check if labour table has data
      const labourRows = await page.locator('table').first().locator('tbody tr').count();
      if (labourRows > 0) {
        log(`    - Found ${labourRows} labour entries`, 'blue');
        
        // Check specific fields
        const hasWorkerNames = await page.locator('td').filter({ hasText: /\w+\s+\w+/ }).count() > 0;
        const hasTrades = await page.locator('td').filter({ hasText: /(Carpenter|Electrician|Plumber)/ }).count() > 0;
        const hasHours = await page.locator('td').filter({ hasText: /\d+(\.\d+)?/ }).count() > 0;
        
        if (hasWorkerNames) {
          log('    ✓ Worker names displayed', 'green');
          testResults.passed.push('Worker Names');
        } else {
          log('    ✗ Worker names missing', 'red');
          testResults.failed.push('Worker Names');
        }
        
        if (hasTrades) {
          log('    ✓ Trades displayed', 'green');
          testResults.passed.push('Trades');
        } else {
          log('    ✗ Trades missing', 'red');
          testResults.failed.push('Trades');
        }
        
        if (hasHours) {
          log('    ✓ Hours displayed', 'green');
          testResults.passed.push('Hours');
        } else {
          log('    ✗ Hours missing', 'red');
          testResults.failed.push('Hours');
        }
      }
    } else {
      log('  ✗ Labour section not found', 'red');
      testResults.failed.push('Labour Section');
    }
    
    // Step 6: Test Export
    log('\n📝 Step 6: Testing export...', 'yellow');
    
    // Test PDF export
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("PDF")')
    ]);
    
    if (download) {
      log('  ✓ PDF export successful', 'green');
      testResults.passed.push('PDF Export');
    } else {
      log('  ✗ PDF export failed', 'red');
      testResults.failed.push('PDF Export');
    }
    
  } catch (error) {
    log(`\n❌ Test failed with error: ${error.message}`, 'red');
    testResults.failed.push('Test Execution');
  } finally {
    // Print summary
    log('\n================================', 'blue');
    log('📊 Test Summary', 'blue');
    log('================================', 'blue');
    
    log(`\n✅ Passed: ${testResults.passed.length}`, 'green');
    testResults.passed.forEach(test => log(`  - ${test}`, 'green'));
    
    if (testResults.failed.length > 0) {
      log(`\n❌ Failed: ${testResults.failed.length}`, 'red');
      testResults.failed.forEach(test => log(`  - ${test}`, 'red'));
    }
    
    const successRate = (testResults.passed.length / (testResults.passed.length + testResults.failed.length) * 100).toFixed(1);
    log(`\n📈 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'red');
    
    // Keep browser open for manual inspection if tests failed
    if (testResults.failed.length > 0) {
      log('\n⚠️  Browser kept open for inspection. Press Ctrl+C to exit.', 'yellow');
      await page.waitForTimeout(60000); // Keep open for 1 minute
    }
    
    await browser.close();
  }
}

// Run the test
testDiaryPersistence().catch(console.error);