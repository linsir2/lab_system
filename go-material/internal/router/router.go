package router

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"lab/material/internal/handler"
)

func NewRouter(h *handler.MaterialHandler) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	materials := r.Group("/materials")
	{
		materials.GET("", h.List)
		materials.POST("", h.Create)
		materials.GET("/:id", h.Get)
		materials.PUT("/:id", h.Update)
		materials.DELETE("/:id", h.Delete)
		materials.POST("/:id/deduct", h.Deduct)
		materials.POST("/:id/restore", h.Restore)
	}
	return r
}
