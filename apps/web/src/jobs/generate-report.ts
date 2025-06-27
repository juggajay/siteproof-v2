import { eventTrigger } from "@trigger.dev/sdk";
import { z } from "zod";
import { client } from "@/trigger";
import { createClient } from "@/lib/supabase/server";
import { generateProjectSummaryReport } from "./reports/project-summary";
import { generateDailyDiaryExport } from "./reports/daily-diary-export";
import { generateInspectionSummary } from "./reports/inspection-summary";
import { generateNCRReport } from "./reports/ncr-report";
import { generateFinancialSummary } from "./reports/financial-summary";

// Schema for report generation event
const reportGenerationEvent = z.object({
  reportId: z.string().uuid(),
  reportType: z.enum([
    "project_summary",
    "daily_diary_export",
    "inspection_summary",
    "ncr_report",
    "financial_summary",
    "safety_report",
    "quality_report",
    "custom",
  ]),
  format: z.enum(["pdf", "excel", "csv", "json"]),
  parameters: z.record(z.any()),
  organizationId: z.string().uuid(),
  requestedBy: z.string().uuid(),
});

// Define the job
export const generateReportJob = client.defineJob({
  id: "generate-report",
  name: "Generate Report",
  version: "1.0.0",
  trigger: eventTrigger({
    name: "report.generate",
    schema: reportGenerationEvent,
  }),
  run: async (payload, io, ctx) => {
    const { reportId, reportType, format, parameters, organizationId, requestedBy } = payload;

    // Initialize Supabase client
    const supabase = await createClient();

    try {
      // Update status to processing
      await io.runTask("update-status-processing", async () => {
        await supabase.rpc("update_report_status", {
          p_report_id: reportId,
          p_status: "processing",
          p_progress: 10,
          p_current_step: "Initializing report generation",
        });
      });

      // Log the start
      await io.logger.info("Starting report generation", {
        reportId,
        reportType,
        format,
      });

      let fileUrl: string;
      let fileSize: number;

      // Generate report based on type
      switch (reportType) {
        case "project_summary":
          await io.runTask("generate-project-summary", async () => {
            await supabase.rpc("update_report_status", {
              p_report_id: reportId,
              p_status: "processing",
              p_progress: 30,
              p_current_step: "Generating project summary",
            });

            const result = await generateProjectSummaryReport({
              supabase,
              parameters,
              format,
              organizationId,
              io,
            });
            
            fileUrl = result.fileUrl;
            fileSize = result.fileSize;
          });
          break;

        case "daily_diary_export":
          await io.runTask("generate-diary-export", async () => {
            await supabase.rpc("update_report_status", {
              p_report_id: reportId,
              p_status: "processing",
              p_progress: 30,
              p_current_step: "Exporting daily diaries",
            });

            const result = await generateDailyDiaryExport({
              supabase,
              parameters,
              format,
              organizationId,
              io,
            });
            
            fileUrl = result.fileUrl;
            fileSize = result.fileSize;
          });
          break;

        case "inspection_summary":
          await io.runTask("generate-inspection-summary", async () => {
            await supabase.rpc("update_report_status", {
              p_report_id: reportId,
              p_status: "processing",
              p_progress: 30,
              p_current_step: "Generating inspection summary",
            });

            const result = await generateInspectionSummary({
              supabase,
              parameters,
              format,
              organizationId,
              io,
            });
            
            fileUrl = result.fileUrl;
            fileSize = result.fileSize;
          });
          break;

        case "ncr_report":
          await io.runTask("generate-ncr-report", async () => {
            await supabase.rpc("update_report_status", {
              p_report_id: reportId,
              p_status: "processing",
              p_progress: 30,
              p_current_step: "Generating NCR report",
            });

            const result = await generateNCRReport({
              supabase,
              parameters,
              format,
              organizationId,
              io,
            });
            
            fileUrl = result.fileUrl;
            fileSize = result.fileSize;
          });
          break;

        case "financial_summary":
          await io.runTask("generate-financial-summary", async () => {
            await supabase.rpc("update_report_status", {
              p_report_id: reportId,
              p_status: "processing",
              p_progress: 30,
              p_current_step: "Generating financial summary",
            });

            // Check if user has financial access
            const { data: hasAccess } = await supabase.rpc("has_financial_access", {
              p_organization_id: organizationId,
              p_user_id: requestedBy,
            });

            if (!hasAccess) {
              throw new Error("User does not have financial access");
            }

            const result = await generateFinancialSummary({
              supabase,
              parameters,
              format,
              organizationId,
              io,
            });
            
            fileUrl = result.fileUrl;
            fileSize = result.fileSize;
          });
          break;

        default:
          throw new Error(`Unsupported report type: ${reportType}`);
      }

      // Update status to completed
      await io.runTask("update-status-completed", async () => {
        await supabase.rpc("update_report_status", {
          p_report_id: reportId,
          p_status: "completed",
          p_progress: 100,
          p_current_step: "Report generated successfully",
          p_file_url: fileUrl!,
          p_file_size: fileSize!,
        });
      });

      await io.logger.info("Report generation completed", {
        reportId,
        fileUrl,
        fileSize,
      });

      return {
        success: true,
        reportId,
        fileUrl,
        fileSize,
      };

    } catch (error) {
      await io.logger.error("Report generation failed", {
        reportId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // Update status to failed
      await io.runTask("update-status-failed", async () => {
        await supabase.rpc("update_report_status", {
          p_report_id: reportId,
          p_status: "failed",
          p_error_message: error instanceof Error ? error.message : "Unknown error",
        });
      });

      throw error;
    }
  },
});

// Helper function to simulate report generation (replace with actual implementation)
async function generateMockReport(type: string): Promise<{ fileUrl: string; fileSize: number }> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  return {
    fileUrl: `https://storage.example.com/reports/${type}-${Date.now()}.pdf`,
    fileSize: Math.floor(Math.random() * 5000000) + 100000, // Random size between 100KB and 5MB
  };
}