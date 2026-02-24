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

type PicHandler struct {
	logger  *zap.Logger
	queries *sqlcdb.Queries
}

func NewPicHandler() *PicHandler {
	return &PicHandler{
		logger:  utils.GetLogger(),
		queries: sqlcdb.New(database.GetDB()),
	}
}

func (h *PicHandler) GetAll(c *gin.Context) {
	ctx := c.Request.Context()

	items, err := h.queries.ListPics(ctx)
	if err != nil {
		utils.HandleError(c, err, "Failed to get PICs", h.logger)
		return
	}

	utils.Success(c, "PICs retrieved successfully", items)
}

func (h *PicHandler) GetByID(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid PIC ID")
		return
	}

	item, err := h.queries.GetPic(ctx, int32(id))
	if err != nil {
		utils.NotFound(c, "PIC not found")
		return
	}

	utils.Success(c, "PIC retrieved successfully", item)
}

func (h *PicHandler) Create(c *gin.Context) {
	ctx := c.Request.Context()

	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	item, err := h.queries.CreatePic(ctx, req.Name)
	if err != nil {
		utils.HandleError(c, err, "Failed to create PIC", h.logger)
		return
	}

	c.JSON(http.StatusCreated, utils.SuccessResponse{
		Status:  "success",
		Message: "PIC created successfully",
		Data:    item,
	})
}

func (h *PicHandler) Update(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid PIC ID")
		return
	}

	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	item, err := h.queries.UpdatePic(ctx, sqlcdb.UpdatePicParams{
		ID:   int32(id),
		Name: req.Name,
	})
	if err != nil {
		utils.HandleError(c, err, "Failed to update PIC", h.logger)
		return
	}

	utils.Success(c, "PIC updated successfully", item)
}

func (h *PicHandler) Delete(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid PIC ID")
		return
	}

	if err := h.queries.DeletePic(ctx, int32(id)); err != nil {
		utils.HandleError(c, err, "Failed to delete PIC", h.logger)
		return
	}

	utils.Success(c, "PIC deleted successfully", nil)
}
