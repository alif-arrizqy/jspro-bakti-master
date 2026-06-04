import cron from "node-cron";
import { config } from "../config/env.js";
import { probeLogger } from "../utils/logger.js";
import { sitesClientService } from "../services/sites-client.service.js";
import { connectivityProbeService } from "../services/connectivity-probe.service.js";
import { connectivitySnapshotService } from "../services/connectivity-snapshot.service.js";

let running = false;

async function runProbe() {
    if (running) {
        probeLogger.warn("Probe already running, skipping");
        return;
    }
    running = true;

    try {
        const sites = await sitesClientService.getAllSites();
        const concurrency = config.probe.concurrency;

        probeLogger.info({ siteCount: sites.length, concurrency }, "Starting connectivity probe");

        for (let i = 0; i < sites.length; i += concurrency) {
            const batch = sites.slice(i, i + concurrency);
            await Promise.all(
                batch.map(async (site) => {
                    const ip = connectivityProbeService.resolveTargetIp(site.ipSnmp, site.ipGwGs);
                    if (!ip) {
                        await connectivitySnapshotService.set(site.siteId, {
                            latencyMs: null,
                            reachable: false,
                            probedAt: new Date().toISOString(),
                            targetIp: null,
                            probeMethod: config.probe.mode,
                        });
                        return;
                    }

                    const snapshot = await connectivityProbeService.probe(ip);
                    await connectivitySnapshotService.set(site.siteId, snapshot);
                })
            );
        }

        probeLogger.info("Connectivity probe completed");
    } catch (err: any) {
        probeLogger.error({ err: err.message }, "Connectivity probe failed");
    } finally {
        running = false;
    }
}

let task: cron.ScheduledTask | null = null;

export const connectivityProbeJob = {
    start() {
        if (!config.probe.enabled) {
            probeLogger.info("Connectivity probe disabled");
            return;
        }

        const intervalSec = Math.max(30, Math.round(config.probe.intervalMs / 1000));
        const cronExpr = `*/${Math.ceil(intervalSec / 60)} * * * *`;

        probeLogger.info({ cronExpr, intervalMs: config.probe.intervalMs }, "Scheduling connectivity probe");

        task = cron.schedule(cronExpr, runProbe);

        // Run initial probe after 5 seconds
        setTimeout(runProbe, 5000);
    },

    stop() {
        if (task) {
            task.stop();
            task = null;
        }
    },

    runManual() {
        return runProbe();
    },
};
