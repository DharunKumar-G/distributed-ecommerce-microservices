package api

import (
	"database/sql"
	"net/http"

	"inventory-service/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/opentracing/opentracing-go"
	"go.uber.org/zap"
)

type Handler struct {
	db      *sql.DB
	service *service.InventoryService
	logger  *zap.Logger
}

func SetupRoutes(router *gin.Engine, db *sql.DB, service *service.InventoryService, logger *zap.Logger) {
	handler := &Handler{
		db:      db,
		service: service,
		logger:  logger,
	}

	api := router.Group("/api/inventory")
	{
		api.GET("/:product_id", handler.GetInventory)
		api.GET("", handler.ListInventory)
	}
}

func (h *Handler) GetInventory(c *gin.Context) {
	span := opentracing.StartSpan("get_inventory")
	defer span.Finish()

	productID := c.Param("product_id")

	inv, err := h.service.GetInventory(c.Request.Context(), productID)
	if err != nil {
		h.logger.Error("Failed to get inventory", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Inventory not found"})
		return
	}

	c.JSON(http.StatusOK, inv)
}

func (h *Handler) ListInventory(c *gin.Context) {
	span := opentracing.StartSpan("list_inventory")
	defer span.Finish()

	rows, err := h.db.QueryContext(c.Request.Context(), `
		SELECT id, product_id, quantity, reserved_quantity, created_at, updated_at
		FROM inventory
		ORDER BY product_id
		LIMIT 100
	`)

	if err != nil {
		h.logger.Error("Failed to list inventory", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list inventory"})
		return
	}
	defer rows.Close()

	type InventoryItem struct {
		ID               string `json:"id"`
		ProductID        string `json:"product_id"`
		Quantity         int    `json:"quantity"`
		ReservedQuantity int    `json:"reserved_quantity"`
		Available        int    `json:"available"`
		CreatedAt        string `json:"created_at"`
		UpdatedAt        string `json:"updated_at"`
	}

	items := make([]InventoryItem, 0)
	for rows.Next() {
		var item InventoryItem
		err := rows.Scan(&item.ID, &item.ProductID, &item.Quantity, &item.ReservedQuantity, &item.CreatedAt, &item.UpdatedAt)
		if err != nil {
			h.logger.Error("Failed to scan inventory", zap.Error(err))
			continue
		}
		item.Available = item.Quantity - item.ReservedQuantity
		items = append(items, item)
	}

	c.JSON(http.StatusOK, gin.H{"inventory": items, "count": len(items)})
}
