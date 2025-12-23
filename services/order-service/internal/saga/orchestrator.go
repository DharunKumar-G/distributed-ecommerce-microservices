package saga

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"order-service/internal/kafka"
	"order-service/internal/models"

	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type Orchestrator struct {
	db       *sql.DB
	producer *kafka.Producer
	redis    *redis.Client
	logger   *zap.Logger
}

func NewOrchestrator(db *sql.DB, producer *kafka.Producer, redis *redis.Client, logger *zap.Logger) *Orchestrator {
	return &Orchestrator{
		db:       db,
		producer: producer,
		redis:    redis,
		logger:   logger,
	}
}

// StartSaga initiates a new saga for order processing
func (o *Orchestrator) StartSaga(ctx context.Context, order *models.Order) (*uuid.UUID, error) {
	sagaID := uuid.New()
	
	// Create saga state
	payload, _ := json.Marshal(order)
	_, err := o.db.ExecContext(ctx, `
		INSERT INTO saga_state (saga_id, order_id, current_step, status, payload)
		VALUES ($1, $2, $3, $4, $5)
	`, sagaID, order.ID, models.StepInitiated, models.SagaStatusInProgress, string(payload))

	if err != nil {
		o.logger.Error("Failed to create saga state", zap.Error(err))
		return nil, err
	}

	// Update order with saga ID
	_, err = o.db.ExecContext(ctx, `
		UPDATE orders SET saga_id = $1 WHERE id = $2
	`, sagaID, order.ID)

	if err != nil {
		o.logger.Error("Failed to update order with saga ID", zap.Error(err))
		return nil, err
	}

	// Step 1: Reserve inventory
	err = o.reserveInventory(ctx, sagaID, order)
	if err != nil {
		o.logger.Error("Failed to initiate inventory reservation", zap.Error(err))
		return nil, err
	}

	o.logger.Info("Saga started", zap.String("saga_id", sagaID.String()))

	return &sagaID, nil
}

func (o *Orchestrator) reserveInventory(ctx context.Context, sagaID uuid.UUID, order *models.Order) error {
	event := models.SagaEvent{
		SagaID:    sagaID.String(),
		OrderID:   order.ID.String(),
		Step:      models.StepInventoryReserved,
		Success:   true,
		Message:   "Reserve inventory request",
		Data: map[string]interface{}{
			"items": order.Items,
		},
		Timestamp: time.Now(),
	}

	return o.producer.PublishMessage(ctx, "inventory-reserve", sagaID.String(), event)
}

func (o *Orchestrator) processPayment(ctx context.Context, sagaID uuid.UUID, order *models.Order) error {
	event := models.SagaEvent{
		SagaID:    sagaID.String(),
		OrderID:   order.ID.String(),
		Step:      models.StepPaymentProcessed,
		Success:   true,
		Message:   "Process payment request",
		Data: map[string]interface{}{
			"user_id":      order.UserID,
			"total_amount": order.TotalAmount,
		},
		Timestamp: time.Now(),
	}

	return o.producer.PublishMessage(ctx, "payment-process", sagaID.String(), event)
}

func (o *Orchestrator) completeOrder(ctx context.Context, sagaID uuid.UUID, orderID uuid.UUID) error {
	// Update order status
	_, err := o.db.ExecContext(ctx, `
		UPDATE orders SET status = $1, updated_at = $2 WHERE id = $3
	`, models.OrderStatusConfirmed, time.Now(), orderID)

	if err != nil {
		return err
	}

	// Update saga state
	_, err = o.db.ExecContext(ctx, `
		UPDATE saga_state SET current_step = $1, status = $2, updated_at = $3 
		WHERE saga_id = $4
	`, models.StepOrderCompleted, models.SagaStatusCompleted, time.Now(), sagaID)

	if err != nil {
		return err
	}

	// Publish order completed event
	event := models.SagaEvent{
		SagaID:    sagaID.String(),
		OrderID:   orderID.String(),
		Step:      models.StepOrderCompleted,
		Success:   true,
		Message:   "Order completed successfully",
		Timestamp: time.Now(),
	}

	return o.producer.PublishMessage(ctx, "order-completed", orderID.String(), event)
}

func (o *Orchestrator) rollbackSaga(ctx context.Context, sagaID uuid.UUID, orderID uuid.UUID, failedStep models.SagaStep) error {
	o.logger.Warn("Rolling back saga",
		zap.String("saga_id", sagaID.String()),
		zap.String("failed_step", string(failedStep)))

	// Rollback based on failed step
	switch failedStep {
	case models.StepPaymentProcessed:
		// Rollback inventory
		o.rollbackInventory(ctx, sagaID, orderID)
	case models.StepInventoryReserved:
		// Nothing to rollback
	}

	// Update order status
	_, err := o.db.ExecContext(ctx, `
		UPDATE orders SET status = $1, updated_at = $2 WHERE id = $3
	`, models.OrderStatusFailed, time.Now(), orderID)

	if err != nil {
		return err
	}

	// Update saga state
	_, err = o.db.ExecContext(ctx, `
		UPDATE saga_state SET status = $1, updated_at = $2 WHERE saga_id = $3
	`, models.SagaStatusRolledBack, time.Now(), sagaID)

	return err
}

func (o *Orchestrator) rollbackInventory(ctx context.Context, sagaID uuid.UUID, orderID uuid.UUID) error {
	event := models.SagaEvent{
		SagaID:    sagaID.String(),
		OrderID:   orderID.String(),
		Step:      models.StepInventoryRollback,
		Success:   true,
		Message:   "Rollback inventory request",
		Timestamp: time.Now(),
	}

	return o.producer.PublishMessage(ctx, "inventory-rollback", sagaID.String(), event)
}

// StartSagaResponseConsumer listens for saga step responses
func (o *Orchestrator) StartSagaResponseConsumer(ctx context.Context) {
	consumer := kafka.NewConsumer(
		[]string{"kafka:9092"},
		"saga-response",
		"order-service-saga",
		o.logger,
	)
	defer consumer.Close()

	handler := func(data []byte) error {
		var event models.SagaEvent
		if err := json.Unmarshal(data, &event); err != nil {
			return err
		}

		return o.handleSagaResponse(ctx, &event)
	}

	if err := consumer.Consume(ctx, handler); err != nil {
		o.logger.Error("Saga consumer error", zap.Error(err))
	}
}

func (o *Orchestrator) handleSagaResponse(ctx context.Context, event *models.SagaEvent) error {
	sagaID, err := uuid.Parse(event.SagaID)
	if err != nil {
		return err
	}

	orderID, err := uuid.Parse(event.OrderID)
	if err != nil {
		return err
	}

	o.logger.Info("Handling saga response",
		zap.String("saga_id", event.SagaID),
		zap.String("step", string(event.Step)),
		zap.Bool("success", event.Success))

	if !event.Success {
		return o.rollbackSaga(ctx, sagaID, orderID, event.Step)
	}

	// Get order details
	var order models.Order
	var payload string
	err = o.db.QueryRowContext(ctx, `
		SELECT o.id, o.user_id, o.total_amount, o.status, s.payload
		FROM orders o
		JOIN saga_state s ON o.saga_id = s.saga_id
		WHERE s.saga_id = $1
	`, sagaID).Scan(&order.ID, &order.UserID, &order.TotalAmount, &order.Status, &payload)

	if err != nil {
		return err
	}

	json.Unmarshal([]byte(payload), &order)

	// Process next step based on current step
	switch event.Step {
	case models.StepInventoryReserved:
		// Update saga state
		_, err = o.db.ExecContext(ctx, `
			UPDATE saga_state SET current_step = $1, updated_at = $2 
			WHERE saga_id = $3
		`, models.StepInventoryReserved, time.Now(), sagaID)
		
		if err != nil {
			return err
		}
		
		// Next: Process payment
		return o.processPayment(ctx, sagaID, &order)

	case models.StepPaymentProcessed:
		// Update saga state
		_, err = o.db.ExecContext(ctx, `
			UPDATE saga_state SET current_step = $1, updated_at = $2 
			WHERE saga_id = $3
		`, models.StepPaymentProcessed, time.Now(), sagaID)
		
		if err != nil {
			return err
		}
		
		// Final: Complete order
		return o.completeOrder(ctx, sagaID, orderID)
	}

	return nil
}
