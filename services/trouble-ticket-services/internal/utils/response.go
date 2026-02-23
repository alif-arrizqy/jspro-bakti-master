package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type SuccessResponse struct {
	Status  string      `json:"status"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

type ErrorResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

func Success(c *gin.Context, message string, data interface{}) {
	c.JSON(http.StatusOK, SuccessResponse{
		Status:  "success",
		Message: message,
		Data:    data,
	})
}

func Created(c *gin.Context, message string, data interface{}) {
	c.JSON(http.StatusCreated, SuccessResponse{
		Status:  "success",
		Message: message,
		Data:    data,
	})
}

func Error(c *gin.Context, message string, statusCode int) {
	c.JSON(statusCode, ErrorResponse{
		Status:  "error",
		Message: message,
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

func HandleError(c *gin.Context, err error, message string, logger *zap.Logger) {
	if logger != nil {
		logger.Error(message, zap.Error(err))
	}
	c.JSON(http.StatusInternalServerError, ErrorResponse{
		Status:  "error",
		Message: message + ": " + err.Error(),
	})
}
