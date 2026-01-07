import { z } from "zod";

// TRANSFORMERS
/**
 * Transform SCC type: scc-srne -> scc_srne
 */
const transformSccType = (val: string): string => {
  const normalized = val.toLowerCase().trim();
  if (normalized === "scc-srne" || normalized.includes("srne"))
    return "scc_srne";
  if (normalized === "scc-epever" || normalized.includes("epever"))
    return "scc_epever";
  return normalized.replace(/-/g, "_");
};

/**
 * Transform status_sites: non-terestrial -> non_terestrial
 */
const transformStatusSites = (val: string): string => {
  const normalized = val.toLowerCase().trim();

  // Handle non-terestrial variants
  if (normalized.includes("non")) {
    return "non_terestrial";
  }

  // Handle terestrial variants
  if (normalized === "terestrial" || normalized === "terestrial") {
    return "terestrial";
  }

  return "non_terestrial";
};

/**
 * Transform battery version
 */
const transformBatteryVersion = (val: string): string => {
  const normalized = val.toUpperCase().trim();
  if (normalized.includes("TALIS") || normalized === "FULL_TALIS5")
    return "talis5";
  if (normalized.includes("MIX")) return "mix";
  if (normalized.includes("JSPRO") || normalized === "JSPRO") return "jspro";
  return val.toLowerCase();
};

// ENUMS (Database format with underscore)

// StatusSites: Accept both formats, transform to db format
export const StatusSitesEnum = z
  .string()
  .transform(transformStatusSites)
  .pipe(z.enum(["terestrial", "non_terestrial"]));

// SccType: Accept both formats, transform to db format
export const SccTypeEnum = z
  .string()
  .transform(transformSccType)
  .pipe(z.enum(["scc_srne", "scc_epever"]));

// BatteryVersion: Accept various formats, transform to db format
export const BatteryVersionEnum = z
  .string()
  .transform(transformBatteryVersion)
  .pipe(z.enum(["talis5", "mix", "jspro"]));

// Simple enums
export const EhubVersionEnum = z.enum(["new", "old"]);
export const Panel2TypeEnum = z.enum(["new", "old"]);

// RAW ENUMS (for query params without transform)
export const StatusSitesQueryEnum = z.enum([
  "terestrial",
  "non_terestrial",
  "terestrial",
  "non-terestrial",
  "non_terestrial",
]);
export const SccTypeQueryEnum = z.enum([
  "scc_srne",
  "scc_epever",
  "scc-srne",
  "scc-epever",
]);
export const BatteryVersionQueryEnum = z.enum(["talis5", "mix", "jspro"]);

// CONTACT PERSON
export const ContactPersonSchema = z.object({
  name: z.string(),
  phone: z.string().nullable(),
});

// SITE INFO SCHEMAS
export const SiteInfoReadSchema = z.object({
  prCode: z.string().max(50).optional().nullable(),
  siteId: z.string().max(50),
  clusterId: z.string().max(50).optional().nullable(),
  terminalId: z.string().max(50).optional().nullable(),
  siteName: z.string().max(100),
  ipSnmp: z.string().max(50).optional().nullable(),
  ipMiniPc: z.string().max(50).optional().nullable(),
  webappUrl: z.string().max(255).optional().nullable(),
  ehubVersion: EhubVersionEnum.optional().nullable(),
  panel2Type: Panel2TypeEnum.optional().nullable(),
  sccType: SccTypeEnum.optional().nullable(),
  batteryVersion: BatteryVersionEnum.optional().nullable(),
  totalBattery: z.number().int().optional().nullable(),
  statusSites: StatusSitesEnum.optional(),
  isActive: z.boolean().optional(),
});

export const SiteInfoCreateSchema = z.object({
  prCode: z.string().max(50).optional().nullable(),
  siteId: z.string().max(50),
  clusterId: z.string().max(50).optional().nullable(),
  terminalId: z.string().max(50).optional().nullable(),
  siteName: z.string().max(100),
  ipSnmp: z.string().max(50).optional().nullable(),
  ipMiniPc: z.string().max(50).optional().nullable(),
  webappUrl: z.string().max(255).optional().nullable(),
  ehubVersion: EhubVersionEnum.optional().nullable(),
  panel2Type: Panel2TypeEnum.optional().nullable(),
  sccType: SccTypeEnum.optional().nullable(),
  batteryVersion: BatteryVersionEnum.optional().nullable(),
  totalBattery: z.number().int().optional().nullable(),
  statusSites: StatusSitesEnum.optional(),
  isActive: z.boolean().optional(),
});

export const SiteInfoUpdateSchema = SiteInfoCreateSchema.partial();

// SITE DETAIL SCHEMAS
export const SiteDetailReadSchema = z.object({
  village: z.string().max(100).optional().nullable(),
  subdistrict: z.string().max(100).optional().nullable(),
  regency: z.string().max(100).optional().nullable(),
  province: z.string().max(100),
  longitude: z.number().optional().nullable(),
  latitude: z.number().optional().nullable(),
  ipGatewayGs: z.string().max(50).optional().nullable(),
  ipGatewayLc: z.string().max(50).optional().nullable(),
  subnet: z.string().max(10).optional().nullable(),
  batteryList: z.array(z.string()).optional().nullable(),
  cabinetList: z.array(z.string()).optional().nullable(),
  buildYear: z.string().max(20).optional().nullable(),
  projectPhase: z.string().max(100).optional().nullable(),
  onairDate: z.string().optional().nullable(),
  gsSustainDate: z.string().optional().nullable(),
  topoSustainDate: z.string().optional().nullable(),
  providerGs: z.string().max(100).optional().nullable(),
  beamProvider: z.string().max(100).optional().nullable(),
  cellularOperator: z.string().max(50).optional().nullable(),
  contactPerson: z.array(ContactPersonSchema).optional().nullable(),
});

export const SiteDetailCreateSchema = z.object({
  village: z.string().max(100).optional().nullable(),
  subdistrict: z.string().max(100).optional().nullable(),
  regency: z.string().max(100).optional().nullable(),
  province: z.string().max(100),
  longitude: z.number().optional().nullable(),
  latitude: z.number().optional().nullable(),
  ipGatewayGs: z.string().max(50).optional().nullable(),
  ipGatewayLc: z.string().max(50).optional().nullable(),
  subnet: z.string().max(10).optional().nullable(),
  batteryList: z.array(z.string()).optional().nullable(),
  cabinetList: z.array(z.string()).optional().nullable(),
  buildYear: z.string().max(20).optional().nullable(),
  projectPhase: z.string().max(100).optional().nullable(),
  onairDate: z.string().optional().nullable(),
  gsSustainDate: z.string().optional().nullable(),
  topoSustainDate: z.string().optional().nullable(),
  providerGs: z.string().max(100).optional().nullable(),
  beamProvider: z.string().max(100).optional().nullable(),
  cellularOperator: z.string().max(50).optional().nullable(),
  contactPerson: z.array(ContactPersonSchema).optional().nullable(),
});

export const SiteDetailUpdateSchema = SiteDetailCreateSchema.partial();

// FULL SITE SCHEMAS (Combined)
export const SiteFullReadSchema = z.object({
  ...SiteInfoReadSchema.shape,
  detail: SiteDetailReadSchema.optional().nullable(),
});

export const SiteFullCreateSchema = z.object({
  ...SiteInfoCreateSchema.shape,
  detail: SiteDetailCreateSchema.optional(),
});

export const SiteFullUpdateSchema = z.object({
  ...SiteInfoUpdateSchema.shape,
  detail: SiteDetailUpdateSchema.optional(),
});

// QUERY SCHEMAS (accepts both formats)
export const SiteQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z
    .enum(["siteName", "siteId", "createdAt", "updatedAt"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  // New filter parameters
  status: StatusSitesQueryEnum.optional(),
  province: z.string().optional(), // Can be region (papua/maluku) or specific province name
  sccType: SccTypeQueryEnum.optional(),
  batteryVersion: BatteryVersionQueryEnum.optional(),
  siteId: z.string().optional(), // Exact match for siteId
  prCode: z.string().optional(), // Exact match for prCode
});

export const SiteIdParamSchema = z.object({
  id: z.string(),
});

// RESPONSE SCHEMAS
export const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

// TYPES
export type SiteInfoCreate = z.infer<typeof SiteInfoCreateSchema>;
export type SiteInfoUpdate = z.infer<typeof SiteInfoUpdateSchema>;
export type SiteDetailCreate = z.infer<typeof SiteDetailCreateSchema>;
export type SiteDetailUpdate = z.infer<typeof SiteDetailUpdateSchema>;
export type SiteFullRead = z.infer<typeof SiteFullReadSchema>;
export type SiteFullCreate = z.infer<typeof SiteFullCreateSchema>;
export type SiteFullUpdate = z.infer<typeof SiteFullUpdateSchema>;
export type SiteQuery = z.infer<typeof SiteQuerySchema>;
export type ContactPerson = z.infer<typeof ContactPersonSchema>;

// Database enum types
export type StatusSitesDb = "terestrial" | "non_terestrial";
export type SccTypeDb = "scc_srne" | "scc_epever";
export type BatteryVersionDb = "talis5" | "mix" | "jspro";
