// Test the exact database query that might be causing 500 errors
console.log('🔍 Testing database query that might cause 500 errors...\n');

// Simulate the query structure that might be failing
console.log('The API route does this query:');
console.log(`
SELECT 
  id,
  template_id,
  name,
  data,
  status,
  completion_percentage,
  created_at,
  updated_at,
  created_by,
  itp_templates!inner(
    id,
    name,
    description,
    structure,
    organization_id
  )
FROM itp_instances
WHERE lot_id = 'lotId' 
  AND project_id = 'projectId'
ORDER BY created_at ASC;
`);

console.log('Potential issues:');
console.log('1. itp_templates!inner join might fail if no matching template');
console.log('2. The name column might not exist in some instances');
console.log('3. Status column mismatch (we already fixed this)');
console.log('4. Foreign key constraint issues');

console.log('\n🔧 Let me check if we need to make the join optional...');