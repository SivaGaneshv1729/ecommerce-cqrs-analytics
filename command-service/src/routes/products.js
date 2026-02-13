const express = require('express');
const db = require('../db');
const { v4: uuidv4 } = require('../utils');
const { productSchema } = require('../validation');

const router = express.Router();

// POST /api/products - Create a new product
router.post('/api/products', async (req, res) => {
  const { name, category, price, stock } = req.body;

  // Validation
  const { error } = productSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  if (price < 0 || stock < 0) {
    return res.status(400).json({ 
      error: 'Price and stock must be non-negative' 
    });
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Insert product
    const productResult = await client.query(
      'INSERT INTO products (name, category, price, stock) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, category, price, stock]
    );

    const productId = productResult.rows[0].id;

    // Create ProductCreated event in outbox
    const event = {
      eventId: uuidv4(),
      eventType: 'ProductCreated',
      productId,
      name,
      category,
      price: parseFloat(price),
      stock: parseInt(stock),
      timestamp: new Date().toISOString()
    };

    await client.query(
      'INSERT INTO outbox (topic, payload) VALUES ($1, $2)',
      ['product-events', JSON.stringify(event)]
    );

    await client.query('COMMIT');

    console.log(`✓ Product created: ID=${productId}, Name=${name}`);

    res.status(201).json({ productId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  } finally {
    client.release();
  }
});

module.exports = router;
