import { createAppRoute } from "@trigger.dev/nextjs";
import { client } from "@/trigger";

// Import all jobs
import "@/jobs/generate-report";

// This route is used to send and receive data with Trigger.dev
export const { POST, dynamic } = createAppRoute(client);

// Trigger.dev needs long-running requests
export const maxDuration = 60;