package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/jung-kurt/gofpdf"
	"github.com/xuri/excelize/v2"
	"go.uber.org/zap"
	sqlcdb "sparepart-management-services/internal/database/sqlc"
)

// ExportSparepartStockToPDF exports sparepart stock items to PDF in landscape mode
func ExportSparepartStockToPDF(items []sqlcdb.ListSparepartStocksForExportRow, logger *zap.Logger) (*bytes.Buffer, error) {
	pdf := gofpdf.New("L", "mm", "A4", "") // Landscape, mm, A4
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(40, 10, "Sparepart Stock Report")
	pdf.Ln(12)

	// Table header
	pdf.SetFont("Arial", "B", 9)
	pdf.SetFillColor(200, 200, 200)
	headers := []string{"ID", "Location", "Sparepart", "Stock Type", "Quantity", "Notes", "Photos"}
	colWidths := []float64{15, 50, 50, 30, 20, 40, 30}
	
	// Print header
	for i, header := range headers {
		pdf.CellFormat(colWidths[i], 7, header, "1", 0, "C", true, 0, "")
	}
	pdf.Ln(-1)

	// Table data
	pdf.SetFont("Arial", "", 8)
	pdf.SetFillColor(255, 255, 255)
	for _, item := range items {
		location := fmt.Sprintf("%s - %s", item.Regency, item.Cluster)
		sparepart := item.SparepartName
		stockType := string(item.StockType)
		quantity := strconv.Itoa(int(item.Quantity))
		notes := ""
		if item.Notes.Valid {
			notes = item.Notes.String
			if len(notes) > 30 {
				notes = notes[:30] + "..."
			}
		}
		// Parse documentation JSONB
		var docs []string
		if len(item.Documentation) > 0 {
			json.Unmarshal(item.Documentation, &docs)
		}
		photos := fmt.Sprintf("%d photo(s)", len(docs))

		// Handle text wrapping for long content
		rowHeight := 7.0
		if len(location) > 30 || len(sparepart) > 30 {
			rowHeight = 10.0
		}

		pdf.CellFormat(colWidths[0], rowHeight, strconv.Itoa(int(item.ID)), "1", 0, "C", false, 0, "")
		pdf.CellFormat(colWidths[1], rowHeight, location, "1", 0, "L", false, 0, "")
		pdf.CellFormat(colWidths[2], rowHeight, sparepart, "1", 0, "L", false, 0, "")
		pdf.CellFormat(colWidths[3], rowHeight, stockType, "1", 0, "C", false, 0, "")
		pdf.CellFormat(colWidths[4], rowHeight, quantity, "1", 0, "C", false, 0, "")
		pdf.CellFormat(colWidths[5], rowHeight, notes, "1", 0, "L", false, 0, "")
		pdf.CellFormat(colWidths[6], rowHeight, photos, "1", 0, "C", false, 0, "")
		pdf.Ln(-1)
	}

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		if logger != nil {
			logger.Error("Failed to generate PDF", zap.Error(err))
		}
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	return &buf, nil
}

// ExportSparepartStockToExcel exports sparepart stock items to Excel
func ExportSparepartStockToExcel(items []sqlcdb.ListSparepartStocksForExportRow, logger *zap.Logger) (*bytes.Buffer, error) {
	f := excelize.NewFile()
	defer func() {
		if err := f.Close(); err != nil {
			if logger != nil {
				logger.Error("Failed to close Excel file", zap.Error(err))
			}
		}
	}()

	sheetName := "Sparepart Stock"
	f.NewSheet(sheetName)
	f.DeleteSheet("Sheet1")

	// Set header
	headers := []string{"ID", "Region", "Regency", "Cluster", "Sparepart Name", "Stock Type", "Quantity", "Notes", "Photos Count", "Created At"}
	for i, header := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		f.SetCellValue(sheetName, cell, header)
		f.SetCellStyle(sheetName, cell, cell, getHeaderStyle(f))
	}

	// Set data
	for i, item := range items {
		row := i + 2
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), item.ID)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), string(item.Region))
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), item.Regency)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), item.Cluster)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), item.SparepartName)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), string(item.StockType))
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), item.Quantity)
		notes := ""
		if item.Notes.Valid {
			notes = item.Notes.String
		}
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), notes)
		// Parse documentation JSONB
		var docs []string
		if len(item.Documentation) > 0 {
			json.Unmarshal(item.Documentation, &docs)
		}
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), len(docs))
		createdAt := ""
		if item.CreatedAt.Valid {
			createdAt = item.CreatedAt.Time.Format("2006-01-02 15:04:05")
		}
		f.SetCellValue(sheetName, fmt.Sprintf("J%d", row), createdAt)
	}

	// Auto-fit columns
	for i := 0; i < len(headers); i++ {
		col := string(rune('A' + i))
		f.SetColWidth(sheetName, col, col, 15)
	}

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		if logger != nil {
			logger.Error("Failed to write Excel file", zap.Error(err))
		}
		return nil, fmt.Errorf("failed to write Excel file: %w", err)
	}

	return &buf, nil
}

// ExportToolsAlkerToPDF exports tools alker items to PDF in landscape mode
func ExportToolsAlkerToPDF(items []sqlcdb.ListToolsAlkersForExportRow, logger *zap.Logger) (*bytes.Buffer, error) {
	pdf := gofpdf.New("L", "mm", "A4", "") // Landscape, mm, A4
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(40, 10, "Tools Alker Report")
	pdf.Ln(12)

	// Table header
	pdf.SetFont("Arial", "B", 9)
	pdf.SetFillColor(200, 200, 200)
	headers := []string{"ID", "Location", "Tools", "Quantity", "Notes", "Photos"}
	colWidths := []float64{15, 60, 60, 20, 50, 30}
	
	// Print header
	for i, header := range headers {
		pdf.CellFormat(colWidths[i], 7, header, "1", 0, "C", true, 0, "")
	}
	pdf.Ln(-1)

	// Table data
	pdf.SetFont("Arial", "", 8)
	pdf.SetFillColor(255, 255, 255)
	for _, item := range items {
		location := fmt.Sprintf("%s - %s", item.Regency, item.Cluster)
		tools := item.ToolsName
		quantity := strconv.Itoa(int(item.Quantity))
		notes := ""
		if item.Notes.Valid {
			notes = item.Notes.String
			if len(notes) > 30 {
				notes = notes[:30] + "..."
			}
		}
		// Parse documentation JSONB
		var docs []string
		if len(item.Documentation) > 0 {
			json.Unmarshal(item.Documentation, &docs)
		}
		photos := fmt.Sprintf("%d photo(s)", len(docs))

		rowHeight := 7.0
		if len(location) > 30 || len(tools) > 30 {
			rowHeight = 10.0
		}

		pdf.CellFormat(colWidths[0], rowHeight, strconv.Itoa(int(item.ID)), "1", 0, "C", false, 0, "")
		pdf.CellFormat(colWidths[1], rowHeight, location, "1", 0, "L", false, 0, "")
		pdf.CellFormat(colWidths[2], rowHeight, tools, "1", 0, "L", false, 0, "")
		pdf.CellFormat(colWidths[3], rowHeight, quantity, "1", 0, "C", false, 0, "")
		pdf.CellFormat(colWidths[4], rowHeight, notes, "1", 0, "L", false, 0, "")
		pdf.CellFormat(colWidths[5], rowHeight, photos, "1", 0, "C", false, 0, "")
		pdf.Ln(-1)
	}

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		if logger != nil {
			logger.Error("Failed to generate PDF", zap.Error(err))
		}
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	return &buf, nil
}

// ExportToolsAlkerToExcel exports tools alker items to Excel
func ExportToolsAlkerToExcel(items []sqlcdb.ListToolsAlkersForExportRow, logger *zap.Logger) (*bytes.Buffer, error) {
	f := excelize.NewFile()
	defer func() {
		if err := f.Close(); err != nil {
			if logger != nil {
				logger.Error("Failed to close Excel file", zap.Error(err))
			}
		}
	}()

	sheetName := "Tools Alker"
	f.NewSheet(sheetName)
	f.DeleteSheet("Sheet1")

	// Set header
	headers := []string{"ID", "Region", "Regency", "Cluster", "Tools Name", "Quantity", "Notes", "Photos Count", "Created At"}
	for i, header := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		f.SetCellValue(sheetName, cell, header)
		f.SetCellStyle(sheetName, cell, cell, getHeaderStyle(f))
	}

	// Set data
	for i, item := range items {
		row := i + 2
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), item.ID)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), string(item.Region))
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), item.Regency)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), item.Cluster)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), item.ToolsName)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), item.Quantity)
		notes := ""
		if item.Notes.Valid {
			notes = item.Notes.String
		}
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), notes)
		// Parse documentation JSONB
		var docs []string
		if len(item.Documentation) > 0 {
			json.Unmarshal(item.Documentation, &docs)
		}
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), len(docs))
		createdAt := ""
		if item.CreatedAt.Valid {
			createdAt = item.CreatedAt.Time.Format("2006-01-02 15:04:05")
		}
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), createdAt)
	}

	// Auto-fit columns
	for i := 0; i < len(headers); i++ {
		col := string(rune('A' + i))
		f.SetColWidth(sheetName, col, col, 15)
	}

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		if logger != nil {
			logger.Error("Failed to write Excel file", zap.Error(err))
		}
		return nil, fmt.Errorf("failed to write Excel file: %w", err)
	}

	return &buf, nil
}

// getHeaderStyle returns a style for Excel header cells
func getHeaderStyle(f *excelize.File) int {
	styleID, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Bold: true,
		},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"#E0E0E0"},
			Pattern: 1,
		},
		Alignment: &excelize.Alignment{
			Horizontal: "center",
			Vertical:   "center",
		},
	})
	return styleID
}

