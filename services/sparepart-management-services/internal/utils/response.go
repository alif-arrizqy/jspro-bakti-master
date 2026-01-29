package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

type PaginationMeta struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

type PaginatedResponse struct {
	Success    bool          `json:"success"`
	Message    string        `json:"message,omitempty"`
	Data       interface{}   `json:"data,omitempty"`
	Pagination PaginationMeta `json:"pagination,omitempty"`
	Error      string        `json:"error,omitempty"`
}

func Success(c *gin.Context, message string, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: message,
		Data:    data,
	})
}

func SuccessWithPagination(c *gin.Context, message string, data interface{}, page, limit int, total int64) {
	totalPages := int((total + int64(limit) - 1) / int64(limit))
	c.JSON(http.StatusOK, PaginatedResponse{
		Success: true,
		Message: message,
		Data:    data,
		Pagination: PaginationMeta{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	})
}

func Error(c *gin.Context, message string, statusCode int) {
	c.JSON(statusCode, Response{
		Success: false,
		Error:   message,
	})
}

func HandleError(c *gin.Context, err error, message string, logger *zap.Logger) {
	if logger != nil {
		logger.Error(message, zap.Error(err))
	}

	statusCode := http.StatusInternalServerError
	errorMsg := message

	if err != nil {
		errorMsg = err.Error()
	}

	c.JSON(statusCode, Response{
		Success: false,
		Error:   errorMsg,
	})
}

func BadRequest(c *gin.Context, message string) {
	Error(c, message, http.StatusBadRequest)
}

func NotFound(c *gin.Context, message string) {
	Error(c, message, http.StatusNotFound)
}

func InternalServerError(c *gin.Context, message string) {
	Error(c, message, http.StatusInternalServerError)
}

