const testNCRCreation = async () => {
  // Test data with empty contractor_id
  const formData = new FormData();
  formData.append('title', 'Test NCR Title');
  formData.append('description', 'This is a test NCR description with sufficient length');
  formData.append('severity', 'medium');
  formData.append('category', 'Quality');
  formData.append('project_id', 'YOUR_PROJECT_ID'); // You'll need to replace this
  formData.append('tags', JSON.stringify(['test']));
  
  // These should NOT be sent if empty
  // formData.append('contractor_id', '');
  // formData.append('assigned_to', '');
  
  console.log('FormData entries:');
  for (let [key, value] of formData.entries()) {
    console.log(`  ${key}: ${value}`);
  }
  
  console.log('\nThis simulates what the client sends after our fix.');
  console.log('Empty UUID fields (contractor_id, assigned_to) are not included.');
};

testNCRCreation();