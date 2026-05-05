// ============================================================
// SLA Reason Types
// ============================================================

export interface SlaReasonInput {
    reason: string;
}

export interface SlaReasonResponse {
    id: number;
    reason: string;
    createdAt: string;
    updatedAt: string;
}

export interface SlaReasonQueryParams {
    page?: number;
    limit?: number;
    search?: string;
}

export interface BatteryVersionReasonInput {
    batteryVersion: string;
    reasonId: number;
    period?: string; // Format: YYYY-MM (e.g., "2024-01"), optional, default to current month
}

export interface BatteryVersionReasonResponse {
    id: number;
    batteryVersion: string;
    reasonId: number;
    period: string; // Format: YYYY-MM
    reason: SlaReasonResponse;
    createdAt: string;
}

// Response type for getReasonsByBatteryVersion
// Includes batteryVersionId (BatteryVersionReason.id) so frontend can use the correct ID for deletion
export interface BatteryVersionReasonDetailResponse {
    id: number;               // SlaReason.id (for display)
    batteryVersionId: number; // BatteryVersionReason.id (use this for DELETE /battery-version/:id)
    reason: string;
    createdAt: string;
    updatedAt: string;
}

