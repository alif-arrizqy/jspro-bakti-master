import cron from "node-cron";
import { siteDownService } from "./site-down.service";
import { siteUpService } from "./site-up.service";
import { siteDownLogger, siteUpLogger } from "../utils/logger";

export class SchedulerService {
    private syncSiteDownJob: cron.ScheduledTask | null = null;
    private syncSiteUpJob: cron.ScheduledTask | null = null;

    /**
     * Start scheduled jobs
     */
    start(): void {
        // Sync site down from NMS API every 1 hour
        this.syncSiteDownJob = cron.schedule("0 * * * *", async () => {
            siteDownLogger.info("Starting scheduled sync site down from NMS API");
            try {
                const result = await siteDownService.syncFromNms();
                siteDownLogger.info({ result }, "Scheduled sync site down completed successfully");
            } catch (error) {
                siteDownLogger.error({ error }, "Scheduled sync site down failed");
            }
        });

        // Sync site up from NMS API every 1 hour
        this.syncSiteUpJob = cron.schedule("0 * * * *", async () => {
            siteUpLogger.info("Starting scheduled sync site up from NMS API");
            try {
                const result = await siteUpService.syncFromNms();
                siteUpLogger.info({ result }, "Scheduled sync site up completed successfully");
            } catch (error) {
                siteUpLogger.error({ error }, "Scheduled sync site up failed");
            }
        });

        siteDownLogger.info("Scheduler started - sync site down from NMS every 1 hour");
        siteUpLogger.info("Scheduler started - sync site up from NMS every 1 hour");
    }

    /**
     * Stop scheduled jobs
     */
    stop(): void {
        if (this.syncSiteDownJob) {
            this.syncSiteDownJob.stop();
            siteDownLogger.info("Scheduler site down stopped");
        }
        if (this.syncSiteUpJob) {
            this.syncSiteUpJob.stop();
            siteUpLogger.info("Scheduler site up stopped");
        }
    }
}

// Export singleton instance
export const schedulerService = new SchedulerService();

