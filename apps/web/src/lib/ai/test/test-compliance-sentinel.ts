// Test script for ComplianceSentinel agent
// Run with: npx tsx src/lib/ai/test/test-compliance-sentinel.ts

import { ComplianceSentinel } from '../agents/compliance-sentinel';
import path from 'path';
import * as fs from 'fs';

// Load environment variables manually for test script
if (!process.env.ANTHROPIC_API_KEY) {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
    if (match) {
      process.env.ANTHROPIC_API_KEY = match[1].trim();
    }
  } catch (error) {
    console.error('Could not read .env.local file');
  }
}

// Test project data - Road construction project with potential compliance issues
const testProject = {
  id: 'proj_123',
  name: 'Road Construction - Georges River',
  description: 'New road with earthworks and drainage infrastructure',
  location: 'Georges River, NSW',
  status: 'active',
  organization_id: 'org_123',

  // Project type and council information
  type: 'civil_infrastructure',
  council: 'Georges River',

  // Project specifications
  settings: {
    work_types: ['earthworks', 'drainage', 'asphalt'],
    council: 'Georges River',
    earthworks_volume: 2000, // m³
    soil_type: 'clay',
    supervision_level: 'level_1', // High risk site
    drainage: {
      pipe_diameter: 600, // mm
      gradient: 1.2, // %
      material: 'concrete',
    },
  },

  // ITP test results - showing potential compliance issues
  itp_instances: [
    {
      id: 'itp_001',
      template_id: 'itp_earthworks',
      inspection_status: 'completed',
      data: {
        compaction_tests: [
          {
            test_id: 'ct_001',
            date: '2024-01-15',
            location: 'CH 100-150',
            dry_density: 1.82, // t/m³
            max_dry_density: 1.87, // t/m³
            moisture_content: 18.5, // %
            supervision_level: 'level_1',
            // This gives 97.3% compaction - FAIL for Level 1 (needs 98%)
          },
          {
            test_id: 'ct_002',
            date: '2024-01-16',
            location: 'CH 150-200',
            dry_density: 1.84,
            max_dry_density: 1.87,
            moisture_content: 17.2,
            supervision_level: 'level_1',
            // This gives 98.4% compaction - PASS for Level 1
          },
        ],
        layer_thickness: 250, // mm - check if compliant
        material: 'clay',
      },
    },
    {
      id: 'itp_002',
      template_id: 'itp_drainage',
      inspection_status: 'pending',
      data: {
        pipe_tests: [
          {
            test_id: 'pt_001',
            gradient_achieved: 1.2, // %
            cover_depth: 280, // mm - Below 300mm minimum under traffic!
            bedding_material: 'sand',
          },
        ],
      },
    },
  ],

  // Weather conditions for analysis
  weather_conditions: {
    current_temp: 35, // °C - Hot weather
    rainfall_7days: 45, // mm - Recent significant rain
    forecast_rain: true, // Rain forecast in next 48 hours
    last_rain_date: '2024-01-10', // 5 days ago
  },

  // Additional test results
  test_results: [
    {
      test_type: 'compaction',
      value: 97.3,
      requirement: 98,
      unit: '%',
      date: '2024-01-15',
    },
    {
      test_type: 'moisture',
      value: 18.5,
      requirement: 16,
      unit: '%',
      date: '2024-01-15',
    },
  ],

  // Project timeline
  start_date: '2024-01-01',
  end_date: '2024-06-30',
  critical_milestones: [
    { name: 'Earthworks Complete', date: '2024-02-28' },
    { name: 'Drainage Complete', date: '2024-04-15' },
    { name: 'Asphalt Complete', date: '2024-06-15' },
  ],
};

async function runComplianceTest() {
  console.log('🚀 Starting ComplianceSentinel Test\n');
  console.log('📋 Project:', testProject.name);
  console.log('📍 Location:', testProject.location);
  console.log('🏛️ Council:', testProject.council);
  console.log('🚧 Work Types:', testProject.settings.work_types.join(', '));
  console.log('\n' + '='.repeat(60) + '\n');

  try {
    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('❌ Error: ANTHROPIC_API_KEY not found in environment');
      console.log('Please set ANTHROPIC_API_KEY in your .env.local file');
      process.exit(1);
    }

    console.log('🤖 Initializing ComplianceSentinel agent...\n');

    // Create agent instance
    const agent = new ComplianceSentinel('org_123');

    console.log('🔍 Analyzing project for compliance...');
    console.log('This may take 10-30 seconds as the AI analyzes all aspects.\n');

    // Run compliance analysis
    const startTime = Date.now();
    const result = await agent.analyzeProject(testProject);
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n' + '='.repeat(60));
    console.log('✅ ANALYSIS COMPLETE');
    console.log('='.repeat(60) + '\n');

    // Display results
    console.log('📊 COMPLIANCE STATUS:', result.compliance_status);
    console.log('⚠️  RISK LEVEL:', result.risk_level);
    console.log('🔧 Tool Calls Made:', result.tool_calls_made);
    console.log('⏱️  Execution Time:', executionTime + 's');

    // Display issues
    if (result.issues && result.issues.length > 0) {
      console.log('\n🚨 COMPLIANCE ISSUES FOUND:');
      console.log('-'.repeat(40));
      result.issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. [${issue.severity}] ${issue.category}`);
        console.log(`   Standard: ${issue.standard} ${issue.section ? '§' + issue.section : ''}`);
        console.log(`   Description: ${issue.description}`);
        if (issue.remediation_required) {
          console.log(`   ⚠️  Remediation Required`);
        }
      });
    }

    // Display financial impact
    console.log('\n💰 FINANCIAL IMPACT:');
    console.log('-'.repeat(40));
    console.log(
      `Remediation Cost: $${result.financial_impact.estimated_remediation_cost.toLocaleString()}`
    );
    console.log(
      `Potential Penalties: $${result.financial_impact.potential_penalties.toLocaleString()}`
    );
    console.log(`Delay Costs: $${result.financial_impact.delay_costs.toLocaleString()}`);
    console.log(`TOTAL RISK: $${result.financial_impact.total_risk.toLocaleString()}`);

    // Display timeline impact
    console.log('\n📅 TIMELINE IMPACT:');
    console.log('-'.repeat(40));
    console.log(`Estimated Delay: ${result.timeline_impact.estimated_delay_days} days`);
    console.log(
      `Critical Path Affected: ${result.timeline_impact.critical_path_affected ? 'YES ⚠️' : 'NO ✅'}`
    );
    console.log(`Weather Risk Days: ${result.timeline_impact.weather_risk_days} days`);

    // Display recommendations
    if (result.recommendations && result.recommendations.length > 0) {
      console.log('\n✅ RECOMMENDATIONS:');
      console.log('-'.repeat(40));
      result.recommendations.forEach((rec, index) => {
        console.log(`\n${index + 1}. [${rec.priority}] ${rec.action}`);
        if (rec.standard_reference) {
          console.log(`   Reference: ${rec.standard_reference}`);
        }
        if (rec.cost_estimate) {
          console.log(`   Estimated Cost: $${rec.cost_estimate.toLocaleString()}`);
        }
      });
    }

    // Display summary analysis
    console.log('\n📝 ANALYSIS SUMMARY:');
    console.log('-'.repeat(40));
    console.log(result.analysis);

    // Get tool execution log
    const toolLog = agent.getToolExecutionLog();
    if (toolLog.length > 0) {
      console.log('\n🔧 TOOLS EXECUTED:');
      console.log('-'.repeat(40));
      toolLog.forEach((execution, index) => {
        console.log(`${index + 1}. ${execution.tool}`);
        console.log(`   Input: ${JSON.stringify(execution.input).substring(0, 100)}...`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed successfully!');
    console.log('='.repeat(60));

    // Save results to file for review
    const outputPath = path.join(process.cwd(), 'compliance-test-result.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n💾 Full results saved to: ${outputPath}`);
  } catch (error) {
    console.error('\n❌ Error during compliance analysis:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Expected issues to be detected:
console.log('🎯 EXPECTED COMPLIANCE ISSUES TO DETECT:');
console.log('-'.repeat(40));
console.log('1. Compaction at 97.3% - FAILS Level 1 requirement of 98%');
console.log('2. Drainage cover at 280mm - Below 300mm minimum');
console.log('3. Clay + recent rain (45mm) - 21-day drying period needed');
console.log('4. Georges River council - 259 days average (HIGH RISK)');
console.log('5. Hot weather (35°C) + rain forecast - Work restrictions');
console.log('\n' + '='.repeat(60) + '\n');

// Run the test
runComplianceTest().catch(console.error);
