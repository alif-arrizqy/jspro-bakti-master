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

type ProblemMasterHandler struct {
	logger  *zap.Logger
	queries *sqlcdb.Queries
}

func NewProblemMasterHandler() *ProblemMasterHandler {
	return &ProblemMasterHandler{
		logger:  utils.GetLogger(),
		queries: sqlcdb.New(database.GetDB()),
	}
}

func (h *ProblemMasterHandler) GetAll(c *gin.Context) {
	ctx := c.Request.Context()

	items, err := h.queries.ListProblemMasters(ctx)
	if err != nil {
		utils.HandleError(c, err, "Failed to get problem masters", h.logger)
		return
	}

	utils.Success(c, "Problem masters retrieved successfully", items)
}

func (h *ProblemMasterHandler) GetByID(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid problem master ID")
		return
	}

	item, err := h.queries.GetProblemMaster(ctx, int32(id))
	if err != nil {
		utils.NotFound(c, "Problem master not found")
		return
	}

	utils.Success(c, "Problem master retrieved successfully", item)
}

func (h *ProblemMasterHandler) Create(c *gin.Context) {
	ctx := c.Request.Context()

	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	item, err := h.queries.CreateProblemMaster(ctx, req.Name)
	if err != nil {
		utils.HandleError(c, err, "Failed to create problem master", h.logger)
		return
	}

	c.JSON(http.StatusCreated, utils.SuccessResponse{
		Status:  "success",
		Message: "Problem master created successfully",
		Data:    item,
	})
}

func (h *ProblemMasterHandler) Update(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid problem master ID")
		return
	}

	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	item, err := h.queries.UpdateProblemMaster(ctx, sqlcdb.UpdateProblemMasterParams{
		ID:   int32(id),
		Name: req.Name,
	})
	if err != nil {
		utils.HandleError(c, err, "Failed to update problem master", h.logger)
		return
	}

	utils.Success(c, "Problem master updated successfully", item)
}

func (h *ProblemMasterHandler) Delete(c *gin.Context) {
	ctx := c.Request.Context()

	id, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid problem master ID")
		return
	}

	if err := h.queries.DeleteProblemMaster(ctx, int32(id)); err != nil {
		utils.HandleError(c, err, "Failed to delete problem master", h.logger)
		return
	}

	utils.Success(c, "Problem master deleted successfully", nil)
}
