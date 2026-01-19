import { z } from "zod";

// ============================================================
// Enums
// ============================================================

export const ShippingStatusEnum = z.enum(["REQUEST_GUDANG", "PROSES_KIRIM", "SELESAI"]);
export const ProvinceEnum = z.enum([
    "PAPUA_BARAT",
    "PAPUA_BARAT_DAYA",
    "PAPUA_SELATAN",
    "PAPUA",
    "MALUKU",
    "MALUKU_UTARA",
]);

// ============================================================
// Shipping Spare Part Schemas
// ============================================================

export const ShippingSparePartCreateSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    site_id: z.string().max(20),
    address_id: z.coerce.number().int().positive(),
    sparepart_note: z.string().nullable().optional(),
    problem_id: z.coerce.number().int().positive(),
    ticket_number: z.string().max(50).nullable().optional(),
    ticket_image: z.string().nullable().optional(), // Will be set from file upload
    status: ShippingStatusEnum.default("REQUEST_GUDANG"),
    resi_number: z.string().max(100).nullable().optional(),
    resi_image: z.string().nullable().optional(),
});

export const ShippingSparePartUpdateSchema = z.object({
    resi_number: z.string().max(100).optional(),
    resi_image: z.string().nullable().optional(),
    status: ShippingStatusEnum.optional(),
});

export const ShippingSparePartQuerySchema = z.object({
    status: z.union([ShippingStatusEnum, z.array(ShippingStatusEnum)]).optional(),
    site_id: z.string().optional(),
    address_id: z.coerce.number().int().positive().optional(),
    problem_id: z.coerce.number().int().positive().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

export const ShippingSparePartIdParamSchema = z.object({
    id: z.coerce.number().int().positive(),
});

// ============================================================
// Address Schemas
// ============================================================

export const AddressCreateSchema = z.object({
    province: ProvinceEnum,
    cluster: z.string().max(50).nullable().optional(),
    address_shipping: z.string().min(1),
});

export const AddressUpdateSchema = AddressCreateSchema.partial();

export const AddressQuerySchema = z.object({
    province: ProvinceEnum.optional(),
    cluster: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

export const AddressIdParamSchema = z.object({
    id: z.coerce.number().int().positive(),
});

// ============================================================
// Problem Master Schemas
// ============================================================

export const ProblemMasterCreateSchema = z.object({
    problem_name: z.string().min(1).max(100),
});

export const ProblemMasterUpdateSchema = ProblemMasterCreateSchema.partial();

export const ProblemMasterQuerySchema = z.object({
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

export const ProblemMasterIdParamSchema = z.object({
    id: z.coerce.number().int().positive(),
});

// ============================================================
// Retur Spare Part Schemas
// ============================================================

export const ListSparePartItemSchema = z.object({
    name: z.string(),
    qty: z.number().int().positive(),
    condition: z.string(),
});

export const ReturSparePartCreateSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    shipper: z.string().max(50),
    source_spare_part: z.string().max(100),
    list_spare_part: z.array(ListSparePartItemSchema),
    image: z.string().nullable().optional(), // Will be set from file upload
    notes: z.string().nullable().optional(),
});

export const ReturSparePartUpdateSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    shipper: z.string().max(50).optional(),
    source_spare_part: z.string().max(100).optional(),
    list_spare_part: z.array(ListSparePartItemSchema).optional(),
    image: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
});

export const ReturSparePartQuerySchema = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    shipper: z.string().optional(),
    source_spare_part: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

export const ReturSparePartIdParamSchema = z.object({
    id: z.coerce.number().int().positive(),
});

// ============================================================
// Export Types
// ============================================================

export const ShippingExportQuerySchema = ShippingSparePartQuerySchema;
export const ReturExportQuerySchema = ReturSparePartQuerySchema;

// ============================================================
// Type Exports
// ============================================================

export type ShippingSparePartCreate = z.infer<typeof ShippingSparePartCreateSchema>;
export type ShippingSparePartUpdate = z.infer<typeof ShippingSparePartUpdateSchema>;
export type ShippingSparePartQuery = z.infer<typeof ShippingSparePartQuerySchema>;
export type AddressCreate = z.infer<typeof AddressCreateSchema>;
export type AddressUpdate = z.infer<typeof AddressUpdateSchema>;
export type AddressQuery = z.infer<typeof AddressQuerySchema>;
export type ProblemMasterCreate = z.infer<typeof ProblemMasterCreateSchema>;
export type ProblemMasterUpdate = z.infer<typeof ProblemMasterUpdateSchema>;
export type ProblemMasterQuery = z.infer<typeof ProblemMasterQuerySchema>;
export type ReturSparePartCreate = z.infer<typeof ReturSparePartCreateSchema>;
export type ReturSparePartUpdate = z.infer<typeof ReturSparePartUpdateSchema>;
export type ReturSparePartQuery = z.infer<typeof ReturSparePartQuerySchema>;

