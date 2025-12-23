package api

import (
	"database/sql"
	"net/http"
	"time"

	"order-service/internal/kafka"
	"order-service/internal/metrics"
	"order-service/internal/models"
	"order-service/internal/saga"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/opentracing/opentracing-go"
	"go.uber.org/zap"
)

type Handler struct {
	db       *sql.DB
	producer *kafka.Producer
	saga     *saga.Orchestrator
	logger   *zap.Logger
}

func SetupRoutes(router *gin.Engine, db *sql.DB, producer *kafka.Producer, sagaOrch *saga.Orchestrator, logger *zap.Logger) {
	handler := &Handler{
		db:       db,
		producer: producer,
		saga:     sagaOrch,
		logger:   logger,
	}

	api := router.Group("/api/orders")
	{
		api.POST("", handler.CreateOrder)
		api.GET("/:id", handler.GetOrder)
		api.GET("", handler.ListOrders)
		api.GET("/:id/status", handler.GetOrderStatus)
	}
}

func (h *Handler) CreateOrder(c *gin.Context) {
	startTime := time.Now()
	
	span := opentracing.StartSpan("create_order")
	defer span.Finish()

	var req models.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		metrics.OrdersCreatedTotal.WithLabelValues("error").Inc()
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Calculate total amount
	var totalAmount float64
	for _, item := range req.Items {
		totalAmount += item.Price * float64(item.Quantity)
	}

	// Create order
	orderID := uuid.New()
	_, err := h.db.ExecContext(c.Request.Context(), `
		INSERT INTO orders (id, user_id, total_amount, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, orderID, req.UserID, totalAmount, models.OrderStatusPending, time.Now(), time.Now())

	if err != nil {
		h.logger.Error("Failed to create order", zap.Error(err))
		metrics.OrdersCreatedTotal.WithLabelValues("error").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}

	// Create order items
	for _, item := range req.Items {
		itemID := uuid.New()
		_, err = h.db.ExecContext(c.Request.Context(), `
			INSERT INTO order_items (id, order_id, product_id, quantity, price, created_at)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, itemID, orderID, item.ProductID, item.Quantity, item.Price, time.Now())

		if err != nil {
			h.logger.Error("Failed to create order item", zap.Error(err))
			metrics.OrdersCreatedTotal.WithLabelValues("error").Inc()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
			return
		}
	}

	// Create order object for saga
	order := &models.Order{
		ID:          orderID,
		UserID:      req.UserID,
		TotalAmount: totalAmount,
		Status:      models.OrderStatusPending,
		Items:       make([]models.OrderItem, 0),
	}

	for _, item := range req.Items {
		order.Items = append(order.Items, models.OrderItem{
			ProductID: item.ProductID,
			Quantity:  item.Quantity,
			Price:     item.Price,
		})
	}

	// Start saga
	sagaID, err := h.saga.StartSaga(c.Request.Context(), order)
	if err != nil {
		h.logger.Error("Failed to start saga", zap.Error(err))
		metrics.OrdersCreatedTotal.WithLabelValues("error").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process order"})
		return
	}

	// Record metrics
	metrics.OrdersCreatedTotal.WithLabelValues("success").Inc()
	metrics.OrderProcessingDuration.Observe(time.Since(startTime).Seconds())
	metrics.OrderValue.Observe(totalAmount)

	c.JSON(http.StatusCreated, gin.H{
		"order_id": orderID,
		"saga_id":  sagaID,
		"status":   models.OrderStatusPending,
		"message":  "Order created and processing started",
	})
}

func (h *Handler) GetOrder(c *gin.Context) {
	span := opentracing.StartSpan("get_order")
	defer span.Finish()

	orderID := c.Param("id")
	
	var order models.Order
	err := h.db.QueryRowContext(c.Request.Context(), `
		SELECT id, user_id, total_amount, status, created_at, updated_at
		FROM orders WHERE id = $1
	`, orderID).Scan(&order.ID, &order.UserID, &order.TotalAmount, &order.Status, &order.CreatedAt, &order.UpdatedAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	if err != nil {
		h.logger.Error("Failed to get order", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get order"})
		return
	}

	// Get order items
	rows, err := h.db.QueryContext(c.Request.Context(), `
		SELECT id, product_id, quantity, price, created_at
		FROM order_items WHERE order_id = $1
	`, orderID)

	if err != nil {
		h.logger.Error("Failed to get order items", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get order"})
		return
	}
	defer rows.Close()

	order.Items = make([]models.OrderItem, 0)
	for rows.Next() {
		var item models.OrderItem
		item.OrderID = order.ID
		err := rows.Scan(&item.ID, &item.ProductID, &item.Quantity, &item.Price, &item.CreatedAt)
		if err != nil {
			h.logger.Error("Failed to scan order item", zap.Error(err))
			continue
		}
		order.Items = append(order.Items, item)
	}

	c.JSON(http.StatusOK, order)
}

func (h *Handler) ListOrders(c *gin.Context) {
	span := opentracing.StartSpan("list_orders")
	defer span.Finish()

	userID := c.Query("user_id")
	
	query := `SELECT id, user_id, total_amount, status, created_at, updated_at FROM orders`
	args := make([]interface{}, 0)
	
	if userID != "" {
		query += " WHERE user_id = $1"
		args = append(args, userID)
	}
	
	query += " ORDER BY created_at DESC LIMIT 100"

	rows, err := h.db.QueryContext(c.Request.Context(), query, args...)
	if err != nil {
		h.logger.Error("Failed to list orders", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list orders"})
		return
	}
	defer rows.Close()

	orders := make([]models.Order, 0)
	for rows.Next() {
		var order models.Order
		err := rows.Scan(&order.ID, &order.UserID, &order.TotalAmount, &order.Status, &order.CreatedAt, &order.UpdatedAt)
		if err != nil {
			h.logger.Error("Failed to scan order", zap.Error(err))
			continue
		}
		orders = append(orders, order)
	}

	c.JSON(http.StatusOK, gin.H{"orders": orders, "count": len(orders)})
}

func (h *Handler) GetOrderStatus(c *gin.Context) {
	span := opentracing.StartSpan("get_order_status")
	defer span.Finish()

	orderID := c.Param("id")
	
	var status string
	var sagaID *uuid.UUID
	err := h.db.QueryRowContext(c.Request.Context(), `
		SELECT status, saga_id FROM orders WHERE id = $1
	`, orderID).Scan(&status, &sagaID)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	if err != nil {
		h.logger.Error("Failed to get order status", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get order status"})
		return
	}

	response := gin.H{
		"order_id": orderID,
		"status":   status,
	}

	if sagaID != nil {
		var sagaStatus string
		var currentStep string
		err = h.db.QueryRowContext(c.Request.Context(), `
			SELECT status, current_step FROM saga_state WHERE saga_id = $1
		`, sagaID).Scan(&sagaStatus, &currentStep)

		if err == nil {
			response["saga_status"] = sagaStatus
			response["current_step"] = currentStep
		}
	}

	c.JSON(http.StatusOK, response)
}
