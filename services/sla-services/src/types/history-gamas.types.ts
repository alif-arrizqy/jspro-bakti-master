// ============================================================
// History Gamas Types
// ============================================================

export interface HistoryGamasInput {
    date: string;
    description?: string | null;
}

export interface HistoryGamasResponse {
    id: number;
    date: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface HistoryGamasQueryParams {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}

