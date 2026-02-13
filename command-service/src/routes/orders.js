const express = require('express');
const db = require('../db');
const { v4: uuidv4 } = require('../utils');
const { orderSchema } = require('../validation');

const router = express.Router();

// POST /api/orders - Create a new order
router.post('/api/orders', async (req, res) => {
  const { customerId, items } = req.body;

  // Validation
  const { error } = orderSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Validate products and check stock
    const productIds = items.map(item => item.productId);
    const productsResult = await client.query(
      'SELECT id, name, category, stock, price FROM products WHERE id = ANY($1)',
      [productIds]
    );

    if (productsResult.rows.length !== productIds.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'One or more products not found' });
    }

    const productsMap = {};
    productsResult.rows.forEach(p => {
      productsMap[p.id] = p;
    });

    // Check stock availability
    for (const item of items) {
      const product = productsMap[item.productId];
      if (product.stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}` 
        });
      }
    }

    // Calculate total
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Insert order
    const orderResult = await client.query(
      'INSERT INTO orders (customer_id, total, status) VALUES ($1, $2, $3) RETURNING id, created_at',
      [customerId, total, 'pending']
    );

    const orderId = orderResult.rows[0].id;
    const createdAt = orderResult.rows[0].created_at;

    // Insert order items and update stock
    for (const item of items) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [orderId, item.productId, item.quantity, item.price]
      );

      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.productId]
      );
    }

    // Create OrderCreated event in outbox with enriched data
    const enrichedItems = items.map(item => ({
      productId: item.productId,
      productName: productsMap[item.productId].name,
      category: productsMap[item.productId].category,
      quantity: item.quantity,
      price: parseFloat(item.price)
    }));

    const event = {
      eventId: uuidv4(),
      eventType: 'OrderCreated',
      orderId,
      customerId,
      items: enrichedItems,
      total: parseFloat(total.toFixed(2)),
      timestamp: createdAt.toISOString()
    };

    await client.query(
      'INSERT INTO outbox (topic, payload) VALUES ($1, $2)',
      ['order-events', JSON.stringify(event)]
    );

    await client.query('COMMIT');

    console.log(`✓ Order created: ID=${orderId}, Customer=${customerId}, Total=${total}`);

    res.status(201).json({ orderId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
});

module.exports = router;
