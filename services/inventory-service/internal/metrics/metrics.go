package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	InventoryOperations = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "inventory_operations_total",
			Help: "Total number of inventory operations",
		},
		[]string{"operation", "status"},
	)

	InventoryReserved = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "inventory_reserved_total",
			Help: "Total inventory reserved",
		},
		[]string{"product_id"},
	)

	InventoryReleased = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "inventory_released_total",
			Help: "Total inventory released",
		},
		[]string{"product_id"},
	)

	InventoryCommitted = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "inventory_committed_total",
			Help: "Total inventory committed",
		},
		[]string{"product_id"},
	)

	InventoryLevel = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "inventory_level",
			Help: "Current inventory level",
		},
		[]string{"product_id"},
	)

	ReservedInventoryLevel = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "reserved_inventory_level",
			Help: "Current reserved inventory level",
		},
		[]string{"product_id"},
	)
)

func InitMetrics() {
	InventoryOperations.WithLabelValues("reserve", "success")
	InventoryOperations.WithLabelValues("reserve", "error")
	InventoryOperations.WithLabelValues("release", "success")
	InventoryOperations.WithLabelValues("release", "error")
	InventoryOperations.WithLabelValues("commit", "success")
	InventoryOperations.WithLabelValues("commit", "error")
}
