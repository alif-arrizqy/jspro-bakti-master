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

type LocationHandler struct {
	logger  *zap.Logger
	queries *sqlcdb.Queries
}

func NewLocationHandler() *LocationHandler {
	return &LocationHandler{
		logger:  utils.GetLogger(),
		queries: sqlcdb.New(database.GetDB()),
	}
}

// @Summary Get all locations
// @Description Get all locations with optional filters
// @Tags Location
// @Accept json
// @Produce json
// @Param region query string false "Filter by region"
// @Param regency query string false "Filter by regency"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Success 200 {object} utils.PaginatedResponse
// @Router /location [get]
func (h *LocationHandler) GetAll(c *gin.Context) {
	ctx := c.Request.Context()

	// Get filter parameters
	var region, regency, cluster string
	if r := c.Query("region"); r != "" {
		region = r
	}
	if r := c.Query("regency"); r != "" {
		regency = r
	}
	if r := c.Query("cluster"); r != "" {
		cluster = r
	}

	// Get pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	// Count total
	countParams := sqlcdb.CountLocationsParams{
		Column1: region,
		Column2: regency,
		Column3: cluster,
	}
	total, err := h.queries.CountLocations(ctx, countParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to count locations", h.logger)
		return
	}

	// List locations
	listParams := sqlcdb.ListLocationsParams{
		Column1: region,
		Column2: regency,
		Column3: cluster,
		Limit:   int32(limit),
		Offset:  int32(offset),
	}
	locations, err := h.queries.ListLocations(ctx, listParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to get locations", h.logger)
		return
	}

	utils.SuccessWithPagination(c, "Locations retrieved successfully", locations, page, limit, total)
}

// @Summary Get location by ID
// @Description Get a single location by ID
// @Tags Location
// @Accept json
// @Produce json
// @Param id path int true "Location ID"
// @Success 200 {object} utils.Response
// @Router /location/{id} [get]
func (h *LocationHandler) GetByID(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid location ID")
		return
	}

	location, err := h.queries.GetLocation(ctx, int32(id))
	if err != nil {
		utils.NotFound(c, "Location not found")
		return
	}

	utils.Success(c, "Location retrieved successfully", location)
}

// @Summary Create location
// @Description Create a new location
// @Tags Location
// @Accept json
// @Produce json
// @Param location body sqlcdb.CreateLocationParams true "Location data"
// @Success 201 {object} utils.Response
// @Router /location [post]
func (h *LocationHandler) Create(c *gin.Context) {
	ctx := c.Request.Context()

	var req sqlcdb.CreateLocationParams
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	location, err := h.queries.CreateLocation(ctx, req)
	if err != nil {
		utils.HandleError(c, err, "Failed to create location", h.logger)
		return
	}

	c.JSON(http.StatusCreated, utils.Response{
		Success: true,
		Message: "Location created successfully",
		Data:    location,
	})
}

// @Summary Update location
// @Description Update an existing location
// @Tags Location
// @Accept json
// @Produce json
// @Param id path int true "Location ID"
// @Param location body sqlcdb.UpdateLocationParams true "Location data"
// @Success 200 {object} utils.Response
// @Router /location/{id} [put]
func (h *LocationHandler) Update(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid location ID")
		return
	}

	// Check if location exists
	_, err = h.queries.GetLocation(ctx, int32(id))
	if err != nil {
		utils.NotFound(c, "Location not found")
		return
	}

	var req sqlcdb.UpdateLocationParams
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	req.ID = int32(id)
	location, err := h.queries.UpdateLocation(ctx, req)
	if err != nil {
		utils.HandleError(c, err, "Failed to update location", h.logger)
		return
	}

	utils.Success(c, "Location updated successfully", location)
}

// @Summary Delete location
// @Description Delete a location
// @Tags Location
// @Accept json
// @Produce json
// @Param id path int true "Location ID"
// @Success 200 {object} utils.Response
// @Router /location/{id} [delete]
func (h *LocationHandler) Delete(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid location ID")
		return
	}

	err = h.queries.DeleteLocation(ctx, int32(id))
	if err != nil {
		utils.HandleError(c, err, "Failed to delete location", h.logger)
		return
	}

	utils.Success(c, "Location deleted successfully", nil)
}
