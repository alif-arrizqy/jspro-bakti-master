import ExcelJS from "exceljs";
import dayjs from "dayjs";
import { shippingLogger } from "./logger";

/**
 * Generate Excel file for Shipping Spare Part export
 */
export async function generateShippingSparePartExcel(
    data: Array<{
        id: number;
        date: Date;
        site_id: string;
        address: {
            province: string;
            cluster: string | null;
            address_shipping: string;
        } | null;
        sparepart_note: string | null;
        problem: {
            problem_name: string;
        } | null;
        ticket_number: string | null;
        ticket_image: string | null;
        status: string;
        resi_number: string | null;
        resi_image: string | null;
    }>,
    filters?: {
        startDate?: string;
        endDate?: string;
        status?: string[];
    }
): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Shipping Service";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Shipping Spare Part");

    // Define columns
    worksheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Tanggal", key: "date", width: 15 },
        { header: "Site ID", key: "site_id", width: 15 },
        { header: "Provinsi", key: "province", width: 20 },
        { header: "Cluster", key: "cluster", width: 15 },
        { header: "Alamat Pengiriman", key: "address_shipping", width: 40 },
        { header: "Catatan Spare Part", key: "sparepart_note", width: 30 },
        { header: "Problem", key: "problem", width: 25 },
        { header: "Nomor Tiket", key: "ticket_number", width: 20 },
        { header: "Foto Tiket", key: "ticket_image", width: 40 },
        { header: "Status", key: "status", width: 18 },
        { header: "Nomor Resi", key: "resi_number", width: 20 },
        { header: "Foto Resi", key: "resi_image", width: 40 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
    };
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

    // Add data rows
    for (const row of data) {
        worksheet.addRow({
            id: row.id,
            date: dayjs(row.date).format("YYYY-MM-DD"),
            site_id: row.site_id,
            province: row.address?.province || "",
            cluster: row.address?.cluster || "",
            address_shipping: row.address?.address_shipping || "",
            sparepart_note: row.sparepart_note || "",
            problem: row.problem?.problem_name || "",
            ticket_number: row.ticket_number || "",
            ticket_image: row.ticket_image || "",
            status: row.status,
            resi_number: row.resi_number || "",
            resi_image: row.resi_image || "",
        });
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

/**
 * Generate Excel file for Retur Spare Part export
 */
export async function generateReturSparePartExcel(
    data: Array<{
        id: number;
        date: Date;
        shipper: string;
        source_spare_part: string;
        list_spare_part: any; // JSONB
        image: any; // JSONB
        notes: string | null;
    }>
): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Shipping Service";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Retur Spare Part");

    // Define columns
    worksheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Tanggal", key: "date", width: 15 },
        { header: "Pengirim", key: "shipper", width: 20 },
        { header: "Sumber Spare Part", key: "source_spare_part", width: 25 },
        { header: "Daftar Spare Part", key: "list_spare_part", width: 50 },
        { header: "Foto", key: "image", width: 40 },
        { header: "Catatan", key: "notes", width: 40 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
    };
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

    // Helper function to format list_spare_part JSON
    function formatListSparePart(list: any): string {
        if (!list) return "";
        try {
            const parsed = typeof list === "string" ? JSON.parse(list) : list;
            if (Array.isArray(parsed)) {
                return parsed
                    .map((item: any) => {
                        const name = item.name || item.nama || "";
                        const qty = item.qty || item.quantity || "";
                        const condition = item.condition || item.kondisi || "";
                        return `${name} (Qty: ${qty}, Condition: ${condition})`;
                    })
                    .join("; ");
            }
            return String(list);
        } catch {
            return String(list);
        }
    }

    // Helper function to format image JSON
    function formatImage(image: any): string {
        if (!image) return "";
        try {
            const parsed = typeof image === "string" ? JSON.parse(image) : image;
            if (Array.isArray(parsed)) {
                return parsed.join(", ");
            }
            return String(parsed);
        } catch {
            return String(image);
        }
    }

    // Add data rows
    for (const row of data) {
        worksheet.addRow({
            id: row.id,
            date: dayjs(row.date).format("YYYY-MM-DD"),
            shipper: row.shipper,
            source_spare_part: row.source_spare_part,
            list_spare_part: formatListSparePart(row.list_spare_part),
            image: formatImage(row.image),
            notes: row.notes || "",
        });
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

