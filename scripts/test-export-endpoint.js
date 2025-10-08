#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://slzmbpntjoaltasfxiiv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsem1icG50am9hbHRhc2Z4aWl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA0NjM3NiwiZXhwIjoyMDY2NjIyMzc2fQ.i6G2wbQJJFdq-ePZn3yvNwIXFqAfQLA8Stu_1YYVcNM';

const projectId = '6dfdd02a-a4e6-4ec6-b100-e5c2ad1041c4';
const lotId = '9e437853-7f41-40dc-98dc-479013404196';

async function testEndpoint() {
  console.log('Testing export endpoint data queries...\n');

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test 1: Check if lot exists
  console.log('1. Checking if lot exists...');
  const { data: lot, error: lotError } = await supabase
    .from('lots')
    .select('*')
    .eq('id', lotId)
    .eq('project_id', projectId)
    .single();

  if (lotError) {
    console.error('❌ Lot query error:', lotError);
  } else if (!lot) {
    console.log('❌ Lot not found');
  } else {
    console.log('✅ Lot found:', {
      id: lot.id,
      lot_number: lot.lot_number,
      project_id: lot.project_id
    });
  }

  // Test 2: Check ITP instances
  console.log('\n2. Checking ITP instances...');
  const { data: itpInstances, error: itpError } = await supabase
    .from('itp_instances')
    .select(`
      id,
      name,
      status,
      completion_percentage,
      data
    `)
    .eq('lot_id', lotId);

  if (itpError) {
    console.error('❌ ITP instances query error:', itpError);
  } else {
    console.log(`✅ Found ${itpInstances?.length || 0} ITP instances`);
    if (itpInstances && itpInstances.length > 0) {
      console.log('First ITP:', {
        id: itpInstances[0].id,
        name: itpInstances[0].name,
        status: itpInstances[0].status
      });
    }
  }

  // Test 3: Test the actual endpoint
  console.log('\n3. Testing the actual HTTP endpoint...');
  try {
    const response = await fetch(
      `http://localhost:3000/api/projects/${projectId}/lots/${lotId}/export`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ HTTP request error:', error.message);
  }
}

testEndpoint().catch(console.error);
