package models

import (
	"time"

	"github.com/google/uuid"
)

type SagaState struct {
	SagaID      uuid.UUID  `json:"saga_id"`
	OrderID     uuid.UUID  `json:"order_id"`
	CurrentStep SagaStep   `json:"current_step"`
	Status      SagaStatus `json:"status"`
	Payload     string     `json:"payload"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type SagaStep string

const (
	StepInitiated          SagaStep = "INITIATED"
	StepInventoryReserved  SagaStep = "INVENTORY_RESERVED"
	StepPaymentProcessed   SagaStep = "PAYMENT_PROCESSED"
	StepOrderCompleted     SagaStep = "ORDER_COMPLETED"
	StepInventoryRollback  SagaStep = "INVENTORY_ROLLBACK"
	StepPaymentRollback    SagaStep = "PAYMENT_ROLLBACK"
)

type SagaStatus string

const (
	SagaStatusInProgress SagaStatus = "IN_PROGRESS"
	SagaStatusCompleted  SagaStatus = "COMPLETED"
	SagaStatusFailed     SagaStatus = "FAILED"
	SagaStatusRolledBack SagaStatus = "ROLLED_BACK"
)

type SagaEvent struct {
	SagaID    string                 `json:"saga_id"`
	OrderID   string                 `json:"order_id"`
	Step      SagaStep               `json:"step"`
	Success   bool                   `json:"success"`
	Message   string                 `json:"message"`
	Data      map[string]interface{} `json:"data"`
	Timestamp time.Time              `json:"timestamp"`
}
