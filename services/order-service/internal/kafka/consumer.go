package kafka

import (
	"context"
	"time"

	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

type Consumer struct {
	reader *kafka.Reader
	logger *zap.Logger
}

func NewConsumer(brokers []string, topic, groupID string, logger *zap.Logger) *Consumer {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        brokers,
		Topic:          topic,
		GroupID:        groupID,
		MinBytes:       10e3,
		MaxBytes:       10e6,
		CommitInterval: time.Second,
		StartOffset:    kafka.LastOffset,
	})

	return &Consumer{
		reader: reader,
		logger: logger,
	}
}

func (c *Consumer) Consume(ctx context.Context, handler func([]byte) error) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			msg, err := c.reader.FetchMessage(ctx)
			if err != nil {
				c.logger.Error("Failed to fetch message", zap.Error(err))
				continue
			}

			c.logger.Info("Message received",
				zap.String("topic", msg.Topic),
				zap.String("key", string(msg.Key)))

			if err := handler(msg.Value); err != nil {
				c.logger.Error("Failed to handle message", zap.Error(err))
			} else {
				if err := c.reader.CommitMessages(ctx, msg); err != nil {
					c.logger.Error("Failed to commit message", zap.Error(err))
				}
			}
		}
	}
}

func (c *Consumer) Close() error {
	return c.reader.Close()
}
