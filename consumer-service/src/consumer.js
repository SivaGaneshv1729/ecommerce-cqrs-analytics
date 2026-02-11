const amqp = require('amqplib');
const handleOrderCreated = require('./handlers/orderCreatedHandler');
const handleProductCreated = require('./handlers/productCreatedHandler');

let channel = null;
let connection = null;

async function connectToBroker() {
  const maxRetries = 15;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      connection = await amqp.connect(process.env.BROKER_URL || 'amqp://guest:guest@localhost:5672/');
      channel = await connection.createChannel();

      console.log('✓ Connected to RabbitMQ message broker');
      return;
    } catch (error) {
      retries++;
      console.error(`Failed to connect to broker (attempt ${retries}/${maxRetries}):`, error.message);
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }

  console.error('Could not connect to message broker after multiple attempts');
  process.exit(1);
}

async function startConsuming() {
  await connectToBroker();

  // Ensure queues exist
  await channel.assertQueue('product-events', { durable: true });
  await channel.assertQueue('order-events', { durable: true });

  // Set prefetch to 1 for fair distribution
  channel.prefetch(1);

  console.log('Waiting for messages...');

  // Consume product events
  channel.consume('product-events', async (msg) => {
    if (msg !== null) {
      try {
        const event = JSON.parse(msg.content.toString());
        console.log(`\n📦 Received ${event.eventType} event`);

        if (event.eventType === 'ProductCreated') {
          await handleProductCreated(event);
        }

        channel.ack(msg);
      } catch (error) {
        console.error('Error processing product event:', error);
        // Reject and requeue (or send to DLQ in production)
        channel.nack(msg, false, true);
      }
    }
  });

  // Consume order events
  channel.consume('order-events', async (msg) => {
    if (msg !== null) {
      try {
        const event = JSON.parse(msg.content.toString());
        console.log(`\n📦 Received ${event.eventType} event`);

        if (event.eventType === 'OrderCreated') {
          await handleOrderCreated(event);
        }

        channel.ack(msg);
      } catch (error) {
        console.error('Error processing order event:', error);
        // Reject and requeue (or send to DLQ in production)
        channel.nack(msg, false, true);
      }
    }
  });

  console.log('✓ Consumer service started successfully');
}

// Start the consumer
startConsuming().catch(err => {
  console.error('Failed to start consumer:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down consumer service...');
  if (channel) await channel.close();
  if (connection) await connection.close();
  process.exit(0);
});
