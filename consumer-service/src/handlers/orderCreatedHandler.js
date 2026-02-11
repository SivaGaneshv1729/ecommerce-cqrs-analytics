const { readPool } = require('../db');

async function handleOrderCreated(event) {
  const { eventId, orderId, customerId, items, total, timestamp } = event;

  console.log(`Processing OrderCreated: OrderID=${orderId}, Customer=${customerId}`);

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

    // 1. Update product_sales_view
    for (const item of items) {
      await client.query(`
        INSERT INTO product_sales_view (product_id, total_quantity_sold, total_revenue, order_count)
        VALUES ($1, $2, $3, 1)
        ON CONFLICT (product_id) DO UPDATE SET
          total_quantity_sold = product_sales_view.total_quantity_sold + $2,
          total_revenue = product_sales_view.total_revenue + $3,
          order_count = product_sales_view.order_count + 1,
          last_updated = NOW()
      `, [item.productId, item.quantity, item.price * item.quantity]);
    }

    // 2. Update category_metrics_view
    const categoriesMap = {};
    for (const item of items) {
      const category = item.category;
      if (!categoriesMap[category]) {
        categoriesMap[category] = 0;
      }
      categoriesMap[category] += item.price * item.quantity;
    }

    for (const [category, revenue] of Object.entries(categoriesMap)) {
      await client.query(`
        INSERT INTO category_metrics_view (category_name, total_revenue, total_orders)
        VALUES ($1, $2, 1)
        ON CONFLICT (category_name) DO UPDATE SET
          total_revenue = category_metrics_view.total_revenue + $2,
          total_orders = category_metrics_view.total_orders + 1,
          last_updated = NOW()
      `, [category, revenue]);
    }

    // 3. Update customer_ltv_view
    await client.query(`
      INSERT INTO customer_ltv_view (customer_id, total_spent, order_count, last_order_date)
      VALUES ($1, $2, 1, $3)
      ON CONFLICT (customer_id) DO UPDATE SET
        total_spent = customer_ltv_view.total_spent + $2,
        order_count = customer_ltv_view.order_count + 1,
        last_order_date = $3,
        last_updated = NOW()
    `, [customerId, total, timestamp]);

    // 4. Update hourly_sales_view
    const orderDate = new Date(timestamp);
    orderDate.setMinutes(0, 0, 0);
    const hourTimestamp = orderDate.toISOString();

    await client.query(`
      INSERT INTO hourly_sales_view (hour_timestamp, total_orders, total_revenue)
      VALUES ($1, 1, $2)
      ON CONFLICT (hour_timestamp) DO UPDATE SET
        total_orders = hourly_sales_view.total_orders + 1,
        total_revenue = hourly_sales_view.total_revenue + $2,
        last_updated = NOW()
    `, [hourTimestamp, total]);

    // 5. Update sync_status
    await client.query(`
      UPDATE sync_status SET last_processed_event_timestamp = $1 WHERE id = 1
    `, [timestamp]);

    // 6. Mark event as processed
    await client.query(
      'INSERT INTO processed_events (event_id) VALUES ($1)',
      [eventId]
    );

    await client.query('COMMIT');

    console.log(`✓ OrderCreated processed successfully: EventID=${eventId}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error processing OrderCreated event:`, error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = handleOrderCreated;
