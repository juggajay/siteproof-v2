#!/usr/bin/env node

/**
 * Test script to debug report API issues without browser
 */

async function testReportAPI() {
  console.log('\n🔍 Testing Report API Functionality\n');
  console.log('='.repeat(50));

  try {
    // 1. Test reports list endpoint
    console.log('\n1. Testing GET /api/reports...');
    const reportsResponse = await fetch(`http://localhost:3000/api/reports`);
    console.log('Status:', reportsResponse.status);
    console.log('Headers:', Object.fromEntries(reportsResponse.headers.entries()));
    
    if (reportsResponse.ok) {
      const reportsData = await reportsResponse.json();
      console.log('Reports count:', reportsData.reports?.length || 0);
      
      if (reportsData.reports && reportsData.reports.length > 0) {
        const firstReport = reportsData.reports[0];
        console.log('First report ID:', firstReport.id);
        console.log('First report status:', firstReport.status);
        console.log('First report format:', firstReport.format);
        console.log('First report name:', firstReport.report_name);
        
        // 2. Test download endpoint
        console.log(`\n2. Testing GET /api/reports/${firstReport.id}/download...`);
        const downloadResponse = await fetch(`http://localhost:3000/api/reports/${firstReport.id}/download`);
        console.log('Download status:', downloadResponse.status);
        console.log('Download headers:', Object.fromEntries(downloadResponse.headers.entries()));
        
        if (downloadResponse.ok) {
          const contentType = downloadResponse.headers.get('content-type');
          const contentLength = downloadResponse.headers.get('content-length');
          const disposition = downloadResponse.headers.get('content-disposition');
          
          console.log('✅ Download endpoint working!');
          console.log('Content-Type:', contentType);
          console.log('Content-Length:', contentLength);
          console.log('Content-Disposition:', disposition);
          
          // Try to get a small portion of the data to verify it's valid
          const buffer = await reportsResponse.arrayBuffer();
          console.log('Downloaded bytes:', buffer.byteLength);
          
          if (contentType?.includes('application/pdf')) {
            const view = new Uint8Array(buffer.slice(0, 10));
            console.log('First few bytes (PDF check):', String.fromCharCode(...view));
            const pdfHeader = new Uint8Array(buffer.slice(0, 4));
            console.log('Is PDF?', String.fromCharCode(...pdfHeader) === '%PDF');
          }
          
        } else {
          const errorText = await downloadResponse.text();
          console.log('❌ Download failed:', errorText);
        }
        
      } else {
        console.log('⚠️ No reports found - creating a test report...');
        
        // 3. Test report creation
        console.log('\n3. Testing POST /api/reports/generate...');
        const createResponse = await fetch(`http://localhost:3000/api/reports/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            report_type: 'project_summary',
            report_name: 'API Test Report',
            description: 'Test report created via API',
            format: 'pdf',
            project_id: '00000000-0000-0000-0000-000000000001', // Mock UUID
            date_range: {
              start: '2024-01-01',
              end: '2024-12-31'
            },
            include_photos: false,
            include_signatures: false
          })
        });
        
        console.log('Create status:', createResponse.status);
        console.log('Create headers:', Object.fromEntries(createResponse.headers.entries()));
        
        if (createResponse.ok) {
          const createData = await createResponse.json();
          console.log('✅ Report created:', createData);
          
          if (createData.reportId) {
            // Test immediate download
            console.log(`\n4. Testing immediate download for: ${createData.reportId}...`);
            const immediateDownloadResponse = await fetch(`http://localhost:3000/api/reports/${createData.reportId}/download`);
            console.log('Immediate download status:', immediateDownloadResponse.status);
            
            if (immediateDownloadResponse.ok) {
              console.log('✅ Immediate download works!');
              const contentType = immediateDownloadResponse.headers.get('content-type');
              const contentLength = immediateDownloadResponse.headers.get('content-length');
              console.log('Content-Type:', contentType);
              console.log('Content-Length:', contentLength);
            } else {
              const errorText = await immediateDownloadResponse.text();
              console.log('❌ Immediate download failed:', errorText);
            }
          }
        } else {
          const errorText = await createResponse.text();
          console.log('❌ Report creation failed:', errorText);
        }
      }
      
    } else {
      const errorText = await reportsResponse.text();
      console.log('❌ Reports list failed:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('📋 API Test Complete');
}

// Run the test
testReportAPI().catch(console.error);