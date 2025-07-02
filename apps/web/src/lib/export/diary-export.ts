// @ts-nocheck
import * as XLSX from 'xlsx';

export interface DiaryExportData {
  id: string;
  diary_number: string;
  diary_date: string;
  project: {
    name: string;
    client_name?: string;
  };
  work_summary: string;
  weather?: any;
  trades_on_site: Array<{
    trade: string;
    company: string;
    workers: number;
    total_hours?: number;
    total_cost?: number;
    activities: string[];
  }>;
  total_workers: number;
  delays?: Array<{
    type: string;
    description: string;
    duration_hours: number;
    impact: string;
  }>;
  safety_incidents?: Array<{
    type: string;
    description: string;
    action_taken: string;
    reported_to: string;
  }>;
  inspections?: Array<{
    type: string;
    inspector: string;
    organization: string;
    findings: string;
    time: string;
  }>;
  visitors?: Array<{
    name: string;
    company: string;
    purpose: string;
    time_in: string;
    time_out: string;
  }>;
  equipment_on_site?: Array<{
    type: string;
    description: string;
    supplier: string;
    hours_used: number;
  }>;
  material_deliveries?: Array<{
    material: string;
    quantity: string;
    supplier: string;
    time: string;
    location: string;
  }>;
  milestones_achieved?: string[];
  general_notes?: string;
  tomorrow_planned_work?: string;
  total_daily_cost?: number;
  createdBy?: {
    full_name?: string;
    email: string;
  };
  approvedBy?: {
    full_name?: string;
    email: string;
  };
  approved_at?: string;
  created_at: string;
}

export interface ExportOptions {
  format: 'pdf' | 'excel';
  includeFinancials?: boolean;
}

export class DiaryExporter {
  async exportToPDF(
    diary: DiaryExportData,
    options: ExportOptions = { format: 'pdf' }
  ): Promise<Buffer> {
    // For now, we'll return HTML content as PDF
    // In production, you would use puppeteer, playwright, or a PDF service
    const html = this.generateHTML(diary, options);

    // Return HTML content as buffer - the frontend can handle PDF conversion
    // or this can be enhanced with a proper PDF library
    return Buffer.from(html, 'utf-8');
  }

  async exportToExcel(
    diary: DiaryExportData,
    options: ExportOptions = { format: 'excel' }
  ): Promise<Buffer> {
    const workbook = XLSX.utils.book_new();

    // Main diary information sheet
    const mainData = [
      ['Daily Diary Report'],
      [''],
      ['Diary Number', diary.diary_number],
      ['Date', new Date(diary.diary_date).toLocaleDateString()],
      ['Project', diary.project.name],
      ['Client', diary.project.client_name || 'N/A'],
      ['Total Workers', diary.total_workers],
      [''],
      ['Work Summary'],
      [diary.work_summary],
      [''],
    ];

    // Weather information
    if (diary.weather) {
      mainData.push(['Weather Information']);
      if (diary.weather.temperature)
        mainData.push(['Temperature', `${diary.weather.temperature}°C`]);
      if (diary.weather.conditions) mainData.push(['Conditions', diary.weather.conditions]);
      if (diary.weather.wind_speed)
        mainData.push(['Wind Speed', `${diary.weather.wind_speed} km/h`]);
      if (diary.weather.humidity) mainData.push(['Humidity', `${diary.weather.humidity}%`]);
      mainData.push(['']);
    }

    // Additional notes
    if (diary.general_notes) {
      mainData.push(['General Notes']);
      mainData.push([diary.general_notes]);
      mainData.push(['']);
    }

    if (diary.tomorrow_planned_work) {
      mainData.push(["Tomorrow's Planned Work"]);
      mainData.push([diary.tomorrow_planned_work]);
      mainData.push(['']);
    }

    // Approval information
    mainData.push([
      'Created By',
      diary.createdBy?.full_name || diary.createdBy?.email || 'Unknown',
    ]);
    mainData.push(['Created At', new Date(diary.created_at).toLocaleString()]);

    if (diary.approved_at && diary.approvedBy) {
      mainData.push(['Approved By', diary.approvedBy.full_name || diary.approvedBy.email]);
      mainData.push(['Approved At', new Date(diary.approved_at).toLocaleString()]);
    }

    const mainSheet = XLSX.utils.aoa_to_sheet(mainData);
    XLSX.utils.book_append_sheet(workbook, mainSheet, 'Diary Summary');

    // Workforce sheet
    if (diary.trades_on_site?.length > 0) {
      const workforceHeaders = ['Trade', 'Company', 'Workers', 'Hours', 'Activities'];
      if (options.includeFinancials) {
        workforceHeaders.push('Total Cost');
      }

      const workforceData = [workforceHeaders];

      diary.trades_on_site.forEach((trade) => {
        const row = [
          trade.trade,
          trade.company,
          trade.workers,
          trade.total_hours || 0,
          trade.activities.join(', '),
        ];

        if (options.includeFinancials && trade.total_cost) {
          row.push(`$${trade.total_cost.toFixed(2)}`);
        }

        workforceData.push(row);
      });

      if (options.includeFinancials && diary.total_daily_cost) {
        workforceData.push([]);
        workforceData.push([
          'Total Daily Cost',
          '',
          '',
          '',
          '',
          `$${diary.total_daily_cost.toFixed(2)}`,
        ]);
      }

      const workforceSheet = XLSX.utils.aoa_to_sheet(workforceData);
      XLSX.utils.book_append_sheet(workbook, workforceSheet, 'Workforce');
    }

    // Equipment sheet
    if (diary.equipment_on_site?.length > 0) {
      const equipmentData = [['Equipment Type', 'Description', 'Supplier', 'Hours Used']];

      diary.equipment_on_site.forEach((equipment) => {
        equipmentData.push([
          equipment.type,
          equipment.description,
          equipment.supplier,
          equipment.hours_used,
        ]);
      });

      const equipmentSheet = XLSX.utils.aoa_to_sheet(equipmentData);
      XLSX.utils.book_append_sheet(workbook, equipmentSheet, 'Equipment');
    }

    // Material deliveries sheet
    if (diary.material_deliveries?.length > 0) {
      const materialData = [['Material', 'Quantity', 'Supplier', 'Time', 'Location']];

      diary.material_deliveries.forEach((delivery) => {
        materialData.push([
          delivery.material,
          delivery.quantity,
          delivery.supplier,
          delivery.time,
          delivery.location,
        ]);
      });

      const materialSheet = XLSX.utils.aoa_to_sheet(materialData);
      XLSX.utils.book_append_sheet(workbook, materialSheet, 'Material Deliveries');
    }

    // Delays sheet
    if (diary.delays?.length > 0) {
      const delayData = [['Type', 'Description', 'Duration (Hours)', 'Impact']];

      diary.delays.forEach((delay) => {
        delayData.push([delay.type, delay.description, delay.duration_hours, delay.impact]);
      });

      const delaySheet = XLSX.utils.aoa_to_sheet(delayData);
      XLSX.utils.book_append_sheet(workbook, delaySheet, 'Delays');
    }

    // Safety incidents sheet
    if (diary.safety_incidents?.length > 0) {
      const safetyData = [['Type', 'Description', 'Action Taken', 'Reported To']];

      diary.safety_incidents.forEach((incident) => {
        safetyData.push([
          incident.type,
          incident.description,
          incident.action_taken,
          incident.reported_to,
        ]);
      });

      const safetySheet = XLSX.utils.aoa_to_sheet(safetyData);
      XLSX.utils.book_append_sheet(workbook, safetySheet, 'Safety Incidents');
    }

    // Inspections sheet
    if (diary.inspections?.length > 0) {
      const inspectionData = [['Type', 'Inspector', 'Organization', 'Findings', 'Time']];

      diary.inspections.forEach((inspection) => {
        inspectionData.push([
          inspection.type,
          inspection.inspector,
          inspection.organization,
          inspection.findings,
          inspection.time,
        ]);
      });

      const inspectionSheet = XLSX.utils.aoa_to_sheet(inspectionData);
      XLSX.utils.book_append_sheet(workbook, inspectionSheet, 'Inspections');
    }

    // Visitors sheet
    if (diary.visitors?.length > 0) {
      const visitorData = [['Name', 'Company', 'Purpose', 'Time In', 'Time Out']];

      diary.visitors.forEach((visitor) => {
        visitorData.push([
          visitor.name,
          visitor.company,
          visitor.purpose,
          visitor.time_in,
          visitor.time_out,
        ]);
      });

      const visitorSheet = XLSX.utils.aoa_to_sheet(visitorData);
      XLSX.utils.book_append_sheet(workbook, visitorSheet, 'Visitors');
    }

    // Milestones sheet
    if (diary.milestones_achieved?.length > 0) {
      const milestoneData = [
        ['Milestones Achieved'],
        ...diary.milestones_achieved.map((milestone) => [milestone]),
      ];

      const milestoneSheet = XLSX.utils.aoa_to_sheet(milestoneData);
      XLSX.utils.book_append_sheet(workbook, milestoneSheet, 'Milestones');
    }

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  private generateHTML(diary: DiaryExportData, options: ExportOptions): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Daily Diary - ${diary.diary_number}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .section { margin-bottom: 20px; }
        .section-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; color: #333; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .weather-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .weather-item { padding: 10px; background: #f8f9fa; border-radius: 4px; }
        .signature-section { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Daily Diary Report</h1>
        <p><strong>Diary Number:</strong> ${diary.diary_number}</p>
        <p><strong>Date:</strong> ${new Date(diary.diary_date).toLocaleDateString()}</p>
        <p><strong>Project:</strong> ${diary.project.name}</p>
        ${diary.project.client_name ? `<p><strong>Client:</strong> ${diary.project.client_name}</p>` : ''}
    </div>

    ${
      diary.weather
        ? `
    <div class="section">
        <div class="section-title">Weather Conditions</div>
        <div class="weather-grid">
            ${diary.weather.temperature ? `<div class="weather-item"><strong>Temperature:</strong> ${diary.weather.temperature}°C</div>` : ''}
            ${diary.weather.conditions ? `<div class="weather-item"><strong>Conditions:</strong> ${diary.weather.conditions}</div>` : ''}
            ${diary.weather.wind_speed ? `<div class="weather-item"><strong>Wind Speed:</strong> ${diary.weather.wind_speed} km/h</div>` : ''}
            ${diary.weather.humidity ? `<div class="weather-item"><strong>Humidity:</strong> ${diary.weather.humidity}%</div>` : ''}
        </div>
    </div>
    `
        : ''
    }

    <div class="section">
        <div class="section-title">Work Summary</div>
        <p>${diary.work_summary}</p>
    </div>

    ${
      diary.trades_on_site?.length
        ? `
    <div class="section">
        <div class="section-title">Workforce on Site (Total: ${diary.total_workers} workers)</div>
        <table>
            <thead>
                <tr>
                    <th>Trade</th>
                    <th>Company</th>
                    <th>Workers</th>
                    <th>Hours</th>
                    <th>Activities</th>
                    ${options.includeFinancials ? '<th>Cost</th>' : ''}
                </tr>
            </thead>
            <tbody>
                ${diary.trades_on_site
                  .map(
                    (trade) => `
                <tr>
                    <td>${trade.trade}</td>
                    <td>${trade.company}</td>
                    <td>${trade.workers}</td>
                    <td>${trade.total_hours || 0}</td>
                    <td>${trade.activities.join(', ')}</td>
                    ${options.includeFinancials && trade.total_cost ? `<td>$${trade.total_cost.toFixed(2)}</td>` : options.includeFinancials ? '<td>-</td>' : ''}
                </tr>
                `
                  )
                  .join('')}
                ${
                  options.includeFinancials && diary.total_daily_cost
                    ? `
                <tr style="font-weight: bold;">
                    <td colspan="5">Total Daily Cost</td>
                    <td>$${diary.total_daily_cost.toFixed(2)}</td>
                </tr>
                `
                    : ''
                }
            </tbody>
        </table>
    </div>
    `
        : ''
    }

    ${
      diary.equipment_on_site?.length
        ? `
    <div class="section">
        <div class="section-title">Equipment on Site</div>
        <table>
            <thead>
                <tr><th>Type</th><th>Description</th><th>Supplier</th><th>Hours Used</th></tr>
            </thead>
            <tbody>
                ${diary.equipment_on_site
                  .map(
                    (equipment) => `
                <tr>
                    <td>${equipment.type}</td>
                    <td>${equipment.description}</td>
                    <td>${equipment.supplier}</td>
                    <td>${equipment.hours_used}</td>
                </tr>
                `
                  )
                  .join('')}
            </tbody>
        </table>
    </div>
    `
        : ''
    }

    ${
      diary.material_deliveries?.length
        ? `
    <div class="section">
        <div class="section-title">Material Deliveries</div>
        <table>
            <thead>
                <tr><th>Material</th><th>Quantity</th><th>Supplier</th><th>Time</th><th>Location</th></tr>
            </thead>
            <tbody>
                ${diary.material_deliveries
                  .map(
                    (delivery) => `
                <tr>
                    <td>${delivery.material}</td>
                    <td>${delivery.quantity}</td>
                    <td>${delivery.supplier}</td>
                    <td>${delivery.time}</td>
                    <td>${delivery.location}</td>
                </tr>
                `
                  )
                  .join('')}
            </tbody>
        </table>
    </div>
    `
        : ''
    }

    ${
      diary.delays?.length
        ? `
    <div class="section">
        <div class="section-title">Delays</div>
        <table>
            <thead>
                <tr><th>Type</th><th>Description</th><th>Duration (Hours)</th><th>Impact</th></tr>
            </thead>
            <tbody>
                ${diary.delays
                  .map(
                    (delay) => `
                <tr>
                    <td>${delay.type}</td>
                    <td>${delay.description}</td>
                    <td>${delay.duration_hours}</td>
                    <td>${delay.impact}</td>
                </tr>
                `
                  )
                  .join('')}
            </tbody>
        </table>
    </div>
    `
        : ''
    }

    ${
      diary.safety_incidents?.length
        ? `
    <div class="section">
        <div class="section-title">Safety Incidents</div>
        <table>
            <thead>
                <tr><th>Type</th><th>Description</th><th>Action Taken</th><th>Reported To</th></tr>
            </thead>
            <tbody>
                ${diary.safety_incidents
                  .map(
                    (incident) => `
                <tr>
                    <td>${incident.type}</td>
                    <td>${incident.description}</td>
                    <td>${incident.action_taken}</td>
                    <td>${incident.reported_to}</td>
                </tr>
                `
                  )
                  .join('')}
            </tbody>
        </table>
    </div>
    `
        : ''
    }

    ${
      diary.inspections?.length
        ? `
    <div class="section">
        <div class="section-title">Inspections</div>
        <table>
            <thead>
                <tr><th>Type</th><th>Inspector</th><th>Organization</th><th>Findings</th><th>Time</th></tr>
            </thead>
            <tbody>
                ${diary.inspections
                  .map(
                    (inspection) => `
                <tr>
                    <td>${inspection.type}</td>
                    <td>${inspection.inspector}</td>
                    <td>${inspection.organization}</td>
                    <td>${inspection.findings}</td>
                    <td>${inspection.time}</td>
                </tr>
                `
                  )
                  .join('')}
            </tbody>
        </table>
    </div>
    `
        : ''
    }

    ${
      diary.visitors?.length
        ? `
    <div class="section">
        <div class="section-title">Visitors</div>
        <table>
            <thead>
                <tr><th>Name</th><th>Company</th><th>Purpose</th><th>Time In</th><th>Time Out</th></tr>
            </thead>
            <tbody>
                ${diary.visitors
                  .map(
                    (visitor) => `
                <tr>
                    <td>${visitor.name}</td>
                    <td>${visitor.company}</td>
                    <td>${visitor.purpose}</td>
                    <td>${visitor.time_in}</td>
                    <td>${visitor.time_out}</td>
                </tr>
                `
                  )
                  .join('')}
            </tbody>
        </table>
    </div>
    `
        : ''
    }

    ${
      diary.milestones_achieved?.length
        ? `
    <div class="section">
        <div class="section-title">Milestones Achieved</div>
        <ul>
            ${diary.milestones_achieved.map((milestone) => `<li>${milestone}</li>`).join('')}
        </ul>
    </div>
    `
        : ''
    }

    ${
      diary.general_notes
        ? `
    <div class="section">
        <div class="section-title">General Notes</div>
        <p>${diary.general_notes}</p>
    </div>
    `
        : ''
    }

    ${
      diary.tomorrow_planned_work
        ? `
    <div class="section">
        <div class="section-title">Tomorrow's Planned Work</div>
        <p>${diary.tomorrow_planned_work}</p>
    </div>
    `
        : ''
    }

    <div class="signature-section">
        <p><strong>Created by:</strong> ${diary.createdBy?.full_name || diary.createdBy?.email || 'Unknown'}</p>
        <p><strong>Created at:</strong> ${new Date(diary.created_at).toLocaleString()}</p>
        ${
          diary.approved_at && diary.approvedBy
            ? `
        <p><strong>Approved by:</strong> ${diary.approvedBy.full_name || diary.approvedBy.email}</p>
        <p><strong>Approved at:</strong> ${new Date(diary.approved_at).toLocaleString()}</p>
        `
            : ''
        }
    </div>
</body>
</html>
    `;
  }
}
