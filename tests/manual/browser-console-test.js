/**
 * Browser Console Test Script for Report Functionality
 * 
 * Instructions:
 * 1. Open your browser and navigate to http://localhost:3000
 * 2. Log in to the application
 * 3. Navigate to the reports page (/reporting)
 * 4. Open browser Developer Tools (F12)
 * 5. Go to the Console tab
 * 6. Copy and paste this entire script
 * 7. Press Enter to run
 * 
 * This will test the report functionality and show detailed debug information.
 */

(async function testReportsInBrowser() {
  console.log('🔍 Testing Report Functionality in Browser');
  console.log('='.repeat(50));

  // Test 1: Check authentication
  console.log('\n1. Checking authentication...');
  try {
    const authResponse = await fetch('/api/reports', {
      credentials: 'include',
    });
    console.log('Auth check status:', authResponse.status);
    
    if (authResponse.status === 401) {
      console.error('❌ Not authenticated! Please log in first.');
      return;
    } else if (authResponse.ok) {
      console.log('✅ Authentication successful');
    } else {
      console.log('⚠️ Unexpected response:', authResponse.status);
    }
  } catch (error) {
    console.error('❌ Auth check failed:', error);
    return;
  }

  // Test 2: Fetch reports list
  console.log('\n2. Fetching reports list...');
  let reports = [];
  try {
    const reportsResponse = await fetch('/api/reports?limit=5', {
      credentials: 'include',
    });
    
    if (reportsResponse.ok) {
      const data = await reportsResponse.json();
      reports = data.reports || [];
      console.log('✅ Found', reports.length, 'reports');
      
      reports.forEach((report, index) => {
        console.log(`  ${index + 1}. ${report.report_name} (${report.status}) - ID: ${report.id}`);
      });
    } else {
      console.error('❌ Failed to fetch reports:', reportsResponse.status);
    }
  } catch (error) {
    console.error('❌ Reports fetch failed:', error);
  }

  // Test 3: Test download for first available report
  if (reports.length > 0) {
    const testReport = reports.find(r => r.status === 'completed' || r.status === 'processing') || reports[0];
    console.log(`\n3. Testing download for report: ${testReport.report_name} (${testReport.status})`);
    
    try {
      const downloadResponse = await fetch(`/api/reports/${testReport.id}/download`, {
        credentials: 'include',
      });
      
      console.log('Download response status:', downloadResponse.status);
      console.log('Download response headers:', Object.fromEntries(downloadResponse.headers.entries()));
      
      if (downloadResponse.ok) {
        console.log('✅ Download API working!');
        
        // Test actual download
        const blob = await downloadResponse.blob();
        console.log('Download blob size:', blob.size, 'bytes');
        console.log('Download blob type:', blob.type);
        
        if (blob.size > 0) {
          // Create download link
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `test-download-${testReport.report_name}.${testReport.format}`;
          link.style.display = 'none';
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          console.log('✅ Download triggered successfully!');
        } else {
          console.error('❌ Downloaded file is empty');
        }
      } else {
        const errorText = await downloadResponse.text();
        console.error('❌ Download failed:', downloadResponse.status, errorText);
      }
    } catch (error) {
      console.error('❌ Download test failed:', error);
    }
  } else {
    console.log('\n3. No reports available to test download');
  }

  // Test 4: Create a test report if none exist
  if (reports.length === 0) {
    console.log('\n4. Creating a test report...');
    try {
      const createResponse = await fetch('/api/reports/generate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report_type: 'project_summary',
          report_name: 'Browser Test Report',
          description: 'Test report created from browser console',
          format: 'pdf',
          project_id: '00000000-0000-0000-0000-000000000001', // Mock project ID
          date_range: {
            start: '2024-01-01',
            end: '2024-12-31'
          },
          include_photos: false,
          include_signatures: false
        })
      });

      if (createResponse.ok) {
        const createData = await createResponse.json();
        console.log('✅ Test report created:', createData);
        console.log('  You should now see this report in the UI');
        console.log('  Try clicking on it to download');
      } else {
        const errorText = await createResponse.text();
        console.error('❌ Failed to create test report:', createResponse.status, errorText);
      }
    } catch (error) {
      console.error('❌ Report creation failed:', error);
    }
  }

  // Test 5: UI functionality
  console.log('\n5. Testing UI click functionality...');
  const reportCards = document.querySelectorAll('.bg-white.rounded-lg.border');
  console.log('Found', reportCards.length, 'report cards in UI');
  
  if (reportCards.length > 0) {
    console.log('✅ Report cards found in DOM');
    console.log('  Try clicking on a report card to see console logs');
    console.log('  Look for "Report card clicked:" messages');
  } else {
    console.log('⚠️ No report cards found in UI');
    console.log('  Make sure you are on the reports page (/reporting)');
  }

  console.log('\n' + '='.repeat(50));
  console.log('📋 Browser Test Complete');
  console.log('\nIf downloads work here but not in the UI:');
  console.log('1. Check for JavaScript errors in the Console tab');
  console.log('2. Make sure you clicked on the report card, not just buttons');
  console.log('3. Look for the "Click to download" blue label on report cards');
  console.log('4. Check that the report status is "completed" or "processing"');
})();