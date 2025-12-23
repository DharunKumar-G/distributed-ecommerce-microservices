package kafka

import (
	"context"
	"encoding/json"
	"time"

	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

type Producer struct {
	writer *kafka.Writer
	logger *zap.Logger
}

func NewProducer(brokers []string, logger *zap.Logger) *Producer {
	writer := &kafka.Writer{
		Addr:         kafka.TCP(brokers...),
		Balancer:     &kafka.LeastBytes{},
		BatchSize:    100,
		BatchTimeout: 10 * time.Millisecond,
		Async:        false,
	}

	return &Producer{
		writer: writer,
		logger: logger,
	}
}

func (p *Producer) PublishMessage(ctx context.Context, topic string, key string, value interface{}) error {
	data, err := json.Marshal(value)
	if err != nil {
		p.logger.Error("Failed to marshal message", zap.Error(err))
		return err
	}

	msg := kafka.Message{
		Topic: topic,
		Key:   []byte(key),
		Value: data,
		Time:  time.Now(),
	}

	err = p.writer.WriteMessages(ctx, msg)
	if err != nil {
		p.logger.Error("Failed to publish message",
			zap.String("topic", topic),
			zap.Error(err))
		return err
	}

	p.logger.Info("Message published",
		zap.String("topic", topic),
		zap.String("key", key))

	return nil
}

func (p *Producer) Close() error {
	return p.writer.Close()
}
