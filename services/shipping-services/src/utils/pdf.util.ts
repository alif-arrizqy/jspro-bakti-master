import PDFDocument from "pdfkit";
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

export async function generateShippingSparePartPDF(
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
        status?: string[] | string;
        province?: string;
    }
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ 
                size: 'A4',
                layout: 'landscape', // LANDSCAPE MODE ENFORCED
                margin: 15
            });
            
            const chunks: Buffer[] = [];
            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // A4 Landscape dimensions: 841.89pt x 595.28pt
            const margin = 15;
            const pageWidth = 841.89;  // A4 landscape width
            const pageHeight = 595.28; // A4 landscape height
            const usableWidth = pageWidth - (margin * 2); // 811.89pt
            const usableHeight = pageHeight - (margin * 2);

            // Column configuration - optimized for 811.89pt
            const columns = [
                { header: 'TANGGAL', width: 54 },
                { header: 'KODE PR', width: 47 },
                { header: 'SITE', width: 60 },
                { header: 'CLUSTER', width: 55 },
                { header: 'ALAMAT', width: 110 },
                { header: 'SPAREPART NOTES', width: 110 },
                { header: 'PROBLEM', width: 70 },
                { header: 'NO. TIKET', width: 50 },
                { header: 'FOTO TIKET', width: 110 },
                { header: 'NO. RESI', width: 50 },
                { header: 'FOTO RESI', width: 110 },
            ];

            const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
            
            // Auto-scale if needed
            if (totalWidth > usableWidth) {
                const scale = usableWidth / totalWidth;
                columns.forEach(col => {
                    col.width = Math.floor(col.width * scale);
                });
            }

            // DRAW HEADER FUNCTION
            function drawHeader(yPosition: number): number {
                let y = yPosition;

                // Title - Warm orange with thin border
                const titleHeight = 35;
                const title = formatDateRangeHeader(filters?.startDate, filters?.endDate, filters?.province);
                
                doc.rect(margin, y, usableWidth, titleHeight)
                   .fillAndStroke("#E67E22", "#000000");
                
                doc.lineWidth(0.5); // THIN BORDER
                
                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .fillColor("#FFFFFF");
                
                doc.text(title, margin, y + 12, {
                    width: usableWidth,
                    align: 'center'
                });
                
                y += titleHeight;

                // Column headers - Warm gold with thin border
                const headerHeight = 32;
                doc.rect(margin, y, usableWidth, headerHeight)
                   .fillAndStroke("#D68910", "#000000");

                doc.lineWidth(0.5); // THIN BORDER

                doc.fontSize(9)
                   .font('Helvetica-Bold')
                   .fillColor("#FFFFFF");

                let xPos = margin;
                columns.forEach((col, idx) => {
                    // Draw vertical separator - THIN
                    if (idx > 0) {
                        doc.moveTo(xPos, y)
                           .lineTo(xPos, y + headerHeight)
                           .strokeColor("#000000")
                           .lineWidth(0.5) // THIN LINE
                           .stroke();
                    }

                    // Draw text centered
                    doc.text(col.header, xPos + 2, y + 11, {
                        width: col.width - 4,
                        align: 'center',
                        lineBreak: false,
                        ellipsis: true
                    });

                    xPos += col.width;
                });

                y += headerHeight;
                doc.fillColor("#000000");

                return y;
            }

            // ================================================================
            // DRAW DATA ROWS - THIN BORDERS (0.5pt)
            // ================================================================
            async function drawRows() {
                let currentY = drawHeader(margin);

                const imageSize = 90;
                const minRowHeight = 28;
                const imageRowHeight = 95;

                for (const row of data) {
                    const hasImages = !!(row.ticket_image || row.resi_image);
                    const rowHeight = hasImages ? imageRowHeight : minRowHeight;

                    // Check if need new page
                    if (currentY + rowHeight > pageHeight - margin) {
                        doc.addPage({
                            size: 'A4',
                            layout: 'landscape', // MAINTAIN LANDSCAPE
                            margin: 15
                        });
                        currentY = drawHeader(margin);
                    }

                    const rowStartY = currentY;

                    // Draw row background and THIN border
                    doc.lineWidth(0.5); // THIN BORDER
                    doc.rect(margin, rowStartY, usableWidth, rowHeight)
                       .fillAndStroke("#FFFFFF", "#000000"); // Black border

                    // Prepare row data
                    const rowData = [
                        dayjs(row.date).format("YYYY-MM-DD"),
                        row.pr_code || "",
                        row.site_name?.toUpperCase() || "",
                        row.address?.cluster?.toUpperCase() || "",
                        row.address?.address_shipping || "",
                        row.sparepart_note || "",
                        row.problem?.problem_name || "",
                        row.ticket_number || "",
                        "", // FOTO TIKET
                        row.resi_number || "",
                        "", // FOTO RESI
                    ];

                    // Draw cell content
                    doc.fontSize(9).font('Helvetica').fillColor("#000000");

                    let xPos = margin;
                    rowData.forEach((cellData, idx) => {
                        const col = columns[idx];

                        // Draw vertical separator - THIN
                        if (idx > 0) {
                            doc.moveTo(xPos, rowStartY)
                               .lineTo(xPos, rowStartY + rowHeight)
                               .strokeColor("#000000") // Black
                               .lineWidth(0.5) // THIN LINE
                               .stroke();
                        }

                        // Draw text (skip image columns 8 and 10)
                        if (idx !== 8 && idx !== 10) {
                            const textX = xPos + 3;
                            const textY = rowStartY + 5;
                            const textWidth = col.width - 6;

                            // Wrap text for long columns (ALAMAT, SPAREPART NOTES, PROBLEM)
                            if (idx === 4 || idx === 5 || idx === 6) {
                                doc.text(cellData, textX, textY, {
                                    width: textWidth,
                                    align: 'left',
                                    lineGap: 1,
                                    height: rowHeight - 10
                                });
                            } else {
                                doc.text(cellData, textX, textY, {
                                    width: textWidth,
                                    align: 'left',
                                    lineBreak: false,
                                    ellipsis: true
                                });
                            }
                        }

                        xPos += col.width;
                    });

                    // Add ticket image (column 8)
                    if (row.ticket_image) {
                        const imageBuffer = await getImageBuffer(row.ticket_image);
                        if (imageBuffer) {
                            try {
                                const colX = margin + columns.slice(0, 8).reduce((sum, c) => sum + c.width, 0);
                                const imgX = colX + (columns[8].width - imageSize) / 2;
                                const imgY = rowStartY + (rowHeight - imageSize) / 2;
                                
                                doc.image(imageBuffer, imgX, imgY, {
                                    fit: [imageSize, imageSize]
                                });
                            } catch (error) {
                                shippingLogger.warn({ error }, "Failed to add ticket image");
                            }
                        }
                    }

                    // Add resi image (column 10)
                    if (row.resi_image) {
                        const imageBuffer = await getImageBuffer(row.resi_image);
                        if (imageBuffer) {
                            try {
                                const colX = margin + columns.slice(0, 10).reduce((sum, c) => sum + c.width, 0);
                                const imgX = colX + (columns[10].width - imageSize) / 2;
                                const imgY = rowStartY + (rowHeight - imageSize) / 2;
                                
                                doc.image(imageBuffer, imgX, imgY, {
                                    fit: [imageSize, imageSize]
                                });
                            } catch (error) {
                                shippingLogger.warn({ error }, "Failed to add resi image");
                            }
                        }
                    }

                    currentY = rowStartY + rowHeight;
                }

                doc.end();
            }

            drawRows().catch(reject);

        } catch (error) {
            reject(error);
        }
    });
}

// RETUR SPARE PART PDF
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

export async function generateReturSparePartPDF(
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
    return new Promise((resolve, reject) => {
        try {
            // FORCE LANDSCAPE MODE
            const doc = new PDFDocument({ 
                size: 'A4',
                layout: 'landscape', // LANDSCAPE ENFORCED
                margin: 15
            });
            
            const chunks: Buffer[] = [];
            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const margin = 15;
            const pageWidth = 841.89;  // A4 landscape
            const pageHeight = 595.28;
            const usableWidth = pageWidth - (margin * 2);

            const columns = [
                { header: 'TANGGAL', width: 58 },
                { header: 'PENGIRIM', width: 78 },
                { header: 'ASAL SPAREPART', width: 98 },
                { header: 'LIST SPAREPART', width: 150 },
                { header: 'FOTO', width: 118 },
                { header: 'CATATAN', width: 135 },
            ];

            const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
            if (totalWidth > usableWidth) {
                const scale = usableWidth / totalWidth;
                columns.forEach(col => {
                    col.width = Math.floor(col.width * scale);
                });
            }

            function drawHeader(yPosition: number): number {
                let y = yPosition;

                // Title - THIN BORDER
                const titleHeight = 35;
                doc.lineWidth(0.5); // THIN
                doc.rect(margin, y, usableWidth, titleHeight)
                   .fillAndStroke("#E67E22", "#000000");
                
                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .fillColor("#FFFFFF")
                   .text("RETUR SPAREPART", margin, y + 12, {
                       width: usableWidth,
                       align: 'center'
                   });
                
                y += titleHeight;

                // Headers - THIN BORDER
                const headerHeight = 32;
                doc.lineWidth(0.5); // THIN
                doc.rect(margin, y, usableWidth, headerHeight)
                   .fillAndStroke("#D68910", "#000000");

                doc.fontSize(9).font('Helvetica-Bold').fillColor("#FFFFFF");

                let xPos = margin;
                columns.forEach((col, idx) => {
                    if (idx > 0) {
                        doc.moveTo(xPos, y)
                           .lineTo(xPos, y + headerHeight)
                           .strokeColor("#000000")
                           .lineWidth(0.5) // THIN
                           .stroke();
                    }

                    doc.text(col.header, xPos + 2, y + 11, {
                        width: col.width - 4,
                        align: 'center',
                        lineBreak: false,
                        ellipsis: true
                    });

                    xPos += col.width;
                });

                y += headerHeight;
                doc.fillColor("#000000");

                return y;
            }

            async function drawRows() {
                let currentY = drawHeader(margin);

                const imageSize = 95;
                const rowHeight = 105;

                for (const row of data) {
                    if (currentY + rowHeight > pageHeight - margin) {
                        doc.addPage({
                            size: 'A4',
                            layout: 'landscape', // MAINTAIN LANDSCAPE
                            margin: 15
                        });
                        currentY = drawHeader(margin);
                    }

                    const rowStartY = currentY;
                    const imagePaths = getImagePaths(row.image);

                    // THIN BORDER
                    doc.lineWidth(0.5);
                    doc.rect(margin, rowStartY, usableWidth, rowHeight)
                       .fillAndStroke("#FFFFFF", "#000000");

                    const rowData = [
                        dayjs(row.date).format("YYYY-MM-DD"),
                        row.shipper,
                        row.source_spare_part,
                        formatListSparePart(row.list_spare_part),
                        "",
                        row.notes || "",
                    ];

                    doc.fontSize(9).font('Helvetica').fillColor("#000000");

                    let xPos = margin;
                    rowData.forEach((cellData, idx) => {
                        const col = columns[idx];

                        if (idx > 0) {
                            doc.moveTo(xPos, rowStartY)
                               .lineTo(xPos, rowStartY + rowHeight)
                               .strokeColor("#000000")
                               .lineWidth(0.5) // THIN
                               .stroke();
                        }

                        // Skip image column (index 4)
                        if (idx !== 4) {
                            const textX = xPos + 3;
                            const textY = rowStartY + 5;
                            const textWidth = col.width - 6;

                            // Wrap text for LIST SPAREPART (3) and CATATAN (5)
                            if (idx === 3 || idx === 5) {
                                doc.text(cellData, textX, textY, {
                                    width: textWidth,
                                    align: 'left',
                                    lineGap: 1,
                                    height: rowHeight - 10
                                });
                            } else {
                                doc.text(cellData, textX, textY, {
                                    width: textWidth,
                                    align: 'left',
                                    lineBreak: false,
                                    ellipsis: true
                                });
                            }
                        }

                        xPos += col.width;
                    });

                    // Add image (column 4)
                    if (imagePaths.length > 0) {
                        const imageBuffer = await getImageBuffer(imagePaths[0]);
                        if (imageBuffer) {
                            try {
                                const colX = margin + columns.slice(0, 4).reduce((sum, c) => sum + c.width, 0);
                                const imgX = colX + (columns[4].width - imageSize) / 2;
                                const imgY = rowStartY + (rowHeight - imageSize) / 2;
                                
                                doc.image(imageBuffer, imgX, imgY, {
                                    fit: [imageSize, imageSize]
                                });
                            } catch (error) {
                                shippingLogger.warn({ error }, "Failed to add image");
                            }
                        }
                    }

                    currentY = rowStartY + rowHeight;
                }

                doc.end();
            }

            drawRows().catch(reject);

        } catch (error) {
            reject(error);
        }
    });
}