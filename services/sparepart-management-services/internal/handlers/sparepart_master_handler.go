package handlers

import (
	"net/http"
	"sparepart-management-services/internal/database"
	sqlcdb "sparepart-management-services/internal/database/sqlc"
	"sparepart-management-services/internal/utils"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type SparepartMasterHandler struct {
	logger  *zap.Logger
	queries *sqlcdb.Queries
}

func NewSparepartMasterHandler() *SparepartMasterHandler {
	return &SparepartMasterHandler{
		logger:  utils.GetLogger(),
		queries: sqlcdb.New(database.GetDB()),
	}
}

// @Summary Get all spareparts from master list
// @Description Get all spareparts from master list with optional filters
// @Tags Sparepart Master
// @Accept json
// @Produce json
// @Param name query string false "Filter by name (partial match, case-insensitive)"
// @Param item_type query string false "Filter by item type (SPAREPART, TOOLS_ALKER)"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Success 200 {object} utils.PaginatedResponse
// @Router /sparepart/master [get]
func (h *SparepartMasterHandler) GetAll(c *gin.Context) {
	ctx := c.Request.Context()

	// Get filter parameters
	var name, itemType string
	if n := c.Query("name"); n != "" {
		name = n
	}
	if it := c.Query("item_type"); it != "" {
		itemType = it
	}

	// Get pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	// Count total
	countParams := sqlcdb.CountSparepartMastersParams{
		Column1: name,
		Column2: itemType,
	}
	total, err := h.queries.CountSparepartMasters(ctx, countParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to count spareparts", h.logger)
		return
	}

	// List spareparts
	listParams := sqlcdb.ListSparepartMastersParams{
		Column1: name,
		Column2: itemType,
		Limit:   int32(limit),
		Offset:  int32(offset),
	}
	items, err := h.queries.ListSparepartMasters(ctx, listParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to get spareparts", h.logger)
		return
	}

	utils.SuccessWithPagination(c, "Spareparts retrieved successfully", items, page, limit, total)
}

// @Summary Get sparepart by ID
// @Description Get a single sparepart from master list by ID
// @Tags Sparepart Master
// @Accept json
// @Produce json
// @Param id path int true "Sparepart ID"
// @Success 200 {object} utils.Response
// @Router /sparepart/master/{id} [get]
func (h *SparepartMasterHandler) GetByID(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid sparepart ID")
		return
	}

	item, err := h.queries.GetSparepartMaster(ctx, int32(id))
	if err != nil {
		utils.NotFound(c, "Sparepart not found")
		return
	}

	utils.Success(c, "Sparepart retrieved successfully", item)
}

// @Summary Create sparepart in master list
// @Description Create a new sparepart in master list
// @Tags Sparepart Master
// @Accept json
// @Produce json
// @Param sparepart body sqlcdb.CreateSparepartMasterParams true "Sparepart data"
// @Success 201 {object} utils.Response
// @Router /sparepart/master [post]
func (h *SparepartMasterHandler) Create(c *gin.Context) {
	ctx := c.Request.Context()

	var req sqlcdb.CreateSparepartMasterParams
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	item, err := h.queries.CreateSparepartMaster(ctx, req)
	if err != nil {
		utils.HandleError(c, err, "Failed to create sparepart", h.logger)
		return
	}

	c.JSON(http.StatusCreated, utils.Response{
		Success: true,
		Message: "Sparepart created successfully",
		Data:    item,
	})
}

// @Summary Update sparepart in master list
// @Description Update an existing sparepart in master list
// @Tags Sparepart Master
// @Accept json
// @Produce json
// @Param id path int true "Sparepart ID"
// @Param sparepart body sqlcdb.UpdateSparepartMasterParams true "Sparepart data"
// @Success 200 {object} utils.Response
// @Router /sparepart/master/{id} [put]
func (h *SparepartMasterHandler) Update(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid sparepart ID")
		return
	}

	// Check if sparepart exists
	_, err = h.queries.GetSparepartMaster(ctx, int32(id))
	if err != nil {
		utils.NotFound(c, "Sparepart not found")
		return
	}

	var req sqlcdb.UpdateSparepartMasterParams
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	req.ID = int32(id)
	item, err := h.queries.UpdateSparepartMaster(ctx, req)
	if err != nil {
		utils.HandleError(c, err, "Failed to update sparepart", h.logger)
		return
	}

	utils.Success(c, "Sparepart updated successfully", item)
}

// @Summary Delete sparepart from master list
// @Description Delete a sparepart from master list
// @Tags Sparepart Master
// @Accept json
// @Produce json
// @Param id path int true "Sparepart ID"
// @Success 200 {object} utils.Response
// @Router /sparepart/master/{id} [delete]
func (h *SparepartMasterHandler) Delete(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid sparepart ID")
		return
	}

	err = h.queries.DeleteSparepartMaster(ctx, int32(id))
	if err != nil {
		utils.HandleError(c, err, "Failed to delete sparepart", h.logger)
		return
	}

	utils.Success(c, "Sparepart deleted successfully", nil)
}

