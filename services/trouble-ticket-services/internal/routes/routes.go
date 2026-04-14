package routes

import (
	"time"
	"trouble-ticket-services/internal/config"
	"trouble-ticket-services/internal/handlers"
	"trouble-ticket-services/internal/utils"

	"github.com/gin-gonic/gin"
)

var appStartTime = time.Now()

func SetupRoutes(r *gin.Engine) {
	// Health check
	r.GET("/health", func(c *gin.Context) {
		uptimeSeconds := time.Since(appStartTime).Seconds()
		c.JSON(200, gin.H{
			"status":         "ok",
			"timestamp":      time.Now().Format(time.RFC3339),
			"uptime":         uptimeSeconds,
			"uptimeReadable": utils.FormatUptime(uptimeSeconds),
		})
	})

	api := r.Group(config.App.App.APIPrefix)

	// Master data routes
	typeTicketHandler := handlers.NewTypeTicketHandler()
	typeTickets := api.Group("/type-ticket")
	{
		typeTickets.GET("", typeTicketHandler.GetAll)
		typeTickets.GET("/:id", typeTicketHandler.GetByID)
		typeTickets.POST("", typeTicketHandler.Create)
		typeTickets.PUT("/:id", typeTicketHandler.Update)
		typeTickets.DELETE("/:id", typeTicketHandler.Delete)
	}

	problemMasterHandler := handlers.NewProblemMasterHandler()
	problemMasters := api.Group("/problem-master")
	{
		problemMasters.GET("", problemMasterHandler.GetAll)
		problemMasters.GET("/:id", problemMasterHandler.GetByID)
		problemMasters.POST("", problemMasterHandler.Create)
		problemMasters.PUT("/:id", problemMasterHandler.Update)
		problemMasters.DELETE("/:id", problemMasterHandler.Delete)
	}

	picHandler := handlers.NewPicHandler()
	pics := api.Group("/pic")
	{
		pics.GET("", picHandler.GetAll)
		pics.GET("/:id", picHandler.GetByID)
		pics.POST("", picHandler.Create)
		pics.PUT("/:id", picHandler.Update)
		pics.DELETE("/:id", picHandler.Delete)
	}

	// Trouble ticket routes
	ttHandler := handlers.NewTroubleTicketHandler()
	tt := api.Group("/trouble-ticket")
	{
		tt.POST("", ttHandler.Create)
		tt.GET("", ttHandler.GetAll)
		// Static paths must be registered before wildcard /:ticketNumber
		tt.GET("/refresh", ttHandler.Refresh)
		tt.GET("/export", ttHandler.ExportExcel)
		tt.GET("/progress/:ticketNumber", ttHandler.GetProgress)
		tt.PUT("/progress/:ticketNumber", ttHandler.AddProgress)
		tt.PUT("/progress/:ticketNumber/:progressId", ttHandler.UpdateProgress)
		tt.DELETE("/progress/:ticketNumber/:progressId", ttHandler.DeleteProgress)
		tt.PUT("/status/:ticketNumber", ttHandler.UpdateStatus)
		tt.PUT("/close/:ticketNumber", ttHandler.CloseTicket)
		tt.PUT("/:ticketNumber", ttHandler.UpdateTicket)
		tt.DELETE("/:ticketNumber", ttHandler.DeleteTicket)
	}
}
