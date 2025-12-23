package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"inventory-service/internal/kafka"
	"inventory-service/internal/metrics"
	"inventory-service/internal/models"

	"github.com/go-redis/redis/v8"
	"go.uber.org/zap"
)

type InventoryService struct {
	db       *sql.DB
	producer *kafka.Producer
	redis    *redis.Client
	logger   *zap.Logger
}

func NewInventoryService(db *sql.DB, producer *kafka.Producer, redis *redis.Client, logger *zap.Logger) *InventoryService {
	return &InventoryService{
		db:       db,
		producer: producer,
		redis:    redis,
		logger:   logger,
	}
}

// ReserveStock reserves inventory for an order
func (s *InventoryService) ReserveStock(ctx context.Context, items []models.OrderItem) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, item := range items {
		var available int
		err := tx.QueryRowContext(ctx, `
			SELECT quantity - reserved_quantity 
			FROM inventory 
			WHERE product_id = $1 
			FOR UPDATE
		`, item.ProductID).Scan(&available)

		if err == sql.ErrNoRows {
			return fmt.Errorf("product %s not found", item.ProductID)
		}

		if err != nil {
			return err
		}

		if available < item.Quantity {
			return fmt.Errorf("insufficient stock for product %s: available=%d, requested=%d",
				item.ProductID, available, item.Quantity)
		}

		// Reserve the stock
		_, err = tx.ExecContext(ctx, `
			UPDATE inventory 
			SET reserved_quantity = reserved_quantity + $1,
			    updated_at = $2
			WHERE product_id = $3
		`, item.Quantity, time.Now(), item.ProductID)

		if err != nil {
			return err
		}

		metrics.InventoryReserved.WithLabelValues(item.ProductID).Add(float64(item.Quantity))
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	metrics.InventoryOperations.WithLabelValues("reserve", "success").Inc()
	return nil
}

// ReleaseStock releases reserved inventory
func (s *InventoryService) ReleaseStock(ctx context.Context, items []models.OrderItem) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, item := range items {
		_, err = tx.ExecContext(ctx, `
			UPDATE inventory 
			SET reserved_quantity = reserved_quantity - $1,
			    updated_at = $2
			WHERE product_id = $3
		`, item.Quantity, time.Now(), item.ProductID)

		if err != nil {
			s.logger.Error("Failed to release stock",
				zap.String("product_id", item.ProductID),
				zap.Error(err))
			return err
		}

		metrics.InventoryReleased.WithLabelValues(item.ProductID).Add(float64(item.Quantity))
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	metrics.InventoryOperations.WithLabelValues("release", "success").Inc()
	return nil
}

// CommitReservedStock commits reserved stock (deducts from total)
func (s *InventoryService) CommitReservedStock(ctx context.Context, items []models.OrderItem) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, item := range items {
		_, err = tx.ExecContext(ctx, `
			UPDATE inventory 
			SET quantity = quantity - $1,
			    reserved_quantity = reserved_quantity - $1,
			    updated_at = $2
			WHERE product_id = $3
		`, item.Quantity, time.Now(), item.ProductID)

		if err != nil {
			return err
		}

		metrics.InventoryCommitted.WithLabelValues(item.ProductID).Add(float64(item.Quantity))
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	metrics.InventoryOperations.WithLabelValues("commit", "success").Inc()
	return nil
}

// GetInventory returns inventory for a product
func (s *InventoryService) GetInventory(ctx context.Context, productID string) (*models.Inventory, error) {
	var inv models.Inventory
	err := s.db.QueryRowContext(ctx, `
		SELECT id, product_id, quantity, reserved_quantity, created_at, updated_at
		FROM inventory
		WHERE product_id = $1
	`, productID).Scan(&inv.ID, &inv.ProductID, &inv.Quantity, &inv.ReservedQuantity, &inv.CreatedAt, &inv.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("inventory not found for product %s", productID)
	}

	if err != nil {
		return nil, err
	}

	return &inv, nil
}

// StartReserveConsumer listens for inventory reservation requests
func (s *InventoryService) StartReserveConsumer(ctx context.Context) {
	consumer := kafka.NewConsumer(
		[]string{"kafka:9092"},
		"inventory-reserve",
		"inventory-service-reserve",
		s.logger,
	)
	defer consumer.Close()

	handler := func(data []byte) error {
		var event models.SagaEvent
		if err := json.Unmarshal(data, &event); err != nil {
			return err
		}

		s.logger.Info("Processing inventory reservation",
			zap.String("saga_id", event.SagaID),
			zap.String("order_id", event.OrderID))

		// Extract items from event data
		itemsData, ok := event.Data["items"].([]interface{})
		if !ok {
			return fmt.Errorf("invalid items data")
		}

		items := make([]models.OrderItem, 0)
		for _, itemData := range itemsData {
			itemMap := itemData.(map[string]interface{})
			items = append(items, models.OrderItem{
				ProductID: itemMap["product_id"].(string),
				Quantity:  int(itemMap["quantity"].(float64)),
				Price:     itemMap["price"].(float64),
			})
		}

		// Reserve stock
		err := s.ReserveStock(ctx, items)

		// Send response
		responseEvent := models.SagaEvent{
			SagaID:    event.SagaID,
			OrderID:   event.OrderID,
			Step:      "INVENTORY_RESERVED",
			Success:   err == nil,
			Timestamp: time.Now(),
		}

		if err != nil {
			responseEvent.Message = fmt.Sprintf("Failed to reserve inventory: %s", err.Error())
			metrics.InventoryOperations.WithLabelValues("reserve", "error").Inc()
		} else {
			responseEvent.Message = "Inventory reserved successfully"
		}

		return s.producer.PublishMessage(ctx, "saga-response", event.SagaID, responseEvent)
	}

	if err := consumer.Consume(ctx, handler); err != nil {
		s.logger.Error("Reserve consumer error", zap.Error(err))
	}
}

// StartRollbackConsumer listens for inventory rollback requests
func (s *InventoryService) StartRollbackConsumer(ctx context.Context) {
	consumer := kafka.NewConsumer(
		[]string{"kafka:9092"},
		"inventory-rollback",
		"inventory-service-rollback",
		s.logger,
	)
	defer consumer.Close()

	handler := func(data []byte) error {
		var event models.SagaEvent
		if err := json.Unmarshal(data, &event); err != nil {
			return err
		}

		s.logger.Info("Processing inventory rollback",
			zap.String("saga_id", event.SagaID),
			zap.String("order_id", event.OrderID))

		// Get items from order
		itemsData, ok := event.Data["items"].([]interface{})
		if !ok {
			s.logger.Error("Invalid items data for rollback")
			return fmt.Errorf("invalid items data")
		}

		items := make([]models.OrderItem, 0)
		for _, itemData := range itemsData {
			itemMap := itemData.(map[string]interface{})
			items = append(items, models.OrderItem{
				ProductID: itemMap["product_id"].(string),
				Quantity:  int(itemMap["quantity"].(float64)),
				Price:     itemMap["price"].(float64),
			})
		}

		// Release reserved stock
		err := s.ReleaseStock(ctx, items)
		if err != nil {
			s.logger.Error("Failed to rollback inventory", zap.Error(err))
			metrics.InventoryOperations.WithLabelValues("rollback", "error").Inc()
		} else {
			s.logger.Info("Inventory rollback successful")
			metrics.InventoryOperations.WithLabelValues("rollback", "success").Inc()
		}

		return err
	}

	if err := consumer.Consume(ctx, handler); err != nil {
		s.logger.Error("Rollback consumer error", zap.Error(err))
	}
}
