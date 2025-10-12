#!/usr/bin/env node

/**
 * Test script to debug report generation issues
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testReportGeneration() {
  console.log('\n🔍 Testing Report Generation\n');
  console.log('='.repeat(50));

  try {
    // 1. Check if reports bucket exists
    console.log('\n1. Checking Supabase Storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
    } else {
      console.log('Available buckets:', buckets?.map(b => b.name) || []);
      
      const reportsBucket = buckets?.find(b => b.name === 'reports');
      if (!reportsBucket) {
        console.log('\n⚠️  Reports bucket does not exist! Creating it...');
        
        const { data: newBucket, error: createError } = await supabase.storage.createBucket('reports', {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        });
        
        if (createError) {
          console.error('Failed to create reports bucket:', createError);
        } else {
          console.log('✅ Reports bucket created successfully');
        }
      } else {
        console.log('✅ Reports bucket exists');
      }
    }

    // 2. Check recent reports in database
    console.log('\n2. Checking recent reports in database...');
    const { data: reports, error: reportsError } = await supabase
      .from('report_queue')
      .select('id, report_name, status, file_url, error_message, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (reportsError) {
      console.error('Error fetching reports:', reportsError);
    } else {
      console.log(`Found ${reports?.length || 0} recent reports:`);
      reports?.forEach(report => {
        console.log(`\n  - ${report.report_name}`);
        console.log(`    Status: ${report.status}`);
        console.log(`    File URL: ${report.file_url || 'No file URL'}`);
        if (report.error_message) {
          console.log(`    Error: ${report.error_message}`);
        }
      });
    }

    // 3. Test creating a simple PDF
    console.log('\n3. Testing PDF generation library...');
    try {
      const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
      
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      page.drawText('Test Report', {
        x: 50,
        y: 800,
        size: 30,
        font,
        color: rgb(0, 0, 0),
      });
      
      const pdfBytes = await pdfDoc.save();
      console.log(`✅ PDF generated successfully (${pdfBytes.length} bytes)`);
      
      // Try to upload test PDF
      console.log('\n4. Testing file upload to Supabase Storage...');
      const fileName = `test-report-${Date.now()}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reports')
        .upload(fileName, pdfBytes, {
          contentType: 'application/pdf',
          upsert: false,
        });
      
      if (uploadError) {
        console.error('Upload failed:', uploadError);
      } else {
        console.log('✅ File uploaded successfully:', uploadData.path);
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('reports')
          .getPublicUrl(fileName);
        
        console.log('Public URL:', publicUrl);
        
        // Clean up test file
        await supabase.storage.from('reports').remove([fileName]);
        console.log('✅ Test file cleaned up');
      }
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
    }

    // 4. Check if Trigger.dev jobs are registered
    console.log('\n5. Checking background job configuration...');
    console.log('TRIGGER_API_KEY exists:', !!process.env.TRIGGER_API_KEY);
    console.log('TRIGGER_API_URL:', process.env.TRIGGER_API_URL || 'Not set');

  } catch (error) {
    console.error('Test failed:', error);
  }

  console.log('\n' + '='.repeat(50));
  console.log('\n📋 Diagnostics Summary:\n');
  
  console.log('To fix report generation issues:');
  console.log('1. Ensure "reports" bucket exists in Supabase Storage');
  console.log('2. Check that pdf-lib and xlsx are properly installed');
  console.log('3. Verify Trigger.dev is configured for background jobs');
  console.log('4. Check browser console for download errors');
  console.log('5. Ensure file_url is being saved to database after generation');
}

testReportGeneration().catch(console.error);