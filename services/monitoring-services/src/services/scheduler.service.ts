import cron from "node-cron";
import { siteDownService } from "./site-down.service";
import { siteDownLogger } from "../utils/logger";

export class SchedulerService {
    private syncJob: cron.ScheduledTask | null = null;

    /**
     * Start scheduled jobs
     */
    start(): void {
        // Sync from NMS API every 1 hour
        this.syncJob = cron.schedule("0 * * * *", async () => {
            siteDownLogger.info("Starting scheduled sync from NMS API");
            try {
                const result = await siteDownService.syncFromNms();
                siteDownLogger.info({ result }, "Scheduled sync completed successfully");
            } catch (error) {
                siteDownLogger.error({ error }, "Scheduled sync failed");
            }
        });

        siteDownLogger.info("Scheduler started - sync from NMS every 1 hour");
    }

    /**
     * Stop scheduled jobs
     */
    stop(): void {
        if (this.syncJob) {
            this.syncJob.stop();
            siteDownLogger.info("Scheduler stopped");
        }
    }
}

// Export singleton instance
export const schedulerService = new SchedulerService();

