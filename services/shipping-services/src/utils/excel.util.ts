import ExcelJS from "exceljs";
import dayjs from "dayjs";
import fs from "fs/promises";
import path from "path";
import { shippingLogger } from "./logger";

function getMonthNameIndonesian(month: number): string {
    const months = [
        "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
        "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
    ];
    return months[month - 1] || "";
}

function formatDateRangeHeader(startDate?: string, endDate?: string, province?: string): string {
    if (!startDate || !endDate) {
        return "SUNDAYA SPAREPART";
    }
    
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    
    const startMonth = getMonthNameIndonesian(start.month() + 1);
    const endMonth = getMonthNameIndonesian(end.month() + 1);
    const year = start.year();
    
    let provinceText = "";
    if (province) {
        const provinceMap: Record<string, string> = {
            "PAPUA_BARAT": "PAPUA BARAT",
            "PAPUA_BARAT_DAYA": "PAPUA BARAT DAYA",
            "PAPUA_SELATAN": "PAPUA SELATAN",
            "PAPUA": "PAPUA",
            "MALUKU": "MALUKU",
            "MALUKU_UTARA": "MALUKU UTARA",
        };
        provinceText = ` (${provinceMap[province] || province})`;
    }
    
    if (start.year() === end.year()) {
        if (start.month() === end.month()) {
            return `SUNDAYA SPAREPART BULAN ${startMonth} TAHUN ${year}${provinceText}`;
        } else {
            return `SUNDAYA SPAREPART BULAN ${startMonth} - ${endMonth} TAHUN ${year}${provinceText}`;
        }
    } else {
        return `SUNDAYA SPAREPART BULAN ${startMonth} ${start.year()} - ${endMonth} ${end.year()}${provinceText}`;
    }
}

async function getImageBuffer(imagePath: string | null | undefined): Promise<Buffer | null> {
    if (!imagePath) return null;
    
    try {
        let normalizedPath = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
        let actualPath: string;
        
        if (normalizedPath.startsWith("uploads/")) {
            actualPath = path.join(process.cwd(), normalizedPath);
        } else if (path.isAbsolute(normalizedPath)) {
            actualPath = normalizedPath;
        } else {
            actualPath = path.join(process.cwd(), "uploads", normalizedPath);
        }

        await fs.access(actualPath);
        const imageBuffer = await fs.readFile(actualPath);
        return imageBuffer;
    } catch (error) {
        shippingLogger.warn({ error, imagePath }, "Failed to read image file");
        return null;
    }
}

function addImageToWorksheet(
    workbook: ExcelJS.Workbook,
    worksheet: ExcelJS.Worksheet,
    imageBuffer: Buffer | Uint8Array,
    rowNumber: number,
    columnNumber: number,
    maxWidth: number = 150,
    maxHeight: number = 150
): void {
    try {
        let imageType: 'png' | 'jpeg' | 'gif' = 'jpeg';
        
        if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) {
            imageType = 'png';
        } else if (imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8) {
            imageType = 'jpeg';
        } else if (imageBuffer[0] === 0x47 && imageBuffer[1] === 0x49) {
            imageType = 'gif';
        }

        const imageId = workbook.addImage({
            buffer: (Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer)) as any,
            extension: imageType,
        } as any);

        // Get column width (in Excel units: 1 unit ≈ 7 pixels for default font)
        const column = worksheet.getColumn(columnNumber);
        const columnWidth = column.width || 10; // Default width if not set
        
        // Convert column width to pixels (Excel: 1 unit ≈ 7 pixels for Calibri 11pt)
        const columnWidthPixels = columnWidth * 7;
        
        // Adjust image size to fit within column with some margin, maintaining aspect ratio
        let adjustedWidth = maxWidth;
        let adjustedHeight = maxHeight;
        
        if (maxWidth > columnWidthPixels * 0.85) {
            // Scale down to fit column with 15% margin
            adjustedWidth = columnWidthPixels * 0.85;
            const aspectRatio = maxHeight / maxWidth;
            adjustedHeight = adjustedWidth * aspectRatio;
        }

        // Set cell alignment to center for better visual appearance
        const cell = worksheet.getCell(rowNumber, columnNumber);
        cell.alignment = { 
            horizontal: 'center', 
            vertical: 'middle' 
        };

        // Add image - ExcelJS will position it at the cell
        // The cell alignment helps center it visually
        worksheet.addImage(imageId, {
            tl: { col: columnNumber - 1, row: rowNumber - 1 },
            ext: { width: adjustedWidth, height: adjustedHeight },
        });
    } catch (error) {
        shippingLogger.error({ error, rowNumber, columnNumber }, "Failed to add image");
    }
}

function applyCellBorder(cell: ExcelJS.Cell): void {
    cell.border = {
        top: { style: 'thin', color: { argb: "FF000000" } },
        left: { style: 'thin', color: { argb: "FF000000" } },
        bottom: { style: 'thin', color: { argb: "FF000000" } },
        right: { style: 'thin', color: { argb: "FF000000" } }
    };
}

// Excel Export
export async function generateShippingSparePartExcel(
    data: Array<{
        id: number;
        date: Date;
        site_id: string;
        site_name?: string | null;
        pr_code?: string | null;
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
        province?: string;
    }
): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Shipping Service";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Shipping Spare Part");

    // ========================================================================
    // ROW 1: TITLE
    // ========================================================================
    const title = formatDateRangeHeader(filters?.startDate, filters?.endDate, filters?.province);
    const titleRow = worksheet.addRow([title]);
    
    worksheet.mergeCells(1, 1, 1, 11);
    const titleCell = titleRow.getCell(1);
    titleCell.value = title;
    titleCell.font = { 
        bold: true, 
        size: 12, 
        name: 'Calibri', 
        color: { argb: "FFFFFFFF" } 
    };
    titleCell.alignment = { 
        horizontal: 'center', 
        vertical: 'middle' 
    };
    titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE67E22" }, // Warm orange
    };
    applyCellBorder(titleCell);
    titleRow.height = 35;

    // ========================================================================
    // ROW 2: HEADER
    // ========================================================================
    const headerRow = worksheet.addRow([
        "TANGGAL",
        "KODE PR",
        "SITE",
        "CLUSTER",
        "ALAMAT",
        "SPAREPART NOTES",
        "PROBLEM",
        "NO. TIKET",
        "FOTO TIKET",
        "NO. RESI",
        "FOTO RESI"
    ]);
    
    // Column widths
    worksheet.getColumn(1).width = 12;  // TANGGAL
    worksheet.getColumn(2).width = 12;  // KODE PR
    worksheet.getColumn(3).width = 15;  // SITE
    worksheet.getColumn(4).width = 15;  // CLUSTER
    worksheet.getColumn(5).width = 25;  // ALAMAT
    worksheet.getColumn(6).width = 30;  // SPAREPART NOTES
    worksheet.getColumn(7).width = 20;  // PROBLEM
    worksheet.getColumn(8).width = 12;  // NO. TIKET
    worksheet.getColumn(9).width = 35;  // FOTO TIKET
    worksheet.getColumn(10).width = 12; // NO. RESI
    worksheet.getColumn(11).width = 35; // FOTO RESI

    headerRow.height = 32;
    headerRow.eachCell((cell) => {
        cell.font = { 
            bold: true, 
            size: 11, 
            name: 'Calibri', 
            color: { argb: "FFFFFFFF" } 
        };
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD68910" }, // Warm gold
        };
        cell.alignment = { 
            horizontal: 'center', 
            vertical: 'middle', 
            wrapText: true 
        };
        applyCellBorder(cell);
    });

    // Freeze header rows
    worksheet.views = [{
        state: 'frozen',
        ySplit: 2,
        activeCell: 'A3',
        showGridLines: true
    }];

    // ========================================================================
    // DATA ROWS
    // ========================================================================
    let currentRow = 3;
    
    for (const row of data) {
        const dataRow = worksheet.addRow([
            dayjs(row.date).format("YYYY-MM-DD"),
            row.pr_code || "",
            row.site_name?.toUpperCase() || "",
            row.address?.cluster?.toUpperCase() || "",
            row.address?.address_shipping || "",
            row.sparepart_note || "",
            row.problem?.problem_name || "",
            row.ticket_number || "",
            "",
            row.resi_number || "",
            ""
        ]);

        dataRow.eachCell((cell, colNumber) => {
            applyCellBorder(cell);
            
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFFFFFF" },
            };
            
            // Wrap text for ALAMAT (5), SPAREPART NOTES (6), PROBLEM (7)
            if (colNumber === 5 || colNumber === 6 || colNumber === 7) {
                cell.alignment = { 
                    vertical: 'top', 
                    horizontal: 'left', 
                    wrapText: true 
                };
            } else {
                cell.alignment = { 
                    vertical: 'top', 
                    horizontal: 'left', 
                    wrapText: false 
                };
            }
            
            cell.font = { 
                name: 'Calibri', 
                size: 11, 
                color: { argb: "FF000000" } 
            };
        });

        // Add images
        let hasImage = false;

        if (row.ticket_image) {
            const imageBuffer = await getImageBuffer(row.ticket_image);
            if (imageBuffer) {
                addImageToWorksheet(workbook, worksheet, imageBuffer, currentRow, 9, 200, 150);
                hasImage = true;
            }
        }

        if (row.resi_image) {
            const imageBuffer = await getImageBuffer(row.resi_image);
            if (imageBuffer) {
                addImageToWorksheet(workbook, worksheet, imageBuffer, currentRow, 11, 200, 150);
                hasImage = true;
            }
        }

        worksheet.getRow(currentRow).height = hasImage ? 120 : 25;
        currentRow++;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

// ============================================================================
// RETUR SPARE PART EXPORT
// ============================================================================

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

function getImagePaths(image: any): string[] {
    if (!image) return [];
    
    try {
        if (Array.isArray(image)) {
            return image.filter((img): img is string => typeof img === "string");
        }
        
        if (typeof image === "string") {
            try {
                const parsed = JSON.parse(image);
                if (Array.isArray(parsed)) {
                    return parsed.filter((img): img is string => typeof img === "string");
                }
                return [parsed];
            } catch {
                return [image];
            }
        }
        
        return [];
    } catch {
        return [];
    }
}

export async function generateReturSparePartExcel(
    data: Array<{
        id: number;
        date: Date;
        shipper: string;
        source_spare_part: string;
        list_spare_part: any;
        image: any;
        notes: string | null;
    }>
): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Shipping Service";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Retur Spare Part");

    // Title
    const titleRow = worksheet.addRow(["RETUR SPAREPART"]);
    worksheet.mergeCells(1, 1, 1, 6);
    const titleCell = titleRow.getCell(1);
    titleCell.font = { 
        bold: true, 
        size: 12, 
        name: 'Calibri', 
        color: { argb: "FFFFFFFF" } 
    };
    titleCell.alignment = { 
        horizontal: 'center', 
        vertical: 'middle' 
    };
    titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE67E22" },
    };
    applyCellBorder(titleCell);
    titleRow.height = 35;

    // Header
    const headerRow = worksheet.addRow([
        "TANGGAL",
        "PENGIRIM",
        "ASAL SPAREPART",
        "LIST SPAREPART",
        "FOTO",
        "CATATAN"
    ]);

    worksheet.getColumn(1).width = 12;  // TANGGAL
    worksheet.getColumn(2).width = 20;  // PENGIRIM
    worksheet.getColumn(3).width = 20;  // ASAL SPAREPART
    worksheet.getColumn(4).width = 40;  // LIST SPAREPART
    worksheet.getColumn(5).width = 35;  // FOTO
    worksheet.getColumn(6).width = 30;  // CATATAN

    headerRow.height = 32;
    headerRow.eachCell((cell) => {
        cell.font = { 
            bold: true, 
            size: 12, 
            name: 'Calibri', 
            color: { argb: "FFFFFFFF" } 
        };
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD68910" },
        };
        cell.alignment = { 
            horizontal: 'center', 
            vertical: 'middle', 
            wrapText: true 
        };
        applyCellBorder(cell);
    });

    worksheet.views = [{
        state: 'frozen',
        ySplit: 2,
        activeCell: 'A3',
        showGridLines: true
    }];

    // Data rows
    let currentRow = 3;
    
    for (const row of data) {
        const imagePaths = getImagePaths(row.image);
        const dataRow = worksheet.addRow([
            dayjs(row.date).format("YYYY-MM-DD"),
            row.shipper,
            row.source_spare_part,
            formatListSparePart(row.list_spare_part),
            "",
            row.notes || "",
        ]);

        dataRow.eachCell((cell, colNumber) => {
            applyCellBorder(cell);
            
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFFFFFF" },
            };
            
            // Wrap text for LIST SPAREPART (4) and CATATAN (6)
            if (colNumber === 4 || colNumber === 6) {
                cell.alignment = { 
                    vertical: 'top', 
                    horizontal: 'left', 
                    wrapText: true 
                };
            } else {
                cell.alignment = { 
                    vertical: 'top', 
                    horizontal: 'left', 
                    wrapText: false 
                };
            }
            
            cell.font = { 
                name: 'Calibri', 
                size: 11, 
                color: { argb: "FF000000" } 
            };
        });

        let hasImage = false;
        if (imagePaths.length > 0) {
            const firstImageBuffer = await getImageBuffer(imagePaths[0]);
            if (firstImageBuffer) {
                addImageToWorksheet(workbook, worksheet, firstImageBuffer, currentRow, 5, 200, 150);
                hasImage = true;
            }
            
            if (imagePaths.length > 1) {
                const imageCell = worksheet.getCell(currentRow, 5);
                imageCell.value = `(+ ${imagePaths.length - 1} gambar lainnya)`;
                imageCell.alignment = { vertical: 'top', wrapText: true };
                imageCell.font = {
                    name: 'Calibri',
                    size: 10,
                    color: { argb: "FF000000" },
                    italic: true,
                };
            }
        }

        worksheet.getRow(currentRow).height = hasImage ? 120 : 25;
        currentRow++;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}