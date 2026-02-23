package handlers

import (
	"net/http"
	"strconv"
	"trouble-ticket-services/internal/database"
	sqlcdb "trouble-ticket-services/internal/database/sqlc"
	"trouble-ticket-services/internal/utils"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type TypeTicketHandler struct {
	logger  *zap.Logger
	queries *sqlcdb.Queries
}

func NewTypeTicketHandler() *TypeTicketHandler {
	return &TypeTicketHandler{
		logger:  utils.GetLogger(),
		queries: sqlcdb.New(database.GetDB()),
	}
}

func (h *TypeTicketHandler) GetAll(c *gin.Context) {
	ctx := c.Request.Context()

	items, err := h.queries.ListTypeTickets(ctx)
	if err != nil {
		utils.HandleError(c, err, "Failed to get type tickets", h.logger)
		return
	}

	utils.Success(c, "Type tickets retrieved successfully", items)
}

func (h *TypeTicketHandler) GetByID(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid type ticket ID")
		return
	}

	item, err := h.queries.GetTypeTicket(ctx, int32(id))
	if err != nil {
		utils.NotFound(c, "Type ticket not found")
		return
	}

	utils.Success(c, "Type ticket retrieved successfully", item)
}

func (h *TypeTicketHandler) Create(c *gin.Context) {
	ctx := c.Request.Context()

	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	item, err := h.queries.CreateTypeTicket(ctx, req.Name)
	if err != nil {
		utils.HandleError(c, err, "Failed to create type ticket", h.logger)
		return
	}

	c.JSON(http.StatusCreated, utils.SuccessResponse{
		Status:  "success",
		Message: "Type ticket created successfully",
		Data:    item,
	})
}

func (h *TypeTicketHandler) Update(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid type ticket ID")
		return
	}

	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	item, err := h.queries.UpdateTypeTicket(ctx, sqlcdb.UpdateTypeTicketParams{
		ID:   int32(id),
		Name: req.Name,
	})
	if err != nil {
		utils.HandleError(c, err, "Failed to update type ticket", h.logger)
		return
	}

	utils.Success(c, "Type ticket updated successfully", item)
}

func (h *TypeTicketHandler) Delete(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid type ticket ID")
		return
	}

	if err := h.queries.DeleteTypeTicket(ctx, int32(id)); err != nil {
		utils.HandleError(c, err, "Failed to delete type ticket", h.logger)
		return
	}

	utils.Success(c, "Type ticket deleted successfully", nil)
}
