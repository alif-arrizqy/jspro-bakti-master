package handlers

import (
	"net/http"
	"sparepart-management-services/internal/database"
	sqlcdb "sparepart-management-services/internal/database/sqlc"
	"sparepart-management-services/internal/utils"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// ContactPersonResponse represents the nested response structure for contact person
type ContactPersonResponse struct {
	ID        int32                  `json:"id"`
	Location  ContactPersonLocation  `json:"location"`
	Pic       string                 `json:"pic"`
	Phone     string                 `json:"phone"`
	CreatedAt string                `json:"created_at"`
	UpdatedAt string                `json:"updated_at"`
}

type ContactPersonLocation struct {
	ID        int32  `json:"id"`
	Region    string `json:"region"`
	Regency   string `json:"regency"`
	Cluster   string `json:"cluster"`
	CreatedAt string `json:"created_at,omitempty"`
	UpdatedAt string `json:"updated_at,omitempty"`
}

// transformContactPerson transforms sqlc flat structure to nested response
func transformContactPerson(row sqlcdb.ListContactPersonsRow) ContactPersonResponse {
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

	return ContactPersonResponse{
		ID: row.ID,
		Location: ContactPersonLocation{
			ID:        row.LocationID2,
			Region:    string(row.Region),
			Regency:   row.Regency,
			Cluster:   row.Cluster,
			CreatedAt: locationCreatedAt,
			UpdatedAt: locationUpdatedAt,
		},
		Pic:       row.Pic,
		Phone:     row.Phone,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
	}
}

// transformContactPersonFromGet transforms GetContactPersonRow to nested response
func transformContactPersonFromGet(row sqlcdb.GetContactPersonRow) ContactPersonResponse {
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

	return ContactPersonResponse{
		ID: row.ID,
		Location: ContactPersonLocation{
			ID:        row.LocationID2,
			Region:    string(row.Region),
			Regency:   row.Regency,
			Cluster:   row.Cluster,
			CreatedAt: locationCreatedAt,
			UpdatedAt: locationUpdatedAt,
		},
		Pic:       row.Pic,
		Phone:     row.Phone,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
	}
}

type ContactPersonHandler struct {
	logger  *zap.Logger
	queries *sqlcdb.Queries
}

func NewContactPersonHandler() *ContactPersonHandler {
	return &ContactPersonHandler{
		logger:  utils.GetLogger(),
		queries: sqlcdb.New(database.GetDB()),
	}
}

// @Summary Get all contact persons
// @Description Get all contact persons with optional filters
// @Tags Contact Person
// @Accept json
// @Produce json
// @Param location_id query int false "Filter by location ID"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Success 200 {object} utils.PaginatedResponse
// @Router /contact-person [get]
func (h *ContactPersonHandler) GetAll(c *gin.Context) {
	ctx := c.Request.Context()

	// Get filter parameters
	var locationID int32
	if locationIDStr := c.Query("location_id"); locationIDStr != "" {
		if id, err := strconv.ParseInt(locationIDStr, 10, 32); err == nil {
			locationID = int32(id)
		}
	}

	// Get pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	// Count total
	total, err := h.queries.CountContactPersons(ctx, locationID)
	if err != nil {
		utils.HandleError(c, err, "Failed to count contact persons", h.logger)
		return
	}

	// List contact persons
	listParams := sqlcdb.ListContactPersonsParams{
		Column1: locationID,
		Limit:   int32(limit),
		Offset:  int32(offset),
	}
	contacts, err := h.queries.ListContactPersons(ctx, listParams)
	if err != nil {
		utils.HandleError(c, err, "Failed to get contact persons", h.logger)
		return
	}

	// Transform to nested response structure
	responseData := make([]ContactPersonResponse, len(contacts))
	for i, contact := range contacts {
		responseData[i] = transformContactPerson(contact)
	}

	utils.SuccessWithPagination(c, "Contact persons retrieved successfully", responseData, page, limit, total)
}

// @Summary Get contact person by ID
// @Description Get a single contact person by ID
// @Tags Contact Person
// @Accept json
// @Produce json
// @Param id path int true "Contact Person ID"
// @Success 200 {object} utils.Response
// @Router /contact-person/{id} [get]
func (h *ContactPersonHandler) GetByID(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid contact person ID")
		return
	}

	contact, err := h.queries.GetContactPerson(ctx, int32(id))
	if err != nil {
		utils.NotFound(c, "Contact person not found")
		return
	}

	// Transform to nested response structure
	responseData := transformContactPersonFromGet(contact)
	utils.Success(c, "Contact person retrieved successfully", responseData)
}

// @Summary Create contact person
// @Description Create a new contact person
// @Tags Contact Person
// @Accept json
// @Produce json
// @Param contact body sqlcdb.CreateContactPersonParams true "Contact Person data"
// @Success 201 {object} utils.Response
// @Router /contact-person [post]
func (h *ContactPersonHandler) Create(c *gin.Context) {
	ctx := c.Request.Context()

	var req sqlcdb.CreateContactPersonParams
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	contact, err := h.queries.CreateContactPerson(ctx, req)
	if err != nil {
		utils.HandleError(c, err, "Failed to create contact person", h.logger)
		return
	}

	c.JSON(http.StatusCreated, utils.Response{
		Success: true,
		Message: "Contact person created successfully",
		Data:    contact,
	})
}

// @Summary Update contact person
// @Description Update an existing contact person
// @Tags Contact Person
// @Accept json
// @Produce json
// @Param id path int true "Contact Person ID"
// @Param contact body sqlcdb.UpdateContactPersonParams true "Contact Person data"
// @Success 200 {object} utils.Response
// @Router /contact-person/{id} [put]
func (h *ContactPersonHandler) Update(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid contact person ID")
		return
	}

	// Check if contact person exists
	_, err = h.queries.GetContactPerson(ctx, int32(id))
	if err != nil {
		utils.NotFound(c, "Contact person not found")
		return
	}

	var req sqlcdb.UpdateContactPersonParams
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	req.ID = int32(id)
	contact, err := h.queries.UpdateContactPerson(ctx, req)
	if err != nil {
		utils.HandleError(c, err, "Failed to update contact person", h.logger)
		return
	}

	utils.Success(c, "Contact person updated successfully", contact)
}

// @Summary Delete contact person
// @Description Delete a contact person
// @Tags Contact Person
// @Accept json
// @Produce json
// @Param id path int true "Contact Person ID"
// @Success 200 {object} utils.Response
// @Router /contact-person/{id} [delete]
func (h *ContactPersonHandler) Delete(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid contact person ID")
		return
	}

	err = h.queries.DeleteContactPerson(ctx, int32(id))
	if err != nil {
		utils.HandleError(c, err, "Failed to delete contact person", h.logger)
		return
	}

	utils.Success(c, "Contact person deleted successfully", nil)
}
