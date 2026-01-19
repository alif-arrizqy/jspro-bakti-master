// ============================================================
// Shipping Spare Part Types
// ============================================================

export type ShippingStatus = "REQUEST_GUDANG" | "PROSES_KIRIM" | "SELESAI";
export type Province = "PAPUA_BARAT" | "PAPUA_BARAT_DAYA" | "PAPUA_SELATAN" | "PAPUA" | "MALUKU" | "MALUKU_UTARA";

export interface ShippingSparePartInput {
    date: string;
    site_id: string;
    address_id: number;
    sparepart_note?: string | null;
    problem_id: number;
    ticket_number?: string | null;
    ticket_image?: string | null;
    status: ShippingStatus;
    resi_number?: string | null;
    resi_image?: string | null;
}

export interface ShippingSparePartResponse {
    id: number;
    date: string;
    site_id: string;
    address_id: number;
    address?: {
        id: number;
        province: string;
        cluster: string | null;
        address_shipping: string;
    } | null;
    sparepart_note: string | null;
    problem_id: number;
    problem?: {
        id: number;
        problem_name: string;
    } | null;
    ticket_number: string | null;
    ticket_image: string | null;
    status: ShippingStatus;
    resi_number: string | null;
    resi_image: string | null;
    created_at: string;
    updated_at: string;
}

export interface ShippingSparePartUpdateInput {
    resi_number?: string;
    resi_image?: string | null;
    status?: ShippingStatus;
}

export interface ShippingSparePartQueryParams {
    status?: ShippingStatus | ShippingStatus[];
    site_id?: string;
    address_id?: number;
    problem_id?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export interface PaginatedShippingResponse {
    data: ShippingSparePartResponse[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// ============================================================
// Address Types
// ============================================================

export interface AddressInput {
    province: Province;
    cluster?: string | null;
    address_shipping: string;
}

export interface AddressResponse {
    id: number;
    province: string;
    cluster: string | null;
    address_shipping: string;
    created_at: string;
    updated_at: string;
}

export interface AddressQueryParams {
    province?: Province;
    cluster?: string;
    page?: number;
    limit?: number;
}

// ============================================================
// Problem Master Types
// ============================================================

export interface ProblemMasterInput {
    problem_name: string;
}

export interface ProblemMasterResponse {
    id: number;
    problem_name: string;
    created_at: string;
    updated_at: string;
}

export interface ProblemMasterQueryParams {
    search?: string;
    page?: number;
    limit?: number;
}

// ============================================================
// Retur Spare Part Types
// ============================================================

export interface ReturSparePartInput {
    date: string;
    shipper: string;
    source_spare_part: string;
    list_spare_part: Array<{
        name: string;
        qty: number;
        condition: string;
    }>;
    image?: string | null;
    notes?: string | null;
}

export interface ReturSparePartResponse {
    id: number;
    date: string;
    shipper: string;
    source_spare_part: string;
    list_spare_part: any; // JSONB
    image: any; // JSONB
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface ReturSparePartUpdateInput {
    date?: string;
    shipper?: string;
    source_spare_part?: string;
    list_spare_part?: Array<{
        name: string;
        qty: number;
        condition: string;
    }>;
    image?: string | null;
    notes?: string | null;
}

export interface ReturSparePartQueryParams {
    startDate?: string;
    endDate?: string;
    shipper?: string;
    source_spare_part?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export interface PaginatedReturResponse {
    data: ReturSparePartResponse[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

