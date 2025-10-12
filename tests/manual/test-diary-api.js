#!/usr/bin/env node

/**
 * API test to verify diary data persistence
 * Tests the complete flow: create diary -> save entries -> retrieve and verify
 */

const BASE_URL = 'http://localhost:3000';

// Test data with all required fields
const testData = {
  diary: {
    diary_date: new Date().toISOString().split('T')[0],
    work_summary: 'API Test: Verifying all diary fields persist correctly including labour names, hours, and work performed',
    weather_conditions: 'Sunny with light clouds',
    temperature_min: 18,
    temperature_max: 28,
    wind_conditions: 'Light NW winds',
    site_conditions: 'Site dry and accessible',
    access_issues: 'Main gate under construction',
    general_notes: 'This is a test diary to verify data persistence. All fields should be saved and visible.',
    tomorrow_planned_work: 'Continue testing and verification of diary system',
    total_workers: 5
  },
  labour_entries: [
    {
      worker_name: 'John Smith',
      trade: 'Carpenter',
      company: 'ABC Construction Ltd',
      start_time: '07:00',
      end_time: '15:30',
      break_duration: 30,
      total_hours: 8,
      work_performed: 'Installing formwork for columns B1-B4. This text must be visible in saved diary.'
    },
    {
      worker_name: 'Jane Doe',
      trade: 'Electrician', 
      company: 'XYZ Electrical Services',
      start_time: '08:00',
      end_time: '17:00',
      break_duration: 60,
      total_hours: 8,
      work_performed: 'Running conduit and pulling cables in Block A Level 2'
    },
    {
      worker_name: 'Mike Johnson',
      trade: 'Plumber',
      company: 'Pro Plumbing Co',
      start_time: '07:30',
      end_time: '16:00',
      break_duration: 45,
      total_hours: 7.75,
      work_performed: 'Installing underground drainage pipes and inspection chambers'
    }
  ],
  plant_entries: [
    {
      name: '50-ton Mobile Crane',
      type: 'Lifting Equipment',
      quantity: 1,
      hours_used: 6,
      notes: 'Used for steel beam installation on Level 3'
    },
    {
      name: 'Concrete Pump Truck',
      type: 'Concrete Equipment',
      quantity: 1,
      hours_used: 4,
      notes: 'Foundation pour for Block B Grid 5-8'
    }
  ],
  material_entries: [
    {
      name: 'Ready Mix Concrete C30',
      quantity: 45,
      unit: 'm³',
      supplier: 'Concrete Solutions Ltd',
      notes: 'Delivered in 3 trucks between 9am-12pm'
    },
    {
      name: 'Steel Reinforcement Y16',
      quantity: 2500,
      unit: 'kg',
      supplier: 'Steel Supply Co',
      notes: 'For column reinforcement'
    },
    {
      name: 'Marine Plywood 18mm',
      quantity: 50,
      unit: 'sheets',
      supplier: 'Building Materials Inc',
      notes: 'For formwork construction'
    }
  ]
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testDiaryAPI() {
  log('\n🔬 Testing Diary Data Persistence via API', 'blue');
  log('=' .repeat(60), 'blue');
  
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  try {
    // Step 1: Check API health
    log('\n1️⃣  Checking API health...', 'yellow');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const health = await healthResponse.json();
    
    if (health.status === 'healthy') {
      log('✅ API is healthy', 'green');
      results.passed.push('API Health');
    } else {
      log('❌ API is not healthy', 'red');
      results.failed.push('API Health');
      return;
    }
    
    // Step 2: Get test project
    log('\n2️⃣  Getting test project...', 'yellow');
    const projectsResponse = await fetch(`${BASE_URL}/api/projects`, {
      credentials: 'include'
    });
    
    if (!projectsResponse.ok) {
      log('⚠️  Cannot fetch projects - authentication may be required', 'yellow');
      results.warnings.push('Requires authentication - please login to the app first');
      
      // Provide manual test instructions
      log('\n📝 Manual Test Instructions:', 'magenta');
      log('1. Open your browser and login to the app', 'magenta');
      log('2. Navigate to /dashboard/diaries/new', 'magenta');
      log('3. Fill in the following test data:', 'magenta');
      log('\n   Work Summary:', 'blue');
      log(`   ${testData.diary.work_summary}`, 'reset');
      log('\n   Labour Entries:', 'blue');
      testData.labour_entries.forEach((entry, i) => {
        log(`   ${i + 1}. ${entry.worker_name} (${entry.trade})`, 'reset');
        log(`      Company: ${entry.company}`, 'reset');
        log(`      Hours: ${entry.total_hours}`, 'reset');
        log(`      Work: ${entry.work_performed}`, 'reset');
      });
      log('\n4. Save the diary', 'magenta');
      log('5. View the saved diary and verify ALL fields are displayed:', 'magenta');
      log('   ✓ Worker names (not just trade)', 'green');
      log('   ✓ Company names', 'green');
      log('   ✓ Hours worked', 'green');
      log('   ✓ Work performed descriptions', 'green');
      log('   ✓ Plant & equipment details', 'green');
      log('   ✓ Material quantities and suppliers', 'green');
      
      return;
    }
    
    const projectsData = await projectsResponse.json();
    if (!projectsData.projects || projectsData.projects.length === 0) {
      log('❌ No projects found', 'red');
      results.failed.push('Project availability');
      return;
    }
    
    const testProject = projectsData.projects[0];
    log(`✅ Using project: ${testProject.name}`, 'green');
    
    // Step 3: Create diary with all data
    log('\n3️⃣  Creating diary with complete data...', 'yellow');
    
    const createPayload = {
      ...testData.diary,
      project_id: testProject.id,
      labour_entries: testData.labour_entries,
      plant_entries: testData.plant_entries,
      material_entries: testData.material_entries
    };
    
    log('   Sending labour entries with:', 'blue');
    testData.labour_entries.forEach(entry => {
      log(`   - ${entry.worker_name}: ${entry.work_performed.substring(0, 50)}...`, 'reset');
    });
    
    const createResponse = await fetch(`${BASE_URL}/api/diaries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createPayload),
      credentials: 'include'
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.text();
      log(`❌ Failed to create diary: ${error}`, 'red');
      results.failed.push('Diary creation');
      return;
    }
    
    const createResult = await createResponse.json();
    const diaryId = createResult.diary?.id;
    
    if (!diaryId) {
      log('❌ No diary ID returned', 'red');
      results.failed.push('Diary ID');
      return;
    }
    
    log(`✅ Diary created with ID: ${diaryId}`, 'green');
    results.passed.push('Diary creation');
    
    // Step 4: Retrieve and verify diary
    log('\n4️⃣  Retrieving saved diary...', 'yellow');
    
    const getResponse = await fetch(`${BASE_URL}/api/diaries/${diaryId}`, {
      credentials: 'include'
    });
    
    if (!getResponse.ok) {
      log('❌ Failed to retrieve diary', 'red');
      results.failed.push('Diary retrieval');
      return;
    }
    
    const savedDiary = await getResponse.json();
    
    // Step 5: Verify all fields
    log('\n5️⃣  Verifying data persistence...', 'yellow');
    
    // Check basic diary fields
    const basicChecks = [
      {
        name: 'Work summary',
        expected: testData.diary.work_summary,
        actual: savedDiary.diary?.work_summary,
        critical: true
      },
      {
        name: 'General notes',
        expected: testData.diary.general_notes,
        actual: savedDiary.diary?.general_notes,
        critical: true
      },
      {
        name: 'Site conditions',
        expected: testData.diary.site_conditions,
        actual: savedDiary.diary?.site_conditions,
        critical: false
      }
    ];
    
    basicChecks.forEach(check => {
      if (check.actual === check.expected) {
        log(`   ✅ ${check.name} saved correctly`, 'green');
        results.passed.push(check.name);
      } else {
        log(`   ❌ ${check.name} not saved`, 'red');
        if (check.critical) results.failed.push(check.name);
        else results.warnings.push(check.name);
      }
    });
    
    // Check labour entries
    log('\n   Checking labour entries:', 'blue');
    const labourEntries = savedDiary.diary?.labour_entries || [];
    
    if (labourEntries.length === 0) {
      log('   ❌ No labour entries found!', 'red');
      results.failed.push('Labour entries');
    } else {
      log(`   ✅ Found ${labourEntries.length} labour entries`, 'green');
      
      // Check specific fields in first labour entry
      const firstLabour = labourEntries[0];
      const labourChecks = [
        { field: 'worker_name', value: firstLabour.worker_name },
        { field: 'trade', value: firstLabour.trade },
        { field: 'company', value: firstLabour.company },
        { field: 'total_hours', value: firstLabour.total_hours },
        { field: 'work_performed', value: firstLabour.work_performed }
      ];
      
      labourChecks.forEach(check => {
        if (check.value) {
          log(`      ✅ ${check.field}: ${check.value}`, 'green');
          results.passed.push(`Labour ${check.field}`);
        } else {
          log(`      ❌ ${check.field}: missing or empty`, 'red');
          results.failed.push(`Labour ${check.field}`);
        }
      });
    }
    
    // Check plant entries
    log('\n   Checking plant entries:', 'blue');
    const plantEntries = savedDiary.diary?.plant_entries || [];
    
    if (plantEntries.length === 0) {
      log('   ⚠️  No plant entries found', 'yellow');
      results.warnings.push('Plant entries');
    } else {
      log(`   ✅ Found ${plantEntries.length} plant entries`, 'green');
      const firstPlant = plantEntries[0];
      if (firstPlant.name && firstPlant.hours_used) {
        log(`      ✅ Plant data complete`, 'green');
        results.passed.push('Plant data');
      }
    }
    
    // Check material entries
    log('\n   Checking material entries:', 'blue');
    const materialEntries = savedDiary.diary?.material_entries || [];
    
    if (materialEntries.length === 0) {
      log('   ⚠️  No material entries found', 'yellow');
      results.warnings.push('Material entries');
    } else {
      log(`   ✅ Found ${materialEntries.length} material entries`, 'green');
      const firstMaterial = materialEntries[0];
      if (firstMaterial.name && firstMaterial.quantity && firstMaterial.supplier) {
        log(`      ✅ Material data complete`, 'green');
        results.passed.push('Material data');
      }
    }
    
  } catch (error) {
    log(`\n❌ Test error: ${error.message}`, 'red');
    results.failed.push('Test execution');
  }
  
  // Print summary
  log('\n' + '=' .repeat(60), 'blue');
  log('📊 Test Summary', 'blue');
  log('=' .repeat(60), 'blue');
  
  if (results.passed.length > 0) {
    log(`\n✅ Passed (${results.passed.length}):`, 'green');
    results.passed.forEach(test => log(`   - ${test}`, 'green'));
  }
  
  if (results.failed.length > 0) {
    log(`\n❌ Failed (${results.failed.length}):`, 'red');
    results.failed.forEach(test => log(`   - ${test}`, 'red'));
  }
  
  if (results.warnings.length > 0) {
    log(`\n⚠️  Warnings (${results.warnings.length}):`, 'yellow');
    results.warnings.forEach(warning => log(`   - ${warning}`, 'yellow'));
  }
  
  const total = results.passed.length + results.failed.length;
  const successRate = total > 0 ? (results.passed.length / total * 100).toFixed(1) : 0;
  
  log(`\n📈 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'red');
  
  if (results.failed.length > 0) {
    log('\n🔧 Required Actions:', 'magenta');
    log('1. Apply database migration:', 'magenta');
    log('   psql -d your_db -f apps/web/supabase/migrations/fix_diary_labour_entries.sql', 'reset');
    log('2. Restart the application', 'magenta');
    log('3. Test manually in the browser to verify fixes', 'magenta');
  } else if (results.passed.length > 0) {
    log('\n🎉 Diary data persistence is working correctly!', 'green');
  }
}

// Run the test
testDiaryAPI();