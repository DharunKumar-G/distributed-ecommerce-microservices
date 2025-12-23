package models

import (
	"time"

	"github.com/google/uuid"
)

type Inventory struct {
	ID               uuid.UUID `json:"id"`
	ProductID        string    `json:"product_id"`
	Quantity         int       `json:"quantity"`
	ReservedQuantity int       `json:"reserved_quantity"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type ReservationRequest struct {
	ProductID string `json:"product_id"`
	Quantity  int    `json:"quantity"`
}

type SagaEvent struct {
	SagaID    string                 `json:"saga_id"`
	OrderID   string                 `json:"order_id"`
	Step      string                 `json:"step"`
	Success   bool                   `json:"success"`
	Message   string                 `json:"message"`
	Data      map[string]interface{} `json:"data"`
	Timestamp time.Time              `json:"timestamp"`
}

type OrderItem struct {
	ProductID string  `json:"product_id"`
	Quantity  int     `json:"quantity"`
	Price     float64 `json:"price"`
}
