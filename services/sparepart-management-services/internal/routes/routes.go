package routes

import (
	"sparepart-management-services/internal/config"
	"sparepart-management-services/internal/handlers"
	"sparepart-management-services/internal/utils"
	"time"

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

	// API prefix routes
	api := r.Group(config.App.App.APIPrefix)
	// Sparepart routes group
	sparepartApi := api.Group("/sparepart")
	{
		// Location routes
		locationHandler := handlers.NewLocationHandler()
		locations := sparepartApi.Group("/location")
		{
			locations.GET("", locationHandler.GetAll)
			locations.GET("/:id", locationHandler.GetByID)
			locations.POST("", locationHandler.Create)
			locations.PUT("/:id", locationHandler.Update)
			locations.DELETE("/:id", locationHandler.Delete)
		}

		// Contact Person routes
		contactPersonHandler := handlers.NewContactPersonHandler()
		contactPersons := sparepartApi.Group("/contact-person")
		{
			contactPersons.GET("", contactPersonHandler.GetAll)
			contactPersons.GET("/:id", contactPersonHandler.GetByID)
			contactPersons.POST("", contactPersonHandler.Create)
			contactPersons.PUT("/:id", contactPersonHandler.Update)
			contactPersons.DELETE("/:id", contactPersonHandler.Delete)
		}

		// Sparepart Master routes
		sparepartMasterHandler := handlers.NewSparepartMasterHandler()
		sparepartMasters := sparepartApi.Group("/master")
		{
			sparepartMasters.GET("", sparepartMasterHandler.GetAll)
			sparepartMasters.GET("/:id", sparepartMasterHandler.GetByID)
			sparepartMasters.POST("", sparepartMasterHandler.Create)
			sparepartMasters.PUT("/:id", sparepartMasterHandler.Update)
			sparepartMasters.DELETE("/:id", sparepartMasterHandler.Delete)
		}

		// Sparepart Stock routes
		sparepartStockHandler := handlers.NewSparepartStockHandler()
		sparepartStocks := sparepartApi.Group("/stock")
		{
			sparepartStocks.GET("", sparepartStockHandler.GetAll)
			sparepartStocks.GET("/:id", sparepartStockHandler.GetByID)
			sparepartStocks.POST("", sparepartStockHandler.Create)
			sparepartStocks.PUT("/:id", sparepartStockHandler.Update)
			sparepartStocks.DELETE("/:id", sparepartStockHandler.Delete)
			sparepartStocks.GET("/export/pdf", sparepartStockHandler.ExportPDF)
			sparepartStocks.GET("/export/excel", sparepartStockHandler.ExportExcel)
			sparepartStocks.POST("/:id/photos", sparepartStockHandler.AddPhotos)
			sparepartStocks.PUT("/:id/photos/:photo_index", sparepartStockHandler.UpdatePhoto)
			sparepartStocks.DELETE("/:id/photos/:photo_index", sparepartStockHandler.DeletePhoto)
		}

		// Tools Alker routes
		toolsAlkerHandler := handlers.NewToolsAlkerHandler()
		toolsAlkers := sparepartApi.Group("/tools-alker")
		{
			toolsAlkers.GET("", toolsAlkerHandler.GetAll)
			toolsAlkers.GET("/:id", toolsAlkerHandler.GetByID)
			toolsAlkers.POST("", toolsAlkerHandler.Create)
			toolsAlkers.PUT("/:id", toolsAlkerHandler.Update)
			toolsAlkers.DELETE("/:id", toolsAlkerHandler.Delete)
			toolsAlkers.GET("/export/pdf", toolsAlkerHandler.ExportPDF)
			toolsAlkers.GET("/export/excel", toolsAlkerHandler.ExportExcel)
			toolsAlkers.PUT("/:id/photos/:photo_index", toolsAlkerHandler.UpdatePhoto)
		}
	}
}
