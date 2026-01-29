package utils

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"sparepart-management-services/internal/config"
	"time"

	"go.uber.org/zap"
)

// ProcessImageUpload handles image upload with subdirectory support
// subDir: subdirectory within uploads (e.g., "sparepart/new_stock", "tools_alker")
// prefix: filename prefix (e.g., "sparepart_stock_new", "tools_alker")
func ProcessImageUpload(file *multipart.FileHeader, subDir string, prefix string, logger *zap.Logger) (string, error) {
	// Validate file size
	if file.Size > config.App.Upload.MaxFileSize {
		return "", fmt.Errorf("file size exceeds maximum allowed size of %d bytes", config.App.Upload.MaxFileSize)
	}

	// Validate file type (basic check)
	ext := filepath.Ext(file.Filename)
	allowedExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".webp": true,
	}
	if !allowedExts[ext] {
		return "", fmt.Errorf("invalid file type. Allowed: jpg, jpeg, png, gif, webp")
	}

	// Create upload directory with subdirectory
	uploadDir := filepath.Join(config.App.Upload.Dir, subDir)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Generate unique filename
	timestamp := time.Now().Unix()
	filename := fmt.Sprintf("%s_%d%s", prefix, timestamp, ext)
	filePath := filepath.Join(uploadDir, filename)

	// Open source file
	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	// Create destination file
	dst, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to create destination file: %w", err)
	}
	defer dst.Close()

	// Copy file content
	if _, err := io.Copy(dst, src); err != nil {
		return "", fmt.Errorf("failed to save file: %w", err)
	}

	// Return relative path for storage in database
	relativePath := fmt.Sprintf("/uploads/%s/%s", subDir, filename)
	
	if logger != nil {
		logger.Info("File uploaded successfully", 
			zap.String("filename", filename),
			zap.String("path", relativePath),
			zap.String("subDir", subDir),
		)
	}

	return relativePath, nil
}

func DeleteFile(filePath string, logger *zap.Logger) error {
	// Remove /uploads/ prefix if present
	if len(filePath) > 9 && filePath[:9] == "/uploads/" {
		filePath = filePath[9:]
	}

	fullPath := filepath.Join(config.App.Upload.Dir, filePath)
	
	if err := os.Remove(fullPath); err != nil {
		if !os.IsNotExist(err) {
			return fmt.Errorf("failed to delete file: %w", err)
		}
		// File doesn't exist, that's okay
	}

	if logger != nil {
		logger.Info("File deleted", zap.String("path", fullPath))
	}

	return nil
}

// GetSubDirForSparepartStock returns subdirectory based on stock type
func GetSubDirForSparepartStock(stockType string) string {
	if stockType == "NEW_STOCK" {
		return "sparepart/new_stock"
	}
	return "sparepart/used_stock"
}

// GetPrefixForSparepartStock returns filename prefix based on stock type
func GetPrefixForSparepartStock(stockType string) string {
	if stockType == "NEW_STOCK" {
		return "sparepart_stock_new"
	}
	return "sparepart_stock_used"
}

