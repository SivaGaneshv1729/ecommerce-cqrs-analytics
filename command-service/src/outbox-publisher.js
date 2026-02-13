const db = require('./db');
const amqp = require('amqplib');

let channel = null;
let connection = null;

async function connectToBroker() {
  const maxRetries = 10;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      connection = await amqp.connect(process.env.BROKER_URL || 'amqp://guest:guest@localhost:5672/');
      channel = await connection.createChannel();
      
      // Ensure queues exist
      await channel.assertQueue('product-events', { durable: true });
      await channel.assertQueue('order-events', { durable: true });
      
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

/**
 * Polls the outbox table for unpublished events and publishes them to RabbitMQ.
 * Uses a transactional approach where possible to ensure data consistency.
 */
async function publishEvents() {
  if (!channel) {
    console.log('Broker not connected, skipping event publishing');
    return;
  }

  const client = await db.connect();

  try {
    // Fetch unpublished events
    const result = await client.query(
      'SELECT id, topic, payload FROM outbox WHERE published_at IS NULL ORDER BY created_at ASC LIMIT 100'
    );

    if (result.rows.length === 0) {
      return; // No events to publish
    }

    console.log(`Publishing ${result.rows.length} events...`);

    for (const event of result.rows) {
      try {
        // Publish to RabbitMQ
        channel.sendToQueue(
          event.topic,
          Buffer.from(JSON.stringify(event.payload)),
          { persistent: true }
        );

        // Mark as published
        await client.query(
          'UPDATE outbox SET published_at = NOW() WHERE id = $1',
          [event.id]
        );

        console.log(`✓ Published event: ${event.payload.eventType} (ID: ${event.id})`);
      } catch (error) {
        console.error(`Failed to publish event ${event.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in publishEvents:', error);
  } finally {
    client.release();
  }
}

async function startOutboxPublisher() {
  console.log('Starting outbox publisher...');
  
  await connectToBroker();

  // Poll every 1 second
  setInterval(async () => {
    await publishEvents();
  }, 1000);

  console.log('✓ Outbox publisher started (polling every 1s)');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down outbox publisher...');
  if (channel) await channel.close();
  if (connection) await connection.close();
});

module.exports = { startOutboxPublisher };
