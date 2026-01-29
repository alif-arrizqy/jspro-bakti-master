package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sparepart-management-services/internal/database"
	sqlcdb "sparepart-management-services/internal/database/sqlc"
	"sparepart-management-services/internal/utils"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/zap"
)

// ToolsAlkerResponse represents the nested response structure for tools alker
type ToolsAlkerResponse struct {
	ID            int32                   `json:"id"`
	LocationID    int32                    `json:"location_id"`
	ToolsID       int32                    `json:"tools_id"`
	Quantity      int32                    `json:"quantity"`
	Documentation []string                 `json:"documentation"`
	Notes         *string                  `json:"notes,omitempty"`
	CreatedAt     string                   `json:"created_at"`
	UpdatedAt     string                   `json:"updated_at"`
	Location      ToolsAlkerLocation       `json:"location"`
	Tools         ToolsAlkerTools          `json:"tools"`
}

type ToolsAlkerLocation struct {
	ID        int32  `json:"id"`
	Region    string `json:"region"`
	Regency   string `json:"regency"`
	Cluster   string `json:"cluster"`
	CreatedAt string `json:"created_at,omitempty"`
	UpdatedAt string `json:"updated_at,omitempty"`
}

type ToolsAlkerTools struct {
	ID        int32  `json:"id"`
	Name      string `json:"name"`
	ItemType  string `json:"item_type"`
	CreatedAt string `json:"created_at,omitempty"`
	UpdatedAt string `json:"updated_at,omitempty"`
}

// ToolsAlkerGroupedResponse represents the grouped response structure (grouped by location)
type ToolsAlkerGroupedResponse struct {
	ID         int32                      `json:"id"`          // location_id
	LocationID int32                      `json:"location_id"` // location_id
	Location   ToolsAlkerLocation         `json:"location"`
	Tools      []ToolsAlkerGroupedItem    `json:"tools"`
	CreatedAt  string                     `json:"created_at"`  // from first tools item
	UpdatedAt  string                     `json:"updated_at"`  // from first tools item
}

// ToolsAlkerGroupedItem represents a tools item in the grouped response
type ToolsAlkerGroupedItem struct {
	ID            int32    `json:"id"`            // tools_id
	Name          string   `json:"name"`
	ItemType      string   `json:"item_type"`
	Quantity      int32    `json:"quantity"`
	Documentation []string `json:"documentation"`
	Notes         *string  `json:"notes,omitempty"`
}

// transformToolsAlker transforms ListToolsAlkersRow to nested response
func transformToolsAlker(row sqlcdb.ListToolsAlkersRow) ToolsAlkerResponse {
	createdAt := ""
	if row.CreatedAt.Valid {
		createdAt = row.CreatedAt.Time.Format(time.RFC3339)
	}
	updatedAt := ""
	if row.UpdatedAt.Valid {
		updatedAt = row.UpdatedAt.Time.Format(time.RFC3339)
	}
	locationCreatedAt := ""
	if row.LocationCreatedAt.Valid {
		locationCreatedAt = row.LocationCreatedAt.Time.Format(time.RFC3339)
	}
	locationUpdatedAt := ""
	if row.LocationUpdatedAt.Valid {
		locationUpdatedAt = row.LocationUpdatedAt.Time.Format(time.RFC3339)
	}
	toolsCreatedAt := ""
	if row.ToolsCreatedAt.Valid {
		toolsCreatedAt = row.ToolsCreatedAt.Time.Format(time.RFC3339)
	}
	toolsUpdatedAt := ""
	if row.ToolsUpdatedAt.Valid {
		toolsUpdatedAt = row.ToolsUpdatedAt.Time.Format(time.RFC3339)
	}

	var notes *string
	if row.Notes.Valid {
		notes = &row.Notes.String
	}

	// Parse documentation JSONB
	var docs []string
	if len(row.Documentation) > 0 {
		json.Unmarshal(row.Documentation, &docs)
	}

	return ToolsAlkerResponse{
		ID:            row.ID,
		LocationID:    row.LocationID,
		ToolsID:       row.ToolsID,
		Quantity:      row.Quantity,
		Documentation: docs,
		Notes:         notes,
		CreatedAt:     createdAt,
		UpdatedAt:     updatedAt,
		Location: ToolsAlkerLocation{
			ID:        row.LocationID2,
			Region:    string(row.Region),
			Regency:   row.Regency,
			Cluster:   row.Cluster,
			CreatedAt: locationCreatedAt,
			UpdatedAt: locationUpdatedAt,
		},
		Tools: ToolsAlkerTools{
			ID:        row.ToolsID2,
			Name:      row.ToolsName,
			ItemType:  string(row.ItemType),
			CreatedAt: toolsCreatedAt,
			UpdatedAt: toolsUpdatedAt,
		},
	}
}

// transformToolsAlkerFromGet transforms GetToolsAlkerRow to nested response
func transformToolsAlkerFromGet(row sqlcdb.GetToolsAlkerRow) ToolsAlkerResponse {
	createdAt := ""
	if row.CreatedAt.Valid {
		createdAt = row.CreatedAt.Time.Format(time.RFC3339)
	}
	updatedAt := ""
	if row.UpdatedAt.Valid {
		updatedAt = row.UpdatedAt.Time.Format(time.RFC3339)
	}
	locationCreatedAt := ""
	if row.LocationCreatedAt.Valid {
		locationCreatedAt = row.LocationCreatedAt.Time.Format(time.RFC3339)
	}
	locationUpdatedAt := ""
	if row.LocationUpdatedAt.Valid {
		locationUpdatedAt = row.LocationUpdatedAt.Time.Format(time.RFC3339)
	}
	toolsCreatedAt := ""
	if row.ToolsCreatedAt.Valid {
		toolsCreatedAt = row.ToolsCreatedAt.Time.Format(time.RFC3339)
	}
	toolsUpdatedAt := ""
	if row.ToolsUpdatedAt.Valid {
		toolsUpdatedAt = row.ToolsUpdatedAt.Time.Format(time.RFC3339)
	}

	var notes *string
	if row.Notes.Valid {
		notes = &row.Notes.String
	}

	// Parse documentation JSONB
	var docs []string
	if len(row.Documentation) > 0 {
		json.Unmarshal(row.Documentation, &docs)
	}

	return ToolsAlkerResponse{
		ID:            row.ID,
		LocationID:    row.LocationID,
		ToolsID:       row.ToolsID,
		Quantity:      row.Quantity,
		Documentation: docs,
		Notes:         notes,
		CreatedAt:     createdAt,
		UpdatedAt:     updatedAt,
		Location: ToolsAlkerLocation{
			ID:        row.LocationID2,
			Region:    string(row.Region),
			Regency:   row.Regency,
			Cluster:   row.Cluster,
			CreatedAt: locationCreatedAt,
			UpdatedAt: locationUpdatedAt,
		},
		Tools: ToolsAlkerTools{
			ID:        row.ToolsID2,
			Name:      row.ToolsName,
			ItemType:  string(row.ItemType),
			CreatedAt: toolsCreatedAt,
			UpdatedAt: toolsUpdatedAt,
		},
	}
}

// groupToolsAlkersByLocation groups flat list of tools alker items by location_id
func groupToolsAlkersByLocation(items []sqlcdb.ListToolsAlkersRow) []ToolsAlkerGroupedResponse {
	// Map to store grouped data: location_id -> grouped response
	locationMap := make(map[int32]*ToolsAlkerGroupedResponse)

	for _, item := range items {
		locationID := item.LocationID

		// Get or create grouped response for this location
		grouped, exists := locationMap[locationID]
		if !exists {
			locationCreatedAt := ""
			if item.LocationCreatedAt.Valid {
				locationCreatedAt = item.LocationCreatedAt.Time.Format(time.RFC3339)
			}
			locationUpdatedAt := ""
			if item.LocationUpdatedAt.Valid {
				locationUpdatedAt = item.LocationUpdatedAt.Time.Format(time.RFC3339)
			}

			createdAt := ""
			if item.CreatedAt.Valid {
				createdAt = item.CreatedAt.Time.Format(time.RFC3339)
			}
			updatedAt := ""
			if item.UpdatedAt.Valid {
				updatedAt = item.UpdatedAt.Time.Format(time.RFC3339)
			}

			grouped = &ToolsAlkerGroupedResponse{
				ID:         locationID,
				LocationID: locationID,
				Location: ToolsAlkerLocation{
					ID:        item.LocationID2,
					Region:    string(item.Region),
					Regency:   item.Regency,
					Cluster:   item.Cluster,
					CreatedAt: locationCreatedAt,
					UpdatedAt: locationUpdatedAt,
				},
				Tools:     []ToolsAlkerGroupedItem{},
				CreatedAt: createdAt,
				UpdatedAt: updatedAt,
			}
			locationMap[locationID] = grouped
		}

		// Add tools item to the array
		var notes *string
		if item.Notes.Valid {
			notes = &item.Notes.String
		}

		// Parse documentation JSONB
		var docs []string
		if len(item.Documentation) > 0 {
			json.Unmarshal(item.Documentation, &docs)
		}

		toolsItem := ToolsAlkerGroupedItem{
			ID:            item.ToolsID2,
			Name:          item.ToolsName,
			ItemType:      string(item.ItemType),
			Quantity:      item.Quantity,
			Documentation: docs,
			Notes:         notes,
		}

		grouped.Tools = append(grouped.Tools, toolsItem)
	}

	// Convert map to slice
	result := make([]ToolsAlkerGroupedResponse, 0, len(locationMap))
	for _, grouped := range locationMap {
		result = append(result, *grouped)
	}

	return result
}

// getGroupedToolsAlkerByLocationID gets all tools alker items for a location and returns grouped response
func (h *ToolsAlkerHandler) getGroupedToolsAlkerByLocationID(ctx context.Context, locationID int32) (*ToolsAlkerGroupedResponse, error) {
	// Get all tools alker items for this location (no filters)
	listParams := sqlcdb.ListToolsAlkersParams{
		Column1: "",
		Column2: "",
		Column3: "",
		Column4: "",
		Limit:   10000,
		Offset:  0,
	}
	allItems, err := h.queries.ListToolsAlkers(ctx, listParams)
	if err != nil {
		return nil, err
	}

	// Filter items by location_id
	var locationItems []sqlcdb.ListToolsAlkersRow
	for _, toolsItem := range allItems {
		if toolsItem.LocationID == locationID {
			locationItems = append(locationItems, toolsItem)
		}
	}

	// Group by location_id
	groupedItems := groupToolsAlkersByLocation(locationItems)
	if len(groupedItems) == 0 {
		return nil, fmt.Errorf("no tools alker items found for location_id %d", locationID)
	}

	return &groupedItems[0], nil
}

type CreateToolsAlkerRequest struct {
	LocationID uint    `json:"location_id" binding:"required"`
	ToolsID    uint    `json:"tools_id" binding:"required"`
	Quantity   int     `json:"quantity"`
	Notes      *string `json:"notes,omitempty"`
}

type ToolsAlkerHandler struct {
	logger  *zap.Logger
	queries *sqlcdb.Queries
}

func NewToolsAlkerHandler() *ToolsAlkerHandler {
	return &ToolsAlkerHandler{
		logger:  utils.GetLogger(),
		queries: sqlcdb.New(database.GetDB()),
	}
}

// buildToolsAlkerParams builds filter parameters from query string
func (h *ToolsAlkerHandler) buildToolsAlkerParams(c *gin.Context) sqlcdb.CountToolsAlkersParams {
	var region, regency, cluster, sparepartName string

	if r := c.Query("region"); r != "" {
		region = r
	}
	if r := c.Query("regency"); r != "" {
		regency = r
	}
	if r := c.Query("cluster"); r != "" {
		cluster = r
	}
	if sn := c.Query("sparepart_name"); sn != "" {
		// For sparepart_name, we use the first name (sqlc query handles ILIKE)
		names := strings.Split(sn, ",")
		if len(names) > 0 {
			sparepartName = strings.TrimSpace(names[0])
		}
	}

	return sqlcdb.CountToolsAlkersParams{
		Column1: region,
		Column2: regency,
		Column3: cluster,
		Column4: sparepartName,
	}
}

// @Summary Get all tools alker items
// @Description Get all tools alker items with optional filters
// @Tags Tools Alker
// @Accept json
// @Produce json
// @Param sparepart_name query string false "Filter by sparepart name (comma-separated, partial match, case-insensitive)"
// @Param region query string false "Filter by region (exact match)"
// @Param regency query string false "Filter by regency (partial match, case-insensitive)"
// @Param cluster query string false "Filter by cluster (partial match, case-insensitive)"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Success 200 {object} utils.PaginatedResponse
// @Router /sparepart/tools-alker [get]
func (h *ToolsAlkerHandler) GetAll(c *gin.Context) {
	ctx := c.Request.Context()

	// Get filter parameters
	filterParams := h.buildToolsAlkerParams(c)

	// Get pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	// Count total (count distinct locations)
	total, err := h.queries.CountToolsAlkers(ctx, filterParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to count tools alker items", h.logger)
		return
	}

	// List items - get all items (no limit/offset here, we'll group and paginate after)
	listParams := sqlcdb.ListToolsAlkersParams{
		Column1: filterParams.Column1,
		Column2: filterParams.Column2,
		Column3: filterParams.Column3,
		Column4: filterParams.Column4,
		Limit:   10000, // Large limit to get all items for grouping
		Offset:  0,
	}
	items, err := h.queries.ListToolsAlkers(ctx, listParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to get tools alker items", h.logger)
		return
	}

	// Group by location_id
	groupedItems := groupToolsAlkersByLocation(items)

	// Apply pagination to grouped items (per location)
	startIdx := (page - 1) * limit
	endIdx := startIdx + limit
	if startIdx > len(groupedItems) {
		startIdx = len(groupedItems)
	}
	if endIdx > len(groupedItems) {
		endIdx = len(groupedItems)
	}

	var paginatedItems []ToolsAlkerGroupedResponse
	if startIdx < len(groupedItems) {
		paginatedItems = groupedItems[startIdx:endIdx]
	}

	utils.SuccessWithPagination(c, "Tools alker items retrieved successfully", paginatedItems, page, limit, total)
}

// @Summary Get tools alker item by ID (returns grouped by location)
// @Description Get all tools alker items for the location of the given tools alker item ID, grouped by location
// @Tags Tools Alker
// @Accept json
// @Produce json
// @Param id path int true "Tools Alker Item ID"
// @Success 200 {object} utils.Response
// @Router /sparepart/tools-alker/{id} [get]
func (h *ToolsAlkerHandler) GetByID(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid tools alker item ID")
		return
	}

	// Get the tools alker item to find its location_id
	item, err := h.queries.GetToolsAlker(ctx, int32(id))
	if err != nil {
		utils.NotFound(c, "Tools alker item not found")
		return
	}

	// Get all tools alker items for this location
	listParams := sqlcdb.ListToolsAlkersParams{
		Column1: "",
		Column2: "",
		Column3: "",
		Column4: "",
		Limit:   10000,
		Offset:  0,
	}
	allItems, err := h.queries.ListToolsAlkers(ctx, listParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to get tools alker items", h.logger)
		return
	}

	// Filter items by location_id
	var locationItems []sqlcdb.ListToolsAlkersRow
	for _, toolsItem := range allItems {
		if toolsItem.LocationID == item.LocationID {
			locationItems = append(locationItems, toolsItem)
		}
	}

	// Group by location_id (should be only one location)
	groupedItems := groupToolsAlkersByLocation(locationItems)
	if len(groupedItems) == 0 {
		utils.NotFound(c, "Location not found")
		return
	}

	// Return the first (and only) grouped item
	utils.Success(c, "Tools alker items retrieved successfully", groupedItems[0])
}

// @Summary Create tools alker item with photos
// @Description Create a new tools alker item with optional photo uploads
// @Tags Tools Alker
// @Accept multipart/form-data
// @Produce json
// @Param location_id formData int true "Location ID"
// @Param tools_id formData int true "Tools ID"
// @Param quantity formData int false "Quantity"
// @Param notes formData string false "Notes"
// @Param photos formData file false "Photo files (multiple allowed)"
// @Success 201 {object} utils.Response
// @Router /sparepart/tools-alker [post]
func (h *ToolsAlkerHandler) Create(c *gin.Context) {
	var req CreateToolsAlkerRequest

	// Parse form data
	locationIDStr := c.PostForm("location_id")
	toolsIDStr := c.PostForm("tools_id")
	quantityStr := c.PostForm("quantity")
	notes := c.PostForm("notes")

	// Parse location_id
	locationID, err := strconv.ParseUint(locationIDStr, 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid location_id")
		return
	}
	req.LocationID = uint(locationID)

	// Parse tools_id
	toolsID, err := strconv.ParseUint(toolsIDStr, 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid tools_id")
		return
	}
	req.ToolsID = uint(toolsID)

	// Parse quantity
	if quantityStr != "" {
		quantity, err := strconv.Atoi(quantityStr)
		if err == nil {
			req.Quantity = quantity
		}
	}

	// Parse notes
	if notes != "" {
		req.Notes = &notes
	}

	ctx := c.Request.Context()

	// Process file uploads
	var documentation []string
	form, err := c.MultipartForm()
	if err == nil && form.File != nil {
		files := form.File["photos"]
		subDir := "tools_alker"
		prefix := "tools_alker"
		for _, file := range files {
			path, err := utils.ProcessImageUpload(file, subDir, prefix, h.logger)
			if err != nil {
				utils.BadRequest(c, "Failed to upload photo: "+err.Error())
				return
			}
			documentation = append(documentation, path)
		}
	}

	// Convert notes to pgtype.Text
	var notesText pgtype.Text
	if req.Notes != nil {
		notesText.String = *req.Notes
		notesText.Valid = true
	}

	// Create tools alker item
	createParams := sqlcdb.CreateToolsAlkerParams{
		LocationID:    int32(req.LocationID),
		ToolsID:       int32(req.ToolsID),
		Quantity:      int32(req.Quantity),
		Documentation: documentationToBytes(documentation),
		Notes:         notesText,
	}

	item, err := h.queries.CreateToolsAlker(ctx, createParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to create tools alker item", h.logger)
		return
	}

	// Get full item with relations
	// Get grouped response for this location
	groupedResponse, err := h.getGroupedToolsAlkerByLocationID(ctx, item.LocationID)
	if err != nil {
		utils.HandleError(c, err, "Failed to retrieve grouped tools alker items", h.logger)
		return
	}

	c.JSON(http.StatusCreated, utils.Response{
		Success: true,
		Message: "Tools alker item created successfully",
		Data:    groupedResponse,
	})
}

// @Summary Update tools alker item
// @Description Update an existing tools alker item
// @Tags Tools Alker
// @Accept json
// @Produce json
// @Param id path int true "Tools Alker Item ID"
// @Param item body CreateToolsAlkerRequest true "Update data"
// @Success 200 {object} utils.Response
// @Router /sparepart/tools-alker/{id} [put]
func (h *ToolsAlkerHandler) Update(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid tools alker item ID")
		return
	}

	// Check if item exists
	_, err = h.queries.GetToolsAlker(ctx, int32(id))
	if err != nil {
		utils.NotFound(c, "Tools alker item not found")
		return
	}

	var req CreateToolsAlkerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	// Convert notes to pgtype.Text
	var notes pgtype.Text
	if req.Notes != nil {
		notes.String = *req.Notes
		notes.Valid = true
	}

	updateParams := sqlcdb.UpdateToolsAlkerParams{
		ID:       int32(id),
		Quantity: int32(req.Quantity),
		Notes:    notes,
	}

	item, err := h.queries.UpdateToolsAlker(ctx, updateParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to update tools alker item", h.logger)
		return
	}

	// Get full item with relations
	// Get grouped response for this location
	groupedResponse, err := h.getGroupedToolsAlkerByLocationID(ctx, item.LocationID)
	if err != nil {
		utils.HandleError(c, err, "Failed to retrieve grouped tools alker items", h.logger)
		return
	}

	utils.Success(c, "Tools alker item updated successfully", groupedResponse)
}

// @Summary Delete tools alker item
// @Description Delete a tools alker item
// @Tags Tools Alker
// @Accept json
// @Produce json
// @Param id path int true "Tools Alker Item ID"
// @Success 200 {object} utils.Response
// @Router /sparepart/tools-alker/{id} [delete]
func (h *ToolsAlkerHandler) Delete(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid tools alker item ID")
		return
	}

	// Get item to delete photos
	item, err := h.queries.GetToolsAlker(ctx, int32(id))
	if err != nil {
		utils.NotFound(c, "Tools alker item not found")
		return
	}

	// Delete all photos from storage
	docs := documentationFromBytes(item.Documentation)
	for _, path := range docs {
		if err := utils.DeleteFile(path, h.logger); err != nil {
			h.logger.Warn("Failed to delete file", zap.Error(err), zap.String("path", path))
		}
	}

	// Delete item
	err = h.queries.DeleteToolsAlker(ctx, int32(id))
	if err != nil {
		utils.HandleError(c, err, "Failed to delete tools alker item", h.logger)
		return
	}

	utils.Success(c, "Tools alker item deleted successfully", nil)
}

// @Summary Export tools alker to PDF
// @Description Export tools alker items to PDF with filters (landscape mode)
// @Tags Tools Alker
// @Accept json
// @Produce application/pdf
// @Param sparepart_name query string false "Filter by sparepart name (comma-separated)"
// @Param region query string false "Filter by region"
// @Param regency query string false "Filter by regency"
// @Param cluster query string false "Filter by cluster"
// @Success 200 {file} application/pdf
// @Router /sparepart/tools-alker/export/pdf [get]
func (h *ToolsAlkerHandler) ExportPDF(c *gin.Context) {
	ctx := c.Request.Context()

	// Get filter parameters
	filterParams := h.buildToolsAlkerParams(c)

	// List items for export (no pagination)
	exportParams := sqlcdb.ListToolsAlkersForExportParams{
		Column1: filterParams.Column1,
		Column2: filterParams.Column2,
		Column3: filterParams.Column3,
		Column4: filterParams.Column4,
	}

	items, err := h.queries.ListToolsAlkersForExport(ctx, exportParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to get tools alker items", h.logger)
		return
	}

	buf, err := utils.ExportToolsAlkerToPDF(items, h.logger)
	if err != nil {
		utils.HandleError(c, err, "Failed to generate PDF", h.logger)
		return
	}

	filename := fmt.Sprintf("tools_alker_%s.pdf", time.Now().Format("20060102_150405"))
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("Content-Type", "application/pdf")
	c.Data(http.StatusOK, "application/pdf", buf.Bytes())
}

// @Summary Export tools alker to Excel
// @Description Export tools alker items to Excel with filters
// @Tags Tools Alker
// @Accept json
// @Produce application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
// @Param sparepart_name query string false "Filter by sparepart name (comma-separated)"
// @Param region query string false "Filter by region"
// @Param regency query string false "Filter by regency"
// @Param cluster query string false "Filter by cluster"
// @Success 200 {file} application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
// @Router /sparepart/tools-alker/export/excel [get]
func (h *ToolsAlkerHandler) ExportExcel(c *gin.Context) {
	ctx := c.Request.Context()

	// Get filter parameters
	filterParams := h.buildToolsAlkerParams(c)

	// List items for export (no pagination)
	exportParams := sqlcdb.ListToolsAlkersForExportParams{
		Column1: filterParams.Column1,
		Column2: filterParams.Column2,
		Column3: filterParams.Column3,
		Column4: filterParams.Column4,
	}

	items, err := h.queries.ListToolsAlkersForExport(ctx, exportParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to get tools alker items", h.logger)
		return
	}

	buf, err := utils.ExportToolsAlkerToExcel(items, h.logger)
	if err != nil {
		utils.HandleError(c, err, "Failed to generate Excel", h.logger)
		return
	}

	filename := fmt.Sprintf("tools_alker_%s.xlsx", time.Now().Format("20060102_150405"))
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}

// @Summary Update photo in tools alker item
// @Description Delete old photo and upload new photo (replace by index)
// @Tags Tools Alker
// @Accept multipart/form-data
// @Produce json
// @Param id path int true "Tools Alker Item ID"
// @Param photo_index path int true "Photo index in documentation array"
// @Param photo formData file true "New photo file"
// @Success 200 {object} utils.Response
// @Router /sparepart/tools-alker/{id}/photos/{photo_index} [put]
func (h *ToolsAlkerHandler) UpdatePhoto(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid tools alker item ID")
		return
	}

	photoIndex, err := strconv.Atoi(c.Param("photo_index"))
	if err != nil {
		utils.BadRequest(c, "Invalid photo index")
		return
	}

	// Get existing item
	item, err := h.queries.GetToolsAlker(ctx, int32(id))
	if err != nil {
		utils.NotFound(c, "Tools alker item not found")
		return
	}

	// Get existing documentation
	docs := documentationFromBytes(item.Documentation)
	if photoIndex < 0 || photoIndex >= len(docs) {
		utils.BadRequest(c, "Photo index out of range")
		return
	}

	// Delete old photo file
	oldFilePath := docs[photoIndex]
	if err := utils.DeleteFile(oldFilePath, h.logger); err != nil {
		h.logger.Warn("Failed to delete old file", zap.Error(err), zap.String("path", oldFilePath))
	}

	// Get new photo from form
	file, err := c.FormFile("photo")
	if err != nil {
		utils.BadRequest(c, "No photo provided or failed to parse form")
		return
	}

	// Upload new photo
	subDir := "tools_alker"
	prefix := "tools_alker"
	newPath, err := utils.ProcessImageUpload(file, subDir, prefix, h.logger)
	if err != nil {
		utils.BadRequest(c, "Failed to upload photo: "+err.Error())
		return
	}

	// Update documentation array
	docs[photoIndex] = newPath

	// Update documentation
	updateParams := sqlcdb.UpdateToolsAlkerDocumentationParams{
		ID:            int32(id),
		Documentation: documentationToBytes(docs),
	}

	_, err = h.queries.UpdateToolsAlkerDocumentation(ctx, updateParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to update photo", h.logger)
		return
	}

	// Get the item to find its location_id (item already declared above, use = instead of :=)
	item, err = h.queries.GetToolsAlker(ctx, int32(id))
	if err != nil {
		utils.HandleError(c, err, "Failed to retrieve item", h.logger)
		return
	}

	// Get grouped response for this location
	groupedResponse, err := h.getGroupedToolsAlkerByLocationID(ctx, item.LocationID)
	if err != nil {
		utils.HandleError(c, err, "Failed to retrieve grouped tools alker items", h.logger)
		return
	}

	utils.Success(c, "Photo updated successfully", groupedResponse)
}

