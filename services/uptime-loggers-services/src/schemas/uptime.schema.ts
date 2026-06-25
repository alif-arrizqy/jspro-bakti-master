import { z } from "zod";

export const uptimeSummaryQuerySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const uptimeSitesQuerySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    batteryType: z.enum(["all", "jspro", "talis5"]).default("all"),
    search: z.string().optional(),
    uptimeHealth: z.enum(["100", "95", "70"]).optional(),
});

export const pullingLogsSummaryQuerySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const pullingLogsQuerySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    batteryType: z.enum(["all", "jspro", "talis5"]).default("all"),
    result: z.enum(["all", "success", "failed"]).default("all"),
    search: z.string().optional(),
    page: z.string().default("1").transform(Number).pipe(z.number().int().positive()),
    limit: z.string().default("50").transform(Number).pipe(z.number().int().positive().max(300)),
});

export type UptimeSummaryQuery = z.infer<typeof uptimeSummaryQuerySchema>;
export type UptimeSitesQuery = z.infer<typeof uptimeSitesQuerySchema>;
export type PullingLogsSummaryQuery = z.infer<typeof pullingLogsSummaryQuerySchema>;
export type PullingLogsQuery = z.infer<typeof pullingLogsQuerySchema>;
