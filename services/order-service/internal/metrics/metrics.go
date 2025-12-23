package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	OrdersCreatedTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "orders_created_total",
			Help: "Total number of orders created",
		},
		[]string{"status"},
	)

	OrderProcessingDuration = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "order_processing_duration_seconds",
			Help:    "Duration of order processing",
			Buckets: prometheus.DefBuckets,
		},
	)

	OrderValue = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "order_value",
			Help:    "Order value distribution",
			Buckets: []float64{10, 50, 100, 500, 1000, 5000, 10000},
		},
	)

	SagaExecutionDuration = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "saga_execution_duration_seconds",
			Help:    "Duration of saga execution",
			Buckets: prometheus.DefBuckets,
		},
	)

	SagaStepsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "saga_steps_total",
			Help: "Total number of saga steps executed",
		},
		[]string{"step", "status"},
	)

	ActiveOrders = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "active_orders",
			Help: "Number of active orders",
		},
	)
)

func InitMetrics() {
	// Initialize metrics with default values
	OrdersCreatedTotal.WithLabelValues("success")
	OrdersCreatedTotal.WithLabelValues("error")
	ActiveOrders.Set(0)
}
