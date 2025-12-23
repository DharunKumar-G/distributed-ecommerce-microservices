package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"inventory-service/internal/api"
	"inventory-service/internal/config"
	"inventory-service/internal/db"
	"inventory-service/internal/kafka"
	"inventory-service/internal/metrics"
	"inventory-service/internal/service"
	"inventory-service/internal/tracing"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
)

func main() {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	cfg := config.Load()

	closer := tracing.InitJaeger("inventory-service", cfg.JaegerAgentHost, cfg.JaegerAgentPort)
	defer closer.Close()

	database, err := db.NewPostgresDB(cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer database.Close()

	kafkaProducer := kafka.NewProducer(cfg.KafkaBrokers, logger)
	defer kafkaProducer.Close()

	redisClient := db.NewRedisClient(cfg.RedisHost)
	defer redisClient.Close()

	metrics.InitMetrics()

	inventoryService := service.NewInventoryService(database, kafkaProducer, redisClient, logger)

	// Start Kafka consumers
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go inventoryService.StartReserveConsumer(ctx)
	go inventoryService.StartRollbackConsumer(ctx)

	router := gin.Default()

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy"})
	})

	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	api.SetupRoutes(router, database, inventoryService, logger)

	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Port),
		Handler: router,
	}

	go func() {
		logger.Info("Starting Inventory Service", zap.Int("port", cfg.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server exited")
}
