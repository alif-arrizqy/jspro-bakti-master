package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sparepart-management-services/internal/database"
	sqlcdb "sparepart-management-services/internal/database/sqlc"
	"sparepart-management-services/internal/models"
	"sparepart-management-services/internal/utils"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/zap"
)

type CreateSparepartStockRequest struct {
	LocationID  uint             `json:"location_id" binding:"required"`
	SparepartID uint             `json:"sparepart_id" binding:"required"`
	StockType   models.StockType `json:"stock_type" binding:"required"`
	Quantity    int              `json:"quantity"`
	Notes       *string          `json:"notes,omitempty"`
}

// Helper function to convert []string to []byte (JSONB)
func documentationToBytes(docs []string) []byte {
	if len(docs) == 0 {
		return []byte("[]")
	}
	data, _ := json.Marshal(docs)
	return data
}

// Helper function to convert []byte (JSONB) to []string
func documentationFromBytes(data []byte) []string {
	if len(data) == 0 {
		return []string{}
	}
	var docs []string
	json.Unmarshal(data, &docs)
	return docs
}

// SparepartStockResponse represents the nested response structure for sparepart stock
type SparepartStockResponse struct {
	ID            int32                   `json:"id"`
	LocationID    int32                   `json:"location_id"`
	SparepartID   int32                   `json:"sparepart_id"`
	StockType     string                  `json:"stock_type"`
	Quantity      int32                   `json:"quantity"`
	Documentation []string                `json:"documentation"`
	Notes         *string                 `json:"notes,omitempty"`
	CreatedAt     string                  `json:"created_at"`
	UpdatedAt     string                  `json:"updated_at"`
	Location      SparepartStockLocation  `json:"location"`
	Sparepart     SparepartStockSparepart `json:"sparepart"`
}

type SparepartStockLocation struct {
	ID        int32  `json:"id"`
	Region    string `json:"region"`
	Regency   string `json:"regency"`
	Cluster   string `json:"cluster"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type SparepartStockSparepart struct {
	ID        int32  `json:"id"`
	Name      string `json:"name"`
	ItemType  string `json:"item_type"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// SparepartStockGroupedResponse represents the grouped response structure (grouped by location)
type SparepartStockGroupedResponse struct {
	ID         int32                       `json:"id"`          // location_id
	LocationID int32                       `json:"location_id"` // location_id
	Location   SparepartStockLocation      `json:"location"`
	Sparepart  []SparepartStockGroupedItem `json:"sparepart"`
	CreatedAt  string                      `json:"created_at"` // from first stock item
	UpdatedAt  string                      `json:"updated_at"` // from first stock item
}

// SparepartStockGroupedItem represents a sparepart item in the grouped response
type SparepartStockGroupedItem struct {
	ID            int32    `json:"id"`       // sparepart_id
	StockID       int32    `json:"stock_id"` // stock item id (PK)
	Name          string   `json:"name"`
	ItemType      string   `json:"item_type"`
	StockType     string   `json:"stock_type"`
	Quantity      int32    `json:"quantity"`
	Documentation []string `json:"documentation"`
	Notes         *string  `json:"notes,omitempty"`
}

// transformSparepartStock transforms sqlc flat structure to nested response
func transformSparepartStock(row sqlcdb.ListSparepartStocksRow) SparepartStockResponse {
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
	sparepartCreatedAt := ""
	if row.SparepartCreatedAt.Valid {
		sparepartCreatedAt = row.SparepartCreatedAt.Time.Format(time.RFC3339)
	}
	sparepartUpdatedAt := ""
	if row.SparepartUpdatedAt.Valid {
		sparepartUpdatedAt = row.SparepartUpdatedAt.Time.Format(time.RFC3339)
	}

	var notes *string
	if row.Notes.Valid {
		notes = &row.Notes.String
	}

	return SparepartStockResponse{
		ID:            row.ID,
		LocationID:    row.LocationID,
		SparepartID:   row.SparepartID,
		StockType:     string(row.StockType),
		Quantity:      row.Quantity,
		Documentation: documentationFromBytes(row.Documentation),
		Notes:         notes,
		CreatedAt:     createdAt,
		UpdatedAt:     updatedAt,
		Location: SparepartStockLocation{
			ID:        row.LocationID2,
			Region:    string(row.Region),
			Regency:   row.Regency,
			Cluster:   row.Cluster,
			CreatedAt: locationCreatedAt,
			UpdatedAt: locationUpdatedAt,
		},
		Sparepart: SparepartStockSparepart{
			ID:        row.SparepartID2,
			Name:      row.SparepartName,
			ItemType:  string(row.ItemType),
			CreatedAt: sparepartCreatedAt,
			UpdatedAt: sparepartUpdatedAt,
		},
	}
}

// transformSparepartStockFromGet transforms GetSparepartStockRow to nested response
func transformSparepartStockFromGet(row sqlcdb.GetSparepartStockRow) SparepartStockResponse {
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
	sparepartCreatedAt := ""
	if row.SparepartCreatedAt.Valid {
		sparepartCreatedAt = row.SparepartCreatedAt.Time.Format(time.RFC3339)
	}
	sparepartUpdatedAt := ""
	if row.SparepartUpdatedAt.Valid {
		sparepartUpdatedAt = row.SparepartUpdatedAt.Time.Format(time.RFC3339)
	}

	var notes *string
	if row.Notes.Valid {
		notes = &row.Notes.String
	}

	return SparepartStockResponse{
		ID:            row.ID,
		LocationID:    row.LocationID,
		SparepartID:   row.SparepartID,
		StockType:     string(row.StockType),
		Quantity:      row.Quantity,
		Documentation: documentationFromBytes(row.Documentation),
		Notes:         notes,
		CreatedAt:     createdAt,
		UpdatedAt:     updatedAt,
		Location: SparepartStockLocation{
			ID:        row.LocationID2,
			Region:    string(row.Region),
			Regency:   row.Regency,
			Cluster:   row.Cluster,
			CreatedAt: locationCreatedAt,
			UpdatedAt: locationUpdatedAt,
		},
		Sparepart: SparepartStockSparepart{
			ID:        row.SparepartID2,
			Name:      row.SparepartName,
			ItemType:  string(row.ItemType),
			CreatedAt: sparepartCreatedAt,
			UpdatedAt: sparepartUpdatedAt,
		},
	}
}

// groupSparepartStocksByLocation groups flat list of stock items by location_id
func groupSparepartStocksByLocation(items []sqlcdb.ListSparepartStocksRow) []SparepartStockGroupedResponse {
	// Map to store grouped data: location_id -> grouped response
	locationMap := make(map[int32]*SparepartStockGroupedResponse)

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

			grouped = &SparepartStockGroupedResponse{
				ID:         locationID,
				LocationID: locationID,
				Location: SparepartStockLocation{
					ID:        item.LocationID2,
					Region:    string(item.Region),
					Regency:   item.Regency,
					Cluster:   item.Cluster,
					CreatedAt: locationCreatedAt,
					UpdatedAt: locationUpdatedAt,
				},
				Sparepart: []SparepartStockGroupedItem{},
				CreatedAt: createdAt,
				UpdatedAt: updatedAt,
			}
			locationMap[locationID] = grouped
		}

		// Add sparepart item to the array
		var notes *string
		if item.Notes.Valid {
			notes = &item.Notes.String
		}

		sparepartItem := SparepartStockGroupedItem{
			ID:            item.SparepartID2,
			StockID:       item.ID, // Include StockID
			Name:          item.SparepartName,
			ItemType:      string(item.ItemType),
			StockType:     string(item.StockType),
			Quantity:      item.Quantity,
			Documentation: documentationFromBytes(item.Documentation),
			Notes:         notes,
		}

		grouped.Sparepart = append(grouped.Sparepart, sparepartItem)
	}

	// Convert map to slice
	result := make([]SparepartStockGroupedResponse, 0, len(locationMap))
	for _, grouped := range locationMap {
		result = append(result, *grouped)
	}

	return result
}

// getGroupedSparepartStockByLocationID gets all stock items for a location and returns grouped response
func (h *SparepartStockHandler) getGroupedSparepartStockByLocationID(ctx context.Context, locationID int32) (*SparepartStockGroupedResponse, error) {
	// Get all stock items for this location (no filters)
	listParams := sqlcdb.ListSparepartStocksParams{
		Column1: "",
		Column2: "",
		Column3: "",
		Column4: "",
		Column5: "",
		Limit:   10000,
		Offset:  0,
	}
	allItems, err := h.queries.ListSparepartStocks(ctx, listParams)
	if err != nil {
		return nil, err
	}

	// Filter items by location_id
	var locationItems []sqlcdb.ListSparepartStocksRow
	for _, stockItem := range allItems {
		if stockItem.LocationID == locationID {
			locationItems = append(locationItems, stockItem)
		}
	}

	// Group by location_id
	groupedItems := groupSparepartStocksByLocation(locationItems)
	if len(groupedItems) == 0 {
		return nil, fmt.Errorf("no stock items found for location_id %d", locationID)
	}

	return &groupedItems[0], nil
}

type UpdateSparepartStockRequest struct {
	Quantity int     `json:"quantity"`
	Notes    *string `json:"notes,omitempty"`
}

type SparepartStockHandler struct {
	logger  *zap.Logger
	queries *sqlcdb.Queries
}

func NewSparepartStockHandler() *SparepartStockHandler {
	return &SparepartStockHandler{
		logger:  utils.GetLogger(),
		queries: sqlcdb.New(database.GetDB()),
	}
}

// buildSparepartStockParams builds filter parameters from query string
func (h *SparepartStockHandler) buildSparepartStockParams(c *gin.Context) sqlcdb.CountSparepartStocksParams {
	var region, regency, cluster, stockType, sparepartName string

	if r := c.Query("region"); r != "" {
		region = r
	}
	if r := c.Query("regency"); r != "" {
		regency = r
	}
	if r := c.Query("cluster"); r != "" {
		cluster = r
	}
	if st := c.Query("stock_type"); st != "" {
		stockType = st
	}
	if sn := c.Query("sparepart_name"); sn != "" {
		// For sparepart_name, we use the first name (sqlc query handles ILIKE)
		names := strings.Split(sn, ",")
		if len(names) > 0 {
			sparepartName = strings.TrimSpace(names[0])
		}
	}

	return sqlcdb.CountSparepartStocksParams{
		Column1: region,
		Column2: regency,
		Column3: cluster,
		Column4: stockType,
		Column5: sparepartName,
	}
}

// @Summary Get all sparepart stock items
// @Description Get all sparepart stock items with optional filters
// @Tags Sparepart Stock
// @Accept json
// @Produce json
// @Param sparepart_name query string false "Filter by sparepart name (comma-separated, partial match, case-insensitive)"
// @Param region query string false "Filter by region (exact match)"
// @Param regency query string false "Filter by regency (partial match, case-insensitive)"
// @Param cluster query string false "Filter by cluster (partial match, case-insensitive)"
// @Param stock_type query string false "Filter by stock type (NEW_STOCK, USED_STOCK)"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Success 200 {object} utils.PaginatedResponse
// @Router /sparepart/stock [get]
func (h *SparepartStockHandler) GetAll(c *gin.Context) {
	ctx := c.Request.Context()

	// Get filter parameters
	filterParams := h.buildSparepartStockParams(c)

	// Get pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	// Count total (count distinct locations)
	total, err := h.queries.CountSparepartStocks(ctx, filterParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to count sparepart stock items", h.logger)
		return
	}

	// List items - get all items (no limit/offset here, we'll group and paginate after)
	// We need to fetch more items to ensure we have enough for grouping
	listParams := sqlcdb.ListSparepartStocksParams{
		Column1: filterParams.Column1,
		Column2: filterParams.Column2,
		Column3: filterParams.Column3,
		Column4: filterParams.Column4,
		Column5: filterParams.Column5,
		Limit:   10000, // Large limit to get all items for grouping
		Offset:  0,
	}
	items, err := h.queries.ListSparepartStocks(ctx, listParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to get sparepart stock items", h.logger)
		return
	}

	// Group by location_id
	groupedItems := groupSparepartStocksByLocation(items)

	// Apply pagination to grouped items (per location)
	startIdx := (page - 1) * limit
	endIdx := startIdx + limit
	if startIdx > len(groupedItems) {
		startIdx = len(groupedItems)
	}
	if endIdx > len(groupedItems) {
		endIdx = len(groupedItems)
	}

	var paginatedItems []SparepartStockGroupedResponse
	if startIdx < len(groupedItems) {
		paginatedItems = groupedItems[startIdx:endIdx]
	}

	utils.SuccessWithPagination(c, "Sparepart stock items retrieved successfully", paginatedItems, page, limit, total)
}

// @Summary Get sparepart stock item by ID (returns grouped by location)
// @Description Get all sparepart stock items for the location of the given stock item ID, grouped by location
// @Tags Sparepart Stock
// @Accept json
// @Produce json
// @Param id path int true "Sparepart Stock Item ID"
// @Success 200 {object} utils.Response
// @Router /sparepart/stock/{id} [get]
func (h *SparepartStockHandler) GetByID(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid sparepart stock item ID")
		return
	}

	// Get the stock item to find its location_id
	item, err := h.queries.GetSparepartStock(ctx, int32(id))
	if err != nil {
		utils.NotFound(c, "Sparepart stock item not found")
		return
	}

	// Get all stock items for this location
	listParams := sqlcdb.ListSparepartStocksParams{
		Column1: "", // No filters, just get all for this location
		Column2: "",
		Column3: "",
		Column4: "",
		Column5: "",
		Limit:   10000,
		Offset:  0,
	}
	allItems, err := h.queries.ListSparepartStocks(ctx, listParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to get sparepart stock items", h.logger)
		return
	}

	// Filter items by location_id
	var locationItems []sqlcdb.ListSparepartStocksRow
	for _, stockItem := range allItems {
		if stockItem.LocationID == item.LocationID {
			locationItems = append(locationItems, stockItem)
		}
	}

	// Group by location_id (should be only one location)
	groupedItems := groupSparepartStocksByLocation(locationItems)
	if len(groupedItems) == 0 {
		utils.NotFound(c, "Location not found")
		return
	}

	// Return the first (and only) grouped item
	utils.Success(c, "Sparepart stock items retrieved successfully", groupedItems[0])
}

// @Summary Create sparepart stock item with photos
// @Description Create a new sparepart stock item with optional photo uploads
// @Tags Sparepart Stock
// @Accept multipart/form-data
// @Produce json
// @Param location_id formData int true "Location ID"
// @Param sparepart_id formData int true "Sparepart ID"
// @Param stock_type formData string true "Stock Type (NEW_STOCK, USED_STOCK)"
// @Param quantity formData int false "Quantity"
// @Param notes formData string false "Notes"
// @Param photos formData file false "Photo files (multiple allowed)"
// @Success 201 {object} utils.Response
// @Router /sparepart/stock [post]
func (h *SparepartStockHandler) Create(c *gin.Context) {
	var req CreateSparepartStockRequest

	// Parse form data
	locationIDStr := c.PostForm("location_id")
	sparepartIDStr := c.PostForm("sparepart_id")
	stockTypeStr := c.PostForm("stock_type")
	quantityStr := c.PostForm("quantity")
	notes := c.PostForm("notes")

	// Parse location_id
	locationID, err := strconv.ParseUint(locationIDStr, 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid location_id")
		return
	}
	req.LocationID = uint(locationID)

	// Parse sparepart_id
	sparepartID, err := strconv.ParseUint(sparepartIDStr, 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid sparepart_id")
		return
	}
	req.SparepartID = uint(sparepartID)

	// Parse stock_type
	req.StockType = models.StockType(stockTypeStr)
	if req.StockType != models.StockTypeNew && req.StockType != models.StockTypeUsed {
		utils.BadRequest(c, "Invalid stock_type. Must be NEW_STOCK or USED_STOCK")
		return
	}

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
		subDir := utils.GetSubDirForSparepartStock(string(req.StockType))
		prefix := utils.GetPrefixForSparepartStock(string(req.StockType))
		for _, file := range files {
			path, err := utils.ProcessImageUpload(file, subDir, prefix, h.logger)
			if err != nil {
				utils.BadRequest(c, "Failed to upload photo: "+err.Error())
				return
			}
			documentation = append(documentation, path)
		}
	}

	// Convert StockType to sqlc StockType
	var stockType sqlcdb.StockType
	if req.StockType == models.StockTypeNew {
		stockType = sqlcdb.StockTypeNEWSTOCK
	} else if req.StockType == models.StockTypeUsed {
		stockType = sqlcdb.StockTypeUSEDSTOCK
	} else {
		utils.BadRequest(c, "Invalid stock_type. Must be NEW_STOCK or USED_STOCK")
		return
	}

	// Convert notes to pgtype.Text
	var notesText pgtype.Text
	if req.Notes != nil {
		notesText.String = *req.Notes
		notesText.Valid = true
	}

	// Create sparepart stock item
	createParams := sqlcdb.CreateSparepartStockParams{
		LocationID:    int32(req.LocationID),
		SparepartID:   int32(req.SparepartID),
		StockType:     stockType,
		Quantity:      int32(req.Quantity),
		Documentation: documentationToBytes(documentation),
		Notes:         notesText,
	}

	item, err := h.queries.CreateSparepartStock(ctx, createParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to create sparepart stock item", h.logger)
		return
	}

	// Get full item with relations
	// Get grouped response for this location
	groupedResponse, err := h.getGroupedSparepartStockByLocationID(ctx, item.LocationID)
	if err != nil {
		utils.HandleError(c, err, "Failed to retrieve grouped stock items", h.logger)
		return
	}

	c.JSON(http.StatusCreated, utils.Response{
		Success: true,
		Message: "Sparepart stock item created successfully",
		Data:    groupedResponse,
	})
}

// @Summary Update sparepart stock item
// @Description Update an existing sparepart stock item
// @Tags Sparepart Stock
// @Accept json
// @Produce json
// @Param id path int true "Sparepart Stock Item ID"
// @Param item body UpdateSparepartStockRequest true "Update data"
// @Success 200 {object} utils.Response
// @Router /sparepart/stock/{id} [put]
func (h *SparepartStockHandler) Update(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid sparepart stock item ID")
		return
	}

	// Check if item exists
	_, err = h.queries.GetSparepartStock(ctx, int32(id))
	if err != nil {
		utils.NotFound(c, "Sparepart stock item not found")
		return
	}

	var req UpdateSparepartStockRequest
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

	updateParams := sqlcdb.UpdateSparepartStockParams{
		ID:       int32(id),
		Quantity: int32(req.Quantity),
		Notes:    notes,
	}

	item, err := h.queries.UpdateSparepartStock(ctx, updateParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to update sparepart stock item", h.logger)
		return
	}

	// Get full item with relations
	// Get grouped response for this location
	groupedResponse, err := h.getGroupedSparepartStockByLocationID(ctx, item.LocationID)
	if err != nil {
		utils.HandleError(c, err, "Failed to retrieve grouped stock items", h.logger)
		return
	}

	utils.Success(c, "Sparepart stock item updated successfully", groupedResponse)
}

// @Summary Add photos to sparepart stock item
// @Description Add photos to an existing sparepart stock item
// @Tags Sparepart Stock
// @Accept multipart/form-data
// @Produce json
// @Param id path int true "Sparepart Stock Item ID"
// @Param photos formData file true "Photo files (multiple allowed)"
// @Success 200 {object} utils.Response
// @Router /sparepart/stock/{id}/photos [post]
func (h *SparepartStockHandler) AddPhotos(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid sparepart stock item ID")
		return
	}

	// Get existing item
	item, err := h.queries.GetSparepartStock(ctx, int32(id))
	if err != nil {
		utils.NotFound(c, "Sparepart stock item not found")
		return
	}

	// Process file uploads
	form, err := c.MultipartForm()
	if err != nil {
		utils.BadRequest(c, "Failed to parse multipart form")
		return
	}

	files := form.File["photos"]
	if len(files) == 0 {
		utils.BadRequest(c, "No photos provided")
		return
	}

	// Get existing documentation
	existingDocs := documentationFromBytes(item.Documentation)

	// Append new photos to existing documentation
	subDir := utils.GetSubDirForSparepartStock(string(item.StockType))
	prefix := utils.GetPrefixForSparepartStock(string(item.StockType))
	for _, file := range files {
		path, err := utils.ProcessImageUpload(file, subDir, prefix, h.logger)
		if err != nil {
			utils.BadRequest(c, "Failed to upload photo: "+err.Error())
			return
		}
		existingDocs = append(existingDocs, path)
	}

	// Update documentation
	updateParams := sqlcdb.UpdateSparepartStockDocumentationParams{
		ID:            int32(id),
		Documentation: documentationToBytes(existingDocs),
	}

	_, err = h.queries.UpdateSparepartStockDocumentation(ctx, updateParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to update photos", h.logger)
		return
	}

	// Get the item to find its location_id (item already declared above, use = instead of :=)
	item, err = h.queries.GetSparepartStock(ctx, int32(id))
	if err != nil {
		utils.HandleError(c, err, "Failed to retrieve item", h.logger)
		return
	}

	// Get grouped response for this location
	groupedResponse, err := h.getGroupedSparepartStockByLocationID(ctx, item.LocationID)
	if err != nil {
		utils.HandleError(c, err, "Failed to retrieve grouped stock items", h.logger)
		return
	}

	utils.Success(c, "Photos added successfully", groupedResponse)
}

// @Summary Delete photo from sparepart stock item
// @Description Delete a photo from sparepart stock item by index
// @Tags Sparepart Stock
// @Accept json
// @Produce json
// @Param id path int true "Sparepart Stock Item ID"
// @Param photo_index path int true "Photo index in documentation array"
// @Success 200 {object} utils.Response
// @Router /sparepart/stock/{id}/photos/{photo_index} [delete]
func (h *SparepartStockHandler) DeletePhoto(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid sparepart stock item ID")
		return
	}

	photoIndex, err := strconv.Atoi(c.Param("photo_index"))
	if err != nil {
		utils.BadRequest(c, "Invalid photo index")
		return
	}

	// Get existing item
	item, err := h.queries.GetSparepartStock(ctx, int32(id))
	if err != nil {
		utils.NotFound(c, "Sparepart stock item not found")
		return
	}

	// Get existing documentation
	docs := documentationFromBytes(item.Documentation)
	if photoIndex < 0 || photoIndex >= len(docs) {
		utils.BadRequest(c, "Photo index out of range")
		return
	}

	// Delete file from storage
	filePath := docs[photoIndex]
	if err := utils.DeleteFile(filePath, h.logger); err != nil {
		h.logger.Warn("Failed to delete file", zap.Error(err), zap.String("path", filePath))
	}

	// Remove from array
	docs = append(docs[:photoIndex], docs[photoIndex+1:]...)

	// Update documentation
	updateParams := sqlcdb.UpdateSparepartStockDocumentationParams{
		ID:            int32(id),
		Documentation: documentationToBytes(docs),
	}

	_, err = h.queries.UpdateSparepartStockDocumentation(ctx, updateParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to delete photo", h.logger)
		return
	}

	// Get the item to find its location_id (item already declared above, use = instead of :=)
	item, err = h.queries.GetSparepartStock(ctx, int32(id))
	if err != nil {
		utils.HandleError(c, err, "Failed to retrieve item", h.logger)
		return
	}

	// Get grouped response for this location
	groupedResponse, err := h.getGroupedSparepartStockByLocationID(ctx, item.LocationID)
	if err != nil {
		utils.HandleError(c, err, "Failed to retrieve grouped stock items", h.logger)
		return
	}

	utils.Success(c, "Photo deleted successfully", groupedResponse)
}

// @Summary Delete sparepart stock item
// @Description Delete a sparepart stock item
// @Tags Sparepart Stock
// @Accept json
// @Produce json
// @Param id path int true "Sparepart Stock Item ID"
// @Success 200 {object} utils.Response
// @Router /sparepart/stock/{id} [delete]
func (h *SparepartStockHandler) Delete(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid sparepart stock item ID")
		return
	}

	// Get item to delete photos
	item, err := h.queries.GetSparepartStock(ctx, int32(id))
	if err != nil {
		utils.NotFound(c, "Sparepart stock item not found")
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
	err = h.queries.DeleteSparepartStock(ctx, int32(id))
	if err != nil {
		utils.HandleError(c, err, "Failed to delete sparepart stock item", h.logger)
		return
	}

	utils.Success(c, "Sparepart stock item deleted successfully", nil)
}

// @Summary Export sparepart stock to PDF
// @Description Export sparepart stock items to PDF with filters (landscape mode)
// @Tags Sparepart Stock
// @Accept json
// @Produce application/pdf
// @Param sparepart_name query string false "Filter by sparepart name (comma-separated)"
// @Param region query string false "Filter by region"
// @Param regency query string false "Filter by regency"
// @Param cluster query string false "Filter by cluster"
// @Param stock_type query string false "Filter by stock type"
// @Success 200 {file} application/pdf
// @Router /sparepart/stock/export/pdf [get]
func (h *SparepartStockHandler) ExportPDF(c *gin.Context) {
	ctx := c.Request.Context()

	// Get filter parameters
	filterParams := h.buildSparepartStockParams(c)

	// List items for export (no pagination)
	exportParams := sqlcdb.ListSparepartStocksForExportParams{
		Column1: filterParams.Column1,
		Column2: filterParams.Column2,
		Column3: filterParams.Column3,
		Column4: filterParams.Column4,
		Column5: filterParams.Column5,
	}

	items, err := h.queries.ListSparepartStocksForExport(ctx, exportParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to get sparepart stock items", h.logger)
		return
	}

	buf, err := utils.ExportSparepartStockToPDF(items, h.logger)
	if err != nil {
		utils.HandleError(c, err, "Failed to generate PDF", h.logger)
		return
	}

	filename := fmt.Sprintf("sparepart_stock_%s.pdf", time.Now().Format("20060102_150405"))
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("Content-Type", "application/pdf")
	c.Data(http.StatusOK, "application/pdf", buf.Bytes())
}

// @Summary Export sparepart stock to Excel
// @Description Export sparepart stock items to Excel with filters
// @Tags Sparepart Stock
// @Accept json
// @Produce application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
// @Param sparepart_name query string false "Filter by sparepart name (comma-separated)"
// @Param region query string false "Filter by region"
// @Param regency query string false "Filter by regency"
// @Param cluster query string false "Filter by cluster"
// @Param stock_type query string false "Filter by stock type"
// @Success 200 {file} application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
// @Router /sparepart/stock/export/excel [get]
func (h *SparepartStockHandler) ExportExcel(c *gin.Context) {
	ctx := c.Request.Context()

	// Get filter parameters
	filterParams := h.buildSparepartStockParams(c)

	// List items for export (no pagination)
	exportParams := sqlcdb.ListSparepartStocksForExportParams{
		Column1: filterParams.Column1,
		Column2: filterParams.Column2,
		Column3: filterParams.Column3,
		Column4: filterParams.Column4,
		Column5: filterParams.Column5,
	}

	items, err := h.queries.ListSparepartStocksForExport(ctx, exportParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to get sparepart stock items", h.logger)
		return
	}

	buf, err := utils.ExportSparepartStockToExcel(items, h.logger)
	if err != nil {
		utils.HandleError(c, err, "Failed to generate Excel", h.logger)
		return
	}

	filename := fmt.Sprintf("sparepart_stock_%s.xlsx", time.Now().Format("20060102_150405"))
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}

// @Summary Update photo in sparepart stock item
// @Description Delete old photo and upload new photo (replace by index)
// @Tags Sparepart Stock
// @Accept multipart/form-data
// @Produce json
// @Param id path int true "Sparepart Stock Item ID"
// @Param photo_index path int true "Photo index in documentation array"
// @Param photo formData file true "New photo file"
// @Success 200 {object} utils.Response
// @Router /sparepart/stock/{id}/photos/{photo_index} [put]
func (h *SparepartStockHandler) UpdatePhoto(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid sparepart stock item ID")
		return
	}

	photoIndex, err := strconv.Atoi(c.Param("photo_index"))
	if err != nil {
		utils.BadRequest(c, "Invalid photo index")
		return
	}

	// Get existing item
	item, err := h.queries.GetSparepartStock(ctx, int32(id))
	if err != nil {
		utils.NotFound(c, "Sparepart stock item not found")
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
	subDir := utils.GetSubDirForSparepartStock(string(item.StockType))
	prefix := utils.GetPrefixForSparepartStock(string(item.StockType))
	newPath, err := utils.ProcessImageUpload(file, subDir, prefix, h.logger)
	if err != nil {
		utils.BadRequest(c, "Failed to upload photo: "+err.Error())
		return
	}

	// Update documentation array
	docs[photoIndex] = newPath

	// Update documentation
	updateParams := sqlcdb.UpdateSparepartStockDocumentationParams{
		ID:            int32(id),
		Documentation: documentationToBytes(docs),
	}

	_, err = h.queries.UpdateSparepartStockDocumentation(ctx, updateParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to update photo", h.logger)
		return
	}

	// Get the item to find its location_id (item already declared above, use = instead of :=)
	item, err = h.queries.GetSparepartStock(ctx, int32(id))
	if err != nil {
		utils.HandleError(c, err, "Failed to retrieve item", h.logger)
		return
	}

	// Get grouped response for this location
	groupedResponse, err := h.getGroupedSparepartStockByLocationID(ctx, item.LocationID)
	if err != nil {
		utils.HandleError(c, err, "Failed to retrieve grouped stock items", h.logger)
		return
	}

	utils.Success(c, "Photo updated successfully", groupedResponse)
}
