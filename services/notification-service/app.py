import os
import json
import logging
import threading
from datetime import datetime
from flask import Flask, jsonify, request
from kafka import KafkaConsumer
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
import redis
from opentracing.ext import tags
from jaeger_client import Config
from pythonjsonlogger import jsonlogger

# Initialize Flask app
app = Flask(__name__)

# Configure logging
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
logHandler.setFormatter(formatter)
logger = logging.getLogger()
logger.addHandler(logHandler)
logger.setLevel(logging.INFO)

# Configuration
KAFKA_BROKERS = os.getenv('KAFKA_BROKERS', 'localhost:9092').split(',')
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', '6379'))
JAEGER_AGENT_HOST = os.getenv('JAEGER_AGENT_HOST', 'localhost')
JAEGER_AGENT_PORT = int(os.getenv('JAEGER_AGENT_PORT', '6831'))
PORT = int(os.getenv('PORT', '8085'))

# Initialize Redis
redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

# Initialize Jaeger tracer
config = Config(
    config={
        'sampler': {'type': 'const', 'param': 1},
        'local_agent': {
            'reporting_host': JAEGER_AGENT_HOST,
            'reporting_port': JAEGER_AGENT_PORT,
        },
        'logging': True,
    },
    service_name='notification-service',
    validate=True,
)
tracer = config.initialize_tracer()

# Prometheus metrics
notifications_sent = Counter(
    'notifications_sent_total',
    'Total number of notifications sent',
    ['type', 'status']
)

notification_processing_duration = Histogram(
    'notification_processing_duration_seconds',
    'Time spent processing notifications',
    ['type']
)

kafka_messages_consumed = Counter(
    'kafka_messages_consumed_total',
    'Total number of Kafka messages consumed',
    ['topic']
)


class NotificationService:
    def __init__(self):
        self.notification_handlers = {
            'order-completed': self.handle_order_completed,
            'payment-processed': self.handle_payment_processed,
            'inventory-updated': self.handle_inventory_updated,
            'saga-response': self.handle_saga_response,
        }

    def send_email(self, to, subject, body):
        """Simulate sending email notification"""
        logger.info(f"Sending email to {to}: {subject}")
        # In production, integrate with SendGrid, AWS SES, etc.
        notification_data = {
            'type': 'email',
            'to': to,
            'subject': subject,
            'body': body,
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'sent'
        }
        
        # Store in Redis for tracking
        key = f"notification:email:{datetime.utcnow().timestamp()}"
        redis_client.setex(key, 86400, json.dumps(notification_data))
        
        notifications_sent.labels(type='email', status='success').inc()
        return notification_data

    def send_sms(self, to, message):
        """Simulate sending SMS notification"""
        logger.info(f"Sending SMS to {to}: {message}")
        # In production, integrate with Twilio, AWS SNS, etc.
        notification_data = {
            'type': 'sms',
            'to': to,
            'message': message,
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'sent'
        }
        
        key = f"notification:sms:{datetime.utcnow().timestamp()}"
        redis_client.setex(key, 86400, json.dumps(notification_data))
        
        notifications_sent.labels(type='sms', status='success').inc()
        return notification_data

    def send_push_notification(self, user_id, title, body, data=None):
        """Simulate sending push notification"""
        logger.info(f"Sending push notification to user {user_id}: {title}")
        # In production, integrate with Firebase, OneSignal, etc.
        notification_data = {
            'type': 'push',
            'user_id': user_id,
            'title': title,
            'body': body,
            'data': data or {},
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'sent'
        }
        
        key = f"notification:push:{datetime.utcnow().timestamp()}"
        redis_client.setex(key, 86400, json.dumps(notification_data))
        
        notifications_sent.labels(type='push', status='success').inc()
        return notification_data

    def handle_order_completed(self, event):
        """Handle order completed event"""
        with tracer.start_span('handle_order_completed') as span:
            span.set_tag(tags.SPAN_KIND, tags.SPAN_KIND_CONSUMER)
            
            order_id = event.get('order_id')
            user_id = event.get('data', {}).get('user_id', 'unknown')
            
            logger.info(f"Processing order completed notification for order {order_id}")
            
            # Send email
            self.send_email(
                to=f"{user_id}@example.com",
                subject=f"Order {order_id} Confirmed",
                body=f"Your order {order_id} has been successfully confirmed and is being processed."
            )
            
            # Send push notification
            self.send_push_notification(
                user_id=user_id,
                title="Order Confirmed",
                body=f"Your order {order_id} is confirmed!",
                data={'order_id': order_id}
            )
            
            # Send SMS (optional)
            self.send_sms(
                to=f"+1234567890",  # Would get from user profile
                message=f"Order {order_id} confirmed. Track your order in the app."
            )

    def handle_payment_processed(self, event):
        """Handle payment processed event"""
        with tracer.start_span('handle_payment_processed') as span:
            span.set_tag(tags.SPAN_KIND, tags.SPAN_KIND_CONSUMER)
            
            payment_id = event.get('data', {}).get('payment_id')
            user_id = event.get('data', {}).get('user_id', 'unknown')
            
            logger.info(f"Processing payment notification for payment {payment_id}")
            
            self.send_email(
                to=f"{user_id}@example.com",
                subject="Payment Received",
                body=f"Your payment (ID: {payment_id}) has been successfully processed."
            )

    def handle_inventory_updated(self, event):
        """Handle inventory updated event"""
        with tracer.start_span('handle_inventory_updated') as span:
            span.set_tag(tags.SPAN_KIND, tags.SPAN_KIND_CONSUMER)
            
            product_id = event.get('product_id')
            quantity = event.get('quantity')
            
            logger.info(f"Processing inventory update notification for product {product_id}")
            
            # Notify if stock is low
            if quantity < 10:
                self.send_push_notification(
                    user_id='admin',
                    title="Low Stock Alert",
                    body=f"Product {product_id} has low stock: {quantity} remaining",
                    data={'product_id': product_id, 'quantity': quantity}
                )
    
    def handle_saga_response(self, event):
        """Handle saga response events"""
        with tracer.start_span('handle_saga_response') as span:
            span.set_tag(tags.SPAN_KIND, tags.SPAN_KIND_CONSUMER)
            
            saga_id = event.get('saga_id')
            order_id = event.get('order_id')
            step = event.get('step')
            success = event.get('success', False)
            message = event.get('message', '')
            
            logger.info(f"Processing saga response for order {order_id}: step={step}, success={success}")
            
            # Store saga event in Redis for the UI to display
            saga_key = f"saga:events:{order_id}"
            redis_client.lpush(saga_key, json.dumps({
                'saga_id': saga_id,
                'step': step,
                'success': success,
                'message': message,
                'timestamp': event.get('timestamp', datetime.utcnow().isoformat())
            }))
            redis_client.expire(saga_key, 86400)  # Expire after 24 hours
            
            # Send notifications based on saga step
            if step == 'COMPLETED' and success:
                self.send_push_notification(
                    user_id='user',
                    title="Order Completed! 🎉",
                    body=f"Your order {order_id} has been successfully processed!",
                    data={'order_id': order_id, 'saga_id': saga_id}
                )
            elif not success:
                # Saga step failed
                self.send_push_notification(
                    user_id='user',
                    title="Order Update",
                    body=f"Order {order_id}: {message}",
                    data={'order_id': order_id, 'step': step, 'error': message}
                )


# Initialize notification service
notification_service = NotificationService()


def consume_kafka_events():
    """Kafka consumer thread"""
    consumer = KafkaConsumer(
        'order-completed',
        'payment-processed',
        'inventory-updated',
        'saga-response',
        bootstrap_servers=KAFKA_BROKERS,
        group_id='notification-service-group',
        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
        auto_offset_reset='latest',
        enable_auto_commit=True
    )

    logger.info("Kafka consumer started")

    for message in consumer:
        try:
            with notification_processing_duration.labels(type=message.topic).time():
                kafka_messages_consumed.labels(topic=message.topic).inc()
                
                event = message.value
                logger.info(f"Received event from {message.topic}: {event}")

                handler = notification_service.notification_handlers.get(message.topic)
                if handler:
                    handler(event)
                else:
                    logger.warning(f"No handler for topic: {message.topic}")

        except Exception as e:
            logger.error(f"Error processing message: {str(e)}", exc_info=True)
            notifications_sent.labels(type=message.topic, status='error').inc()


# Start Kafka consumer in background thread
consumer_thread = threading.Thread(target=consume_kafka_events, daemon=True)
consumer_thread.start()


# Flask routes
@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'notification-service',
        'timestamp': datetime.utcnow().isoformat()
    })


@app.route('/metrics', methods=['GET'])
def metrics():
    """Prometheus metrics endpoint"""
    return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}


@app.route('/api/notifications/send', methods=['POST'])
def send_notification():
    """Manual notification sending endpoint"""
    try:
        data = request.json
        notification_type = data.get('type', 'email')

        if notification_type == 'email':
            result = notification_service.send_email(
                to=data['to'],
                subject=data['subject'],
                body=data['body']
            )
        elif notification_type == 'sms':
            result = notification_service.send_sms(
                to=data['to'],
                message=data['message']
            )
        elif notification_type == 'push':
            result = notification_service.send_push_notification(
                user_id=data['user_id'],
                title=data['title'],
                body=data['body'],
                data=data.get('data')
            )
        else:
            return jsonify({'error': 'Invalid notification type'}), 400

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error sending notification: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/notifications/history', methods=['GET'])
def get_notification_history():
    """Get recent notification history"""
    try:
        notification_type = request.args.get('type', '*')
        pattern = f"notification:{notification_type}:*"
        
        keys = redis_client.keys(pattern)
        notifications = []
        
        for key in keys[:50]:  # Limit to 50 most recent
            data = redis_client.get(key)
            if data:
                notifications.append(json.loads(data))
        
        # Sort by timestamp
        notifications.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return jsonify({
            'notifications': notifications,
            'count': len(notifications)
        })

    except Exception as e:
        logger.error(f"Error fetching notification history: {str(e)}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    logger.info(f"Starting Notification Service on port {PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=False)
