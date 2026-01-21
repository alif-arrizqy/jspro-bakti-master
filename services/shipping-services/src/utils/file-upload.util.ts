import { MultipartFile } from "@fastify/multipart";
import { randomBytes } from "crypto";
import path from "path";
import fs from "fs/promises";
import { shippingLogger } from "./logger";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface UploadResult {
    filename: string;
    filePath: string;
    url: string;
}

/**
 * Validate image file (type and size)
 */
export function validateImageFile(file: MultipartFile): void {
    // Validate file type by mimetype
    const mimeType = file.mimetype || "";
    if (!ALLOWED_IMAGE_TYPES.includes(mimeType.toLowerCase())) {
        throw new Error(`Invalid file type. Allowed types: jpg, jpeg, png. Got: ${mimeType}`);
    }

    // Validate file extension
    if (file.filename) {
        const ext = path.extname(file.filename).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            throw new Error(`Invalid file extension. Allowed extensions: .jpg, .jpeg, .png`);
        }
    }

    // Note: file.size might not be available until we read the buffer
    // We'll validate size after reading buffer
}

/**
 * Validate file size from buffer
 */
export function validateFileSize(buffer: Buffer): void {
    if (buffer.length > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum limit of 5MB. Got: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
    }
}

/**
 * Generate unique filename
 */
export function generateImageFilename(originalName: string, prefix: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const random = randomBytes(4).toString("hex");
    return `${prefix}_${timestamp}_${random}${ext}`;
}

/**
 * Get content type from filename
 */
export function getContentTypeFromFilename(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    };
    return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Save image file to local storage
 */
export async function saveImageFile(
    buffer: Buffer,
    filename: string,
    folder: "ticket" | "resi" | "retur"
): Promise<UploadResult> {
    // Determine upload directory based on folder type
    let uploadDir: string;
    if (folder === "retur") {
        uploadDir = path.join(process.cwd(), "uploads", "retur");
    } else {
        uploadDir = path.join(process.cwd(), "uploads", "shipping", folder);
    }

    // Ensure directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    // Full file path
    const filePath = path.join(uploadDir, filename);

    // Write file to disk
    await fs.writeFile(filePath, buffer);

    // Generate URL (relative path from uploads folder)
    const relativePath = folder === "retur" 
        ? `uploads/retur/${filename}`
        : `uploads/shipping/${folder}/${filename}`;

    shippingLogger.info({ filename, folder, filePath: relativePath }, "Image file saved");

    return {
        filename,
        filePath: relativePath,
        url: `/${relativePath}`, // Relative URL, frontend can prepend base URL
    };
}

/**
 * Delete image file from local storage
 */
export async function deleteImageFile(filePath: string): Promise<void> {
    try {
        if (!filePath || filePath.trim() === "") {
            shippingLogger.warn({ filePath }, "Empty file path provided, skipping delete");
            return;
        }

        // Normalize path: remove leading slash if exists
        let normalizedPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;

        // Build absolute path
        let actualPath: string;
        
        // If path already starts with "uploads/", use it directly
        if (normalizedPath.startsWith("uploads/")) {
            actualPath = path.join(process.cwd(), normalizedPath);
        } 
        // If path is absolute, use it as is
        else if (path.isAbsolute(normalizedPath)) {
            actualPath = normalizedPath;
        }
        // Otherwise, assume it's relative to uploads folder
        else {
            actualPath = path.join(process.cwd(), "uploads", normalizedPath);
        }

        // Check if file exists before attempting to delete
        try {
            await fs.access(actualPath);
        } catch (accessError) {
            shippingLogger.warn({ filePath, actualPath }, "Image file does not exist, skipping delete");
            return;
        }

        // Delete the file
        await fs.unlink(actualPath);
        shippingLogger.info({ filePath, actualPath }, "Image file deleted successfully");
    } catch (error) {
        // Log error but don't throw - we don't want delete operation to fail the entire request
        const errorMessage = error instanceof Error ? error.message : String(error);
        shippingLogger.error({ error: errorMessage, filePath }, "Failed to delete image file");
        // Re-throw only for unexpected errors that we should know about
        // For ENOENT (file not found), we already handled it above
        if (error instanceof Error && (error as any).code !== "ENOENT") {
            shippingLogger.error({ error: errorMessage, filePath }, "Unexpected error deleting image file");
        }
    }
}

/**
 * Process and save image from multipart file
 */
export async function processImageUpload(
    file: MultipartFile | undefined,
    prefix: "ticket" | "resi" | "retur"
): Promise<string | null> {
    if (!file) {
        return null;
    }

    // Validate file
    validateImageFile(file);

    // Read buffer
    const buffer = await file.toBuffer();

    // Validate size
    validateFileSize(buffer);

    // Generate filename
    const filename = generateImageFilename(file.filename || "image.jpg", prefix);

    // Save file
    const result = await saveImageFile(buffer, filename, prefix);

    return result.url;
}

