import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

// Test data generators
const generateLabourEntry = () => ({
  workerName: faker.person.fullName(),
  trade: faker.helpers.arrayElement([
    'Carpenter',
    'Electrician',
    'Plumber',
    'Concrete Worker',
    'General Labour',
  ]),
  company: faker.company.name(),
  startTime: '07:00',
  endTime: '17:00',
  breakDuration: '60',
  workPerformed: faker.lorem.sentence(),
});

const generatePlantEntry = () => ({
  name: faker.helpers.arrayElement([
    'Excavator',
    'Crane',
    'Generator',
    'Concrete Pump',
    'Forklift',
  ]),
  type: faker.helpers.arrayElement([
    'Heavy Machinery',
    'Lifting Equipment',
    'Power Generation',
    'Material Handling',
  ]),
  quantity: faker.number.int({ min: 1, max: 5 }).toString(),
  hoursUsed: faker.number.int({ min: 1, max: 10 }).toString(),
  notes: faker.lorem.sentence(),
});

const generateMaterialEntry = () => ({
  name: faker.helpers.arrayElement(['Concrete', 'Steel Reinforcement', 'Timber', 'Bricks', 'Sand']),
  quantity: faker.number.int({ min: 10, max: 1000 }).toString(),
  unit: faker.helpers.arrayElement(['m³', 'kg', 'tons', 'pieces', 'bags']),
  supplier: faker.company.name(),
  notes: faker.lorem.sentence(),
});

test.describe('Daily Diary Data Persistence', () => {
  let diaryId: string;
  const testData = {
    projectName: '',
    diaryDate: new Date().toISOString().split('T')[0],
    workSummary: faker.lorem.paragraph(),
    weatherConditions: 'Sunny',
    temperatureMin: '15',
    temperatureMax: '25',
    windConditions: 'Light breeze',
    siteConditions: faker.lorem.sentence(),
    accessIssues: faker.lorem.sentence(),
    generalNotes: faker.lorem.paragraph(),
    tomorrowPlannedWork: faker.lorem.paragraph(),
    labour: [generateLabourEntry(), generateLabourEntry(), generateLabourEntry()],
    plant: [generatePlantEntry(), generatePlantEntry()],
    materials: [generateMaterialEntry(), generateMaterialEntry(), generateMaterialEntry()],
  };

  test.beforeEach(async ({ page }) => {
    // Login to the application
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'password123');
    await page.click('button[type="submit"]');

    // Wait for login to complete
    await page.waitForURL('**/dashboard/**');
  });

  test('should create a daily diary with all fields populated', async ({ page }) => {
    // Navigate to daily diaries
    await page.goto('/dashboard/diaries');

    // Click new diary button
    await page.click('text=New Diary Entry');

    // Select project if needed
    const projectSelect = page.locator('select').first();
    if (await projectSelect.isVisible()) {
      const projects = await projectSelect.locator('option').allTextContents();
      if (projects.length > 1) {
        testData.projectName = projects[1]; // Select first actual project
        await projectSelect.selectOption({ label: testData.projectName });
        await page.waitForLoadState('networkidle');
      }
    }

    // Fill in work summary
    await page.fill('textarea[name="work_summary"]', testData.workSummary);

    // Fill weather section
    await page.fill('input[name="weather_conditions"]', testData.weatherConditions);
    await page.fill('input[name="temperature_min"]', testData.temperatureMin);
    await page.fill('input[name="temperature_max"]', testData.temperatureMax);
    await page.fill('input[name="wind_conditions"]', testData.windConditions);
    await page.fill('input[name="site_conditions"]', testData.siteConditions);
    await page.fill('input[name="access_issues"]', testData.accessIssues);

    // Add labour entries
    for (const labour of testData.labour) {
      await page.click('text=Add Labour');

      // If company selection is required
      const companySelect = page.locator('select:has-text("Choose a company")');
      if (await companySelect.isVisible()) {
        const companies = await companySelect.locator('option').allTextContents();
        if (companies.length > 1) {
          await companySelect.selectOption({ index: 1 });
        }
      }

      // Fill labour entry fields
      const lastLabourEntry = page.locator('[data-testid="labour-entry"]').last();
      await lastLabourEntry.locator('input[placeholder*="worker name"]').fill(labour.workerName);
      await lastLabourEntry.locator('input[placeholder*="trade"]').fill(labour.trade);
      await lastLabourEntry.locator('input[type="time"]').first().fill(labour.startTime);
      await lastLabourEntry.locator('input[type="time"]').last().fill(labour.endTime);
      await lastLabourEntry.locator('input[placeholder*="break"]').fill(labour.breakDuration);
      await lastLabourEntry.locator('input[placeholder*="work performed"]').fill(labour.workPerformed);
    }

    // Switch to Plant & Equipment tab
    await page.click('text=Plant & Equipment');

    // Add plant entries
    for (const plant of testData.plant) {
      await page.click('text=Add Plant');

      const lastPlantEntry = page.locator('[data-testid="plant-entry"]').last();
      await lastPlantEntry.locator('input[placeholder*="equipment name"]').fill(plant.name);
      await lastPlantEntry.locator('input[placeholder*="type"]').fill(plant.type);
      await lastPlantEntry.locator('input[placeholder*="quantity"]').fill(plant.quantity);
      await lastPlantEntry.locator('input[placeholder*="hours"]').fill(plant.hoursUsed);
      await lastPlantEntry.locator('input[placeholder*="notes"]').fill(plant.notes);
    }

    // Switch to Materials tab
    await page.click('text=Materials');

    // Add material entries
    for (const material of testData.materials) {
      await page.click('text=Add Material');

      const lastMaterialEntry = page.locator('[data-testid="material-entry"]').last();
      await lastMaterialEntry.locator('input[placeholder*="material name"]').fill(material.name);
      await lastMaterialEntry.locator('input[placeholder*="quantity"]').fill(material.quantity);
      await lastMaterialEntry.locator('input[placeholder*="unit"]').fill(material.unit);
      await lastMaterialEntry.locator('input[placeholder*="supplier"]').fill(material.supplier);
      await lastMaterialEntry.locator('input[placeholder*="notes"]').fill(material.notes);
    }

    // Fill additional notes
    await page.fill('textarea[name="general_notes"]', testData.generalNotes);
    await page.fill('textarea[name="tomorrow_planned_work"]', testData.tomorrowPlannedWork);

    // Save the diary
    await page.click('button:has-text("Save Diary")');

    // Wait for navigation to the diary detail page
    await page.waitForURL('**/dashboard/diaries/**');

    // Extract diary ID from URL
    const url = page.url();
    const match = url.match(/diaries\/([a-f0-9-]+)/);
    if (match) {
      diaryId = match[1];
    }

    // Verify success message
    await expect(page.locator('text=Daily diary created successfully')).toBeVisible();
  });

  test('should display all saved data when viewing the diary', async ({ page }) => {
    // Navigate directly to the saved diary
    await page.goto(`/dashboard/diaries/${diaryId}`);

    // Wait for diary to load
    await page.waitForSelector('h1:has-text("DD-")');

    // Verify work summary
    await expect(page.locator('text=' + testData.workSummary.substring(0, 50))).toBeVisible();

    // Verify weather data
    await expect(page.locator('text=' + testData.weatherConditions)).toBeVisible();

    // Verify Labour section
    await expect(page.locator('h2:has-text("Labour")')).toBeVisible();

    // Check each labour entry
    for (const labour of testData.labour) {
      // Verify worker name is displayed
      await expect(page.locator(`td:has-text("${labour.workerName}")`)).toBeVisible();

      // Verify trade is displayed
      await expect(page.locator(`td:has-text("${labour.trade}")`)).toBeVisible();

      // Verify hours (should calculate to 8 hours with 1 hour break)
      await expect(page.locator('td:has-text("8")')).toBeVisible();

      // Verify work performed
      await expect(page.locator(`td:has-text("${labour.workPerformed}")`)).toBeVisible();
    }

    // Verify Plant & Equipment section
    await expect(page.locator('h2:has-text("Plant & Equipment")')).toBeVisible();

    // Check each plant entry
    for (const plant of testData.plant) {
      await expect(page.locator(`td:has-text("${plant.name}")`)).toBeVisible();
      await expect(page.locator(`td:has-text("${plant.type}")`)).toBeVisible();
      await expect(page.locator(`td:has-text("${plant.quantity}")`)).toBeVisible();
      await expect(page.locator(`td:has-text("${plant.hoursUsed}")`)).toBeVisible();
      await expect(page.locator(`td:has-text("${plant.notes}")`)).toBeVisible();
    }

    // Verify Materials section
    await expect(page.locator('h2:has-text("Materials")')).toBeVisible();

    // Check each material entry
    for (const material of testData.materials) {
      await expect(page.locator(`td:has-text("${material.name}")`)).toBeVisible();
      await expect(page.locator(`td:has-text("${material.quantity}")`)).toBeVisible();
      await expect(page.locator(`td:has-text("${material.unit}")`)).toBeVisible();
      await expect(page.locator(`td:has-text("${material.supplier}")`)).toBeVisible();
      await expect(page.locator(`td:has-text("${material.notes}")`)).toBeVisible();
    }

    // Verify additional notes
    await expect(page.locator('h2:has-text("Additional Notes")')).toBeVisible();
    await expect(page.locator('text=' + testData.generalNotes.substring(0, 50))).toBeVisible();
  });

  test('should allow editing and preserve all data', async ({ page }) => {
    // Navigate to the saved diary
    await page.goto(`/dashboard/diaries/${diaryId}`);

    // Click edit button
    await page.click('button:has-text("Edit")');

    // Wait for edit page to load
    await page.waitForURL(`**/dashboard/diaries/${diaryId}/edit`);

    // Verify all existing data is populated in the form
    const workSummaryField = page.locator('textarea[name="work_summary"]');
    await expect(workSummaryField).toHaveValue(testData.workSummary);

    // Update some fields
    const updatedWorkSummary = testData.workSummary + ' - UPDATED';
    await workSummaryField.fill(updatedWorkSummary);

    // Add one more labour entry
    await page.click('text=Add Labour');
    const newLabour = generateLabourEntry();
    const lastLabourEntry = page.locator('[data-testid="labour-entry"]').last();
    await lastLabourEntry.locator('input[placeholder*="worker name"]').fill(newLabour.workerName);
    await lastLabourEntry.locator('input[placeholder*="trade"]').fill(newLabour.trade);
    await lastLabourEntry.locator('input[placeholder*="work performed"]').fill(newLabour.workPerformed);

    // Save changes
    await page.click('button:has-text("Save Changes")');

    // Wait for navigation back to detail page
    await page.waitForURL(`**/dashboard/diaries/${diaryId}`);

    // Verify updated data
    await expect(page.locator('text=' + updatedWorkSummary.substring(0, 50))).toBeVisible();

    // Verify new labour entry
    await expect(page.locator(`td:has-text("${newLabour.workerName}")`)).toBeVisible();

    // Verify original labour entries are still present
    for (const labour of testData.labour) {
      await expect(page.locator(`td:has-text("${labour.workerName}")`)).toBeVisible();
    }
  });

  test('should export diary to PDF with all data', async ({ page }) => {
    // Navigate to the saved diary
    await page.goto(`/dashboard/diaries/${diaryId}`);

    // Setup download listener
    const downloadPromise = page.waitForEvent('download');

    // Click PDF export button
    await page.click('button:has-text("PDF")');

    // Wait for download
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toContain('.html'); // Currently exports as HTML

    // Save and read the file content
    const path = await download.path();
    if (path) {
      const fs = require('fs');
      const content = fs.readFileSync(path, 'utf8');

      // Verify exported content contains all critical data
      expect(content).toContain(testData.workSummary);
      for (const labour of testData.labour) {
        expect(content).toContain(labour.workerName);
        expect(content).toContain(labour.trade);
      }
      for (const plant of testData.plant) {
        expect(content).toContain(plant.name);
      }
      for (const material of testData.materials) {
        expect(content).toContain(material.name);
      }
    }
  });

  test('should handle empty entries gracefully', async ({ page }) => {
    // Create a new diary with minimal data
    await page.goto('/dashboard/diaries/new');

    // Fill only required fields
    await page.fill('textarea[name="work_summary"]', 'Minimal diary entry for testing');

    // Save without adding any labour, plant, or materials
    await page.click('button:has-text("Save Diary")');

    // Should save successfully
    await page.waitForURL('**/dashboard/diaries/**');
    await expect(page.locator('text=Daily diary created successfully')).toBeVisible();

    // Verify the diary displays correctly with empty sections
    await expect(page.locator('text=Minimal diary entry for testing')).toBeVisible();
  });
});

test.describe('Daily Diary Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard/**');
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/dashboard/diaries/new');

    // Try to save without filling required fields
    await page.click('button:has-text("Save Diary")');

    // Should show validation errors
    await expect(page.locator('text=Work summary must be at least 10 characters')).toBeVisible();
  });

  test('should calculate labour hours correctly', async ({ page }) => {
    await page.goto('/dashboard/diaries/new');

    // Add a labour entry
    await page.click('text=Add Labour');

    const labourEntry = page.locator('[data-testid="labour-entry"]').last();

    // Set times: 7am to 5pm = 10 hours
    await labourEntry.locator('input[type="time"]').first().fill('07:00');
    await labourEntry.locator('input[type="time"]').last().fill('17:00');

    // Set 1 hour break
    await labourEntry.locator('input[placeholder*="break"]').fill('60');

    // Should show 9 hours total (10 - 1 break)
    await expect(labourEntry.locator('text=9.0h')).toBeVisible();

    // Change to overtime hours (more than 8)
    await labourEntry.locator('input[type="time"]').last().fill('19:00'); // 7am to 7pm = 12 hours

    // Should show 11 hours total with 3 hours overtime
    await expect(labourEntry.locator('text=11.0h')).toBeVisible();
    await expect(labourEntry.locator('text=(3.0 OT)')).toBeVisible();
  });
});
