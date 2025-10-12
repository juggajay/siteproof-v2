#!/usr/bin/env node

/**
 * Script to verify diary data persistence fixes
 * This creates test data directly in the database and verifies it displays correctly
 */

const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment or use defaults
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
  console.error('❌ Please set NEXT_PUBLIC_SUPABASE_URL environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Test data with all fields
const testDiaryData = {
  diary_number: `TEST-${Date.now()}`,
  diary_date: new Date().toISOString().split('T')[0],
  work_summary: 'Test diary to verify all data fields persist correctly',
  weather: {
    conditions: 'Sunny',
    temperature: { min: 15, max: 25 },
    wind: 'Light breeze'
  },
  site_conditions: 'Site is dry and accessible',
  access_issues: 'Use side entrance',
  general_notes: 'All data should be visible when viewing this diary',
  tomorrow_planned_work: 'Continue testing data persistence',
  total_workers: 5
};

const testLabourEntries = [
  {
    worker_name: 'John Smith',
    trade: 'Carpenter',
    company: 'ABC Construction',
    workers: 1,
    start_time: '07:00',
    end_time: '15:30',
    break_duration: '30 minutes',
    total_hours: 8,
    work_performed: 'Formwork installation - all this text should be visible'
  },
  {
    worker_name: 'Jane Doe',
    trade: 'Electrician',
    company: 'XYZ Electrical',
    workers: 1,
    start_time: '08:00',
    end_time: '17:00',
    break_duration: '60 minutes',
    total_hours: 8,
    work_performed: 'Cable pulling and conduit installation'
  }
];

const testPlantEntries = [
  {
    name: '50-ton Mobile Crane',
    type: 'Lifting Equipment',
    quantity: 1,
    hours_used: 6,
    notes: 'Used for steel beam installation - this note should appear'
  },
  {
    name: 'Concrete Pump',
    type: 'Concrete Equipment',
    quantity: 1,
    hours_used: 4,
    notes: 'Foundation pour Block B'
  }
];

const testMaterialEntries = [
  {
    name: 'Ready Mix Concrete',
    quantity: 45,
    unit: 'm³',
    supplier: 'Concrete Solutions Ltd',
    notes: 'Grade C30 - all fields should show'
  },
  {
    name: 'Steel Reinforcement',
    quantity: 2500,
    unit: 'kg',
    supplier: 'Steel Supply Co',
    notes: 'Y12 and Y16 bars'
  }
];

async function verifyDiaryFix() {
  console.log('🔍 Verifying Diary Data Persistence Fix\n');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Get organization and project
    console.log('\n1️⃣ Getting test organization and project...');
    
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1)
      .single();
    
    if (orgError || !orgs) {
      console.error('❌ No organization found. Please ensure you have an organization set up.');
      return;
    }
    
    const { data: projects, error: projError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('organization_id', orgs.id)
      .limit(1)
      .single();
    
    if (projError || !projects) {
      console.error('❌ No project found. Please ensure you have a project set up.');
      return;
    }
    
    console.log(`✅ Using org: ${orgs.name}, project: ${projects.name}`);
    
    // Step 2: Create test diary
    console.log('\n2️⃣ Creating test diary with all fields...');
    
    const { data: diary, error: diaryError } = await supabase
      .from('daily_diaries')
      .insert({
        ...testDiaryData,
        organization_id: orgs.id,
        project_id: projects.id,
        created_by: '00000000-0000-0000-0000-000000000000' // System user
      })
      .select()
      .single();
    
    if (diaryError) {
      console.error('❌ Failed to create diary:', diaryError);
      return;
    }
    
    console.log(`✅ Created diary: ${diary.diary_number} (ID: ${diary.id})`);
    
    // Step 3: Insert labour entries
    console.log('\n3️⃣ Adding labour entries with all fields...');
    
    const labourData = testLabourEntries.map(entry => ({
      ...entry,
      diary_id: diary.id,
      created_by: '00000000-0000-0000-0000-000000000000'
    }));
    
    const { error: labourError } = await supabase
      .from('diary_labour_entries')
      .insert(labourData);
    
    if (labourError) {
      console.error('⚠️ Warning: Labour entries may need schema update:', labourError.message);
      console.log('  Run the migration: fix_diary_labour_entries.sql');
    } else {
      console.log(`✅ Added ${testLabourEntries.length} labour entries`);
    }
    
    // Step 4: Insert plant entries
    console.log('\n4️⃣ Adding plant entries with all fields...');
    
    const plantData = testPlantEntries.map(entry => ({
      ...entry,
      diary_id: diary.id,
      created_by: '00000000-0000-0000-0000-000000000000'
    }));
    
    const { error: plantError } = await supabase
      .from('diary_plant_entries')
      .insert(plantData);
    
    if (plantError) {
      console.error('⚠️ Warning: Plant entries may need schema update:', plantError.message);
      console.log('  Run the migration: fix_diary_labour_entries.sql');
    } else {
      console.log(`✅ Added ${testPlantEntries.length} plant entries`);
    }
    
    // Step 5: Insert material entries
    console.log('\n5️⃣ Adding material entries with all fields...');
    
    const materialData = testMaterialEntries.map(entry => ({
      ...entry,
      diary_id: diary.id,
      created_by: '00000000-0000-0000-0000-000000000000'
    }));
    
    const { error: materialError } = await supabase
      .from('diary_material_entries')
      .insert(materialData);
    
    if (materialError) {
      console.error('⚠️ Warning: Material entries may need schema update:', materialError.message);
      console.log('  Run the migration: fix_diary_labour_entries.sql');
    } else {
      console.log(`✅ Added ${testMaterialEntries.length} material entries`);
    }
    
    // Step 6: Verify data retrieval
    console.log('\n6️⃣ Verifying data retrieval...');
    
    const { data: savedDiary, error: fetchError } = await supabase
      .from('daily_diaries')
      .select('*')
      .eq('id', diary.id)
      .single();
    
    const { data: savedLabour } = await supabase
      .from('diary_labour_entries')
      .select('*')
      .eq('diary_id', diary.id);
    
    const { data: savedPlant } = await supabase
      .from('diary_plant_entries')
      .select('*')
      .eq('diary_id', diary.id);
    
    const { data: savedMaterial } = await supabase
      .from('diary_material_entries')
      .select('*')
      .eq('diary_id', diary.id);
    
    // Check results
    console.log('\n📊 Verification Results:');
    console.log('=' .repeat(50));
    
    const checks = [
      { name: 'Diary basic fields', passed: savedDiary?.work_summary === testDiaryData.work_summary },
      { name: 'Weather data', passed: savedDiary?.weather?.conditions === 'Sunny' },
      { name: 'General notes', passed: savedDiary?.general_notes === testDiaryData.general_notes },
      { name: 'Labour entries count', passed: savedLabour?.length === testLabourEntries.length },
      { name: 'Labour worker names', passed: savedLabour?.[0]?.worker_name === 'John Smith' },
      { name: 'Labour company names', passed: savedLabour?.[0]?.company === 'ABC Construction' },
      { name: 'Labour hours', passed: savedLabour?.[0]?.total_hours === 8 },
      { name: 'Labour work performed', passed: savedLabour?.[0]?.work_performed?.includes('Formwork') },
      { name: 'Plant entries count', passed: savedPlant?.length === testPlantEntries.length },
      { name: 'Plant names', passed: savedPlant?.[0]?.name === '50-ton Mobile Crane' },
      { name: 'Plant hours', passed: savedPlant?.[0]?.hours_used === 6 },
      { name: 'Plant notes', passed: savedPlant?.[0]?.notes?.includes('steel beam') },
      { name: 'Material entries count', passed: savedMaterial?.length === testMaterialEntries.length },
      { name: 'Material names', passed: savedMaterial?.[0]?.name === 'Ready Mix Concrete' },
      { name: 'Material quantities', passed: savedMaterial?.[0]?.quantity === 45 },
      { name: 'Material suppliers', passed: savedMaterial?.[0]?.supplier === 'Concrete Solutions Ltd' }
    ];
    
    let passedCount = 0;
    let failedCount = 0;
    
    checks.forEach(check => {
      if (check.passed) {
        console.log(`✅ ${check.name}`);
        passedCount++;
      } else {
        console.log(`❌ ${check.name}`);
        failedCount++;
      }
    });
    
    console.log('\n' + '=' .repeat(50));
    console.log(`\n📈 Results: ${passedCount} passed, ${failedCount} failed`);
    
    if (failedCount > 0) {
      console.log('\n⚠️  Some fields are not persisting correctly.');
      console.log('Please ensure you have run the migration:');
      console.log('  apps/web/supabase/migrations/fix_diary_labour_entries.sql');
      console.log('\nTo view the test diary in the app, navigate to:');
      console.log(`  /dashboard/diaries/${diary.id}`);
    } else {
      console.log('\n🎉 All fields are persisting correctly!');
      console.log('\nTest diary created successfully. View it at:');
      console.log(`  /dashboard/diaries/${diary.id}`);
    }
    
    // Output raw data for debugging
    if (process.env.DEBUG) {
      console.log('\n🔍 Debug Data:');
      console.log('Labour:', JSON.stringify(savedLabour, null, 2));
      console.log('Plant:', JSON.stringify(savedPlant, null, 2));
      console.log('Material:', JSON.stringify(savedMaterial, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

// Run verification
verifyDiaryFix();