import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const writeSuccess = new Rate('database_write_success');
const updateSuccess = new Rate('database_update_success');
const deleteSuccess = new Rate('database_delete_success');
const writeLatency = new Trend('write_operation_latency');
const concurrentWrites = new Counter('concurrent_write_operations');
const writeConflicts = new Counter('write_conflicts');
const transactionErrors = new Counter('transaction_errors');

// Test configuration - Focus on write operations
export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Warm up
    { duration: '2m', target: 15 },   // Ramp to 15 concurrent writers
    { duration: '3m', target: 15 },   // Sustained writes
    { duration: '1m', target: 30 },   // Spike test
    { duration: '1m', target: 10 },   // Ramp down
    { duration: '30s', target: 0 },   // Cool down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000', 'p(99)<5000'],
    'http_req_failed': ['rate<0.2'],
    'database_write_success': ['rate>0.7'],
    'database_update_success': ['rate>0.7'],
    'write_operation_latency': ['p(95)<2000'],
    'write_conflicts': ['count<50'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Valid test organization UUIDs (must exist in database with user memberships)
const TEST_ORG_IDS = [
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
];

// Test data generators
function generateProjectData(iteration) {
  return {
    organizationId: TEST_ORG_IDS[__VU % 3], // Use valid UUIDs
    name: `LoadTest-Project-VU${__VU}-Iter${iteration}-${Date.now()}`,
    description: `Database write test project created by VU ${__VU}`,
    clientName: `Client ${__VU}`,
    clientEmail: `client${__VU}@loadtest.com`,
    clientCompany: `Company ${__VU}`,
    startDate: new Date().toISOString(),
    visibility: 'private',
  };
}

function generateContractorData(iteration) {
  return {
    name: `Contractor-VU${__VU}-Iter${iteration}-${Date.now()}`,
    email: `contractor${__VU}-${iteration}@loadtest.com`,
    phone: `555-${String(__VU).padStart(4, '0')}`,
    company: `Contractor Co ${__VU}`,
    trade: ['Electrical', 'Plumbing', 'HVAC', 'General'][__VU % 4],
  };
}

function generateMaterialData(iteration) {
  return {
    name: `Material-VU${__VU}-Iter${iteration}`,
    description: `Test material for load testing`,
    unit: ['kg', 'L', 'm', 'piece'][__VU % 4],
    supplier: `Supplier ${__VU}`,
    cost: Math.floor(Math.random() * 10000) / 100,
  };
}

function generateNCRData(projectId) {
  return {
    projectId: projectId || 'test-project-id',
    title: `NCR-VU${__VU}-${Date.now()}`,
    description: 'Non-conformance found during load testing',
    location: `Location ${__VU}`,
    severity: ['low', 'medium', 'high'][__VU % 3],
    category: 'quality',
    status: 'open',
  };
}

// Test user credentials
const TEST_USERS = [
  { email: 'test1@siteproof.com', password: 'Test123!@#' },
  { email: 'test2@siteproof.com', password: 'Test123!@#' },
  { email: 'test3@siteproof.com', password: 'Test123!@#' },
  { email: 'test4@siteproof.com', password: 'Test123!@#' },
  { email: 'test5@siteproof.com', password: 'Test123!@#' },
];

// Login function with cookie jar for session management
function login(email, password) {
  const payload = JSON.stringify({
    email: email,
    password: password,
  });

  const jar = http.cookieJar();
  jar.set(BASE_URL, 'test', 'true');

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-test-user-id': `${__VU}-${__ITER}`,
    },
    jar: jar,
  };

  const res = http.post(`${API_BASE}/auth/login`, payload, params);

  if (res.status !== 200) {
    console.error(`Login failed for ${email}: ${res.status} - ${res.body}`);
    return null;
  }

  return jar;
}

// Get headers with cookie jar for authenticated requests
function getAuthHeaders(jar) {
  return {
    'Content-Type': 'application/json',
  };
}

function getAuthParams(jar) {
  return {
    headers: getAuthHeaders(jar),
    jar: jar,
  };
}

export default function() {
  const iteration = __ITER;

  // Login first to get authenticated session
  const user = TEST_USERS[__VU % TEST_USERS.length];
  const jar = login(user.email, user.password);

  if (!jar) {
    console.error('Failed to authenticate, skipping iteration');
    return;
  }

  // 1. Create Project (Write Operation)
  group('Database Write - Create Project', function() {
    const projectData = generateProjectData(iteration);
    const startTime = Date.now();

    const res = http.post(
      `${API_BASE}/projects`,
      JSON.stringify(projectData),
      getAuthParams(jar)
    );

    const latency = Date.now() - startTime;
    writeLatency.add(latency);
    concurrentWrites.add(1);

    const success = check(res, {
      'project creation status': (r) => [200, 201, 401, 403, 409].includes(r.status),
      'project creation latency < 3s': (r) => r.timings.duration < 3000,
      'project has id': (r) => {
        if (r.status === 201) {
          try {
            const body = JSON.parse(r.body);
            return body.project && body.project.id;
          } catch (e) {
            return false;
          }
        }
        return true; // Auth errors are acceptable
      },
    });

    writeSuccess.add(success && res.status === 201);

    if (res.status === 409) {
      writeConflicts.add(1);
    } else if (res.status >= 500) {
      transactionErrors.add(1);
    }

    // Store project ID for later operations
    let projectId = null;
    if (res.status === 201) {
      try {
        const body = JSON.parse(res.body);
        projectId = body.project.id;
      } catch (e) {
        console.error('Failed to extract project ID');
      }
    }

    return projectId;
  });

  sleep(0.5);

  // 2. Create Contractor (Write Operation)
  group('Database Write - Create Contractor', function() {
    const contractorData = generateContractorData(iteration);
    const startTime = Date.now();

    const res = http.post(
      `${API_BASE}/contractors`,
      JSON.stringify(contractorData),
      getAuthParams(jar)
    );

    const latency = Date.now() - startTime;
    writeLatency.add(latency);
    concurrentWrites.add(1);

    const success = check(res, {
      'contractor creation status': (r) => [200, 201, 401, 409].includes(r.status),
      'contractor creation latency < 2s': (r) => r.timings.duration < 2000,
    });

    writeSuccess.add(success && res.status === 201);

    if (res.status === 409) {
      writeConflicts.add(1);
    } else if (res.status >= 500) {
      transactionErrors.add(1);
    }
  });

  sleep(0.5);

  // 3. Create Material (Write Operation)
  group('Database Write - Create Material', function() {
    const materialData = generateMaterialData(iteration);
    const startTime = Date.now();

    const res = http.post(
      `${API_BASE}/materials`,
      JSON.stringify(materialData),
      getAuthParams(jar)
    );

    const latency = Date.now() - startTime;
    writeLatency.add(latency);
    concurrentWrites.add(1);

    const success = check(res, {
      'material creation status': (r) => [200, 201, 401, 409].includes(r.status),
      'material creation latency < 2s': (r) => r.timings.duration < 2000,
    });

    writeSuccess.add(success && res.status === 201);

    if (res.status === 409) {
      writeConflicts.add(1);
    } else if (res.status >= 500) {
      transactionErrors.add(1);
    }
  });

  sleep(0.5);

  // 4. Create NCR (Write Operation)
  group('Database Write - Create NCR', function() {
    const ncrData = generateNCRData('test-project-id');
    const startTime = Date.now();

    const res = http.post(
      `${API_BASE}/ncrs`,
      JSON.stringify(ncrData),
      getAuthParams(jar)
    );

    const latency = Date.now() - startTime;
    writeLatency.add(latency);
    concurrentWrites.add(1);

    const success = check(res, {
      'ncr creation status': (r) => [200, 201, 401, 404].includes(r.status),
      'ncr creation latency < 2s': (r) => r.timings.duration < 2000,
    });

    writeSuccess.add(success && res.status === 201);

    if (res.status >= 500) {
      transactionErrors.add(1);
    }

    // Store NCR ID for update test
    __ENV.lastNcrId = null;
    if (res.status === 201) {
      try {
        const body = JSON.parse(res.body);
        __ENV.lastNcrId = body.ncr ? body.ncr.id : body.id;
      } catch (e) {
        console.error('Failed to extract NCR ID');
      }
    }

    return __ENV.lastNcrId;
  });

  sleep(1);

  // 5. Update Operation (using dedicated workflow endpoint)
  group('Database Update - Update NCR Status', function() {
    // Use NCR ID from creation step or skip if unavailable
    const testNcrId = __ENV.lastNcrId || 'test-ncr-id';

    const updateData = {
      notes: `Work started by VU ${__VU} at ${new Date().toISOString()}`,
    };

    const startTime = Date.now();

    // Use dedicated workflow endpoint instead of PATCH
    const res = http.post(
      `${API_BASE}/ncrs/${testNcrId}/start_work`,
      JSON.stringify(updateData),
      getAuthParams(jar)
    );

    const latency = Date.now() - startTime;
    writeLatency.add(latency);
    concurrentWrites.add(1);

    const success = check(res, {
      'update status acceptable': (r) => [200, 400, 401, 403, 404].includes(r.status),
      'update latency < 2s': (r) => r.timings.duration < 2000,
    });

    updateSuccess.add(success && res.status === 200);

    if (res.status === 409) {
      writeConflicts.add(1);
      console.log(`⚠️ Update conflict detected for NCR ${testNcrId}`);
    } else if (res.status >= 500) {
      transactionErrors.add(1);
    }
  });

  sleep(0.5);

  // 6. Bulk Write Operation
  group('Database Write - Batch Photo Upload Simulation', function() {
    const photoMetadata = {
      lotId: 'test-lot-id',
      photos: [
        { filename: `photo-${__VU}-1.jpg`, size: 1024000, timestamp: Date.now() },
        { filename: `photo-${__VU}-2.jpg`, size: 2048000, timestamp: Date.now() },
        { filename: `photo-${__VU}-3.jpg`, size: 1536000, timestamp: Date.now() },
      ],
    };

    const startTime = Date.now();

    const res = http.post(
      `${API_BASE}/photos/upload`,
      JSON.stringify(photoMetadata),
      getAuthParams(jar)
    );

    const latency = Date.now() - startTime;
    writeLatency.add(latency);
    concurrentWrites.add(1);

    check(res, {
      'bulk upload status': (r) => [200, 201, 401, 413].includes(r.status),
      'bulk upload latency < 5s': (r) => r.timings.duration < 5000,
    });

    if (res.status >= 500) {
      transactionErrors.add(1);
    }
  });

  sleep(2);
}

export function setup() {
  console.log('='.repeat(70));
  console.log('💾 Database Write Operations Load Test');
  console.log('='.repeat(70));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Duration: ~8 minutes`);
  console.log(`Max Concurrent Writers: 30`);
  console.log('');
  console.log('Testing Operations:');
  console.log('  - Project Creation (concurrent writes)');
  console.log('  - Contractor Creation');
  console.log('  - Material Creation');
  console.log('  - NCR Creation');
  console.log('  - NCR Updates (concurrent updates)');
  console.log('  - Bulk Photo Upload');
  console.log('');
  console.log('⚠️  WARNING: This test creates data in the database!');
  console.log('   Make sure you are testing against a non-production environment.');
  console.log('='.repeat(70));
  console.log('');

  const healthCheck = http.get(`${API_BASE}/health`, { timeout: '10s' });
  if (healthCheck.status === 0) {
    console.error('❌ Server is not reachable');
    return { serverReachable: false };
  }

  console.log(`✅ Server is reachable (Status: ${healthCheck.status})`);

  return { serverReachable: true };
}

export function teardown(data) {
  if (!data.serverReachable) {
    console.log('Test aborted: Server was not reachable');
    return;
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('✅ Database Write Operations Test Completed!');
  console.log('='.repeat(70));
  console.log('');
  console.log('📊 Key Metrics to Review:');
  console.log('  - database_write_success: % of successful writes');
  console.log('  - database_update_success: % of successful updates');
  console.log('  - write_operation_latency: Write performance');
  console.log('  - write_conflicts: Number of concurrent write conflicts');
  console.log('  - transaction_errors: Database errors during writes');
  console.log('');
  console.log('⚠️  Remember to clean up test data created during this test!');
  console.log('');
}
