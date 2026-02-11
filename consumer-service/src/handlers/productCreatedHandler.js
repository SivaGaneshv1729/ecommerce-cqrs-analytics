const { readPool } = require('../db');

async function handleProductCreated(event) {
  const { eventId, productId, name, category, price, stock, timestamp } = event;

  console.log(`Processing ProductCreated: ProductID=${productId}, Name=${name}`);

  const client = await readPool.connect();

  try {
    await client.query('BEGIN');

    // Check idempotency
    const existingEvent = await client.query(
      'SELECT 1 FROM processed_events WHERE event_id = $1',
      [eventId]
    );

    if (existingEvent.rows.length > 0) {
      console.log(`Event ${eventId} already processed, skipping`);
      await client.query('ROLLBACK');
      return;
    }

    // Initialize product in product_sales_view
    await client.query(`
      INSERT INTO product_sales_view (product_id, total_quantity_sold, total_revenue, order_count)
      VALUES ($1, 0, 0, 0)
      ON CONFLICT (product_id) DO NOTHING
    `, [productId]);

    // Initialize category in category_metrics_view if new
    await client.query(`
      INSERT INTO category_metrics_view (category_name, total_revenue, total_orders)
      VALUES ($1, 0, 0)
      ON CONFLICT (category_name) DO NOTHING
    `, [category]);

    // Update sync_status
    await client.query(`
      UPDATE sync_status SET last_processed_event_timestamp = $1 WHERE id = 1
    `, [timestamp]);

    // Mark event as processed
    await client.query(
      'INSERT INTO processed_events (event_id) VALUES ($1)',
      [eventId]
    );

    await client.query('COMMIT');

    console.log(`✓ ProductCreated processed successfully: EventID=${eventId}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error processing ProductCreated event:`, error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = handleProductCreated;
