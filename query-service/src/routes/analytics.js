const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/analytics/products/:productId/sales
router.get('/api/analytics/products/:productId/sales', async (req, res) => {
  const { productId } = req.params;

  try {
    const result = await db.query(
      'SELECT product_id, total_quantity_sold, total_revenue, order_count FROM product_sales_view WHERE product_id = $1',
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found or no sales data available' });
    }

    const row = result.rows[0];

    res.status(200).json({
      productId: parseInt(row.product_id),
      totalQuantitySold: parseInt(row.total_quantity_sold),
      totalRevenue: parseFloat(row.total_revenue),
      orderCount: parseInt(row.order_count)
    });
  } catch (error) {
    console.error('Error fetching product sales:', error);
    res.status(500).json({ error: 'Failed to fetch product sales analytics' });
  }
});

// GET /api/analytics/categories/:category/revenue
router.get('/api/analytics/categories/:category/revenue', async (req, res) => {
  const { category } = req.params;

  try {
    const result = await db.query(
      'SELECT category_name, total_revenue, total_orders FROM category_metrics_view WHERE category_name = $1',
      [category]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found or no data available' });
    }

    const row = result.rows[0];

    res.status(200).json({
      category: row.category_name,
      totalRevenue: parseFloat(row.total_revenue),
      totalOrders: parseInt(row.total_orders)
    });
  } catch (error) {
    console.error('Error fetching category revenue:', error);
    res.status(500).json({ error: 'Failed to fetch category revenue analytics' });
  }
});

// GET /api/analytics/customers/:customerId/lifetime-value
router.get('/api/analytics/customers/:customerId/lifetime-value', async (req, res) => {
  const { customerId } = req.params;

  try {
    const result = await db.query(
      'SELECT customer_id, total_spent, order_count, last_order_date FROM customer_ltv_view WHERE customer_id = $1',
      [customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found or no order data available' });
    }

    const row = result.rows[0];

    res.status(200).json({
      customerId: parseInt(row.customer_id),
      totalSpent: parseFloat(row.total_spent),
      orderCount: parseInt(row.order_count),
      lastOrderDate: row.last_order_date ? row.last_order_date.toISOString() : null
    });
  } catch (error) {
    console.error('Error fetching customer lifetime value:', error);
    res.status(500).json({ error: 'Failed to fetch customer lifetime value analytics' });
  }
});

// GET /api/analytics/sync-status
router.get('/api/analytics/sync-status', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT last_processed_event_timestamp FROM sync_status WHERE id = 1'
    );

    const lastProcessedEventTimestamp = result.rows[0].last_processed_event_timestamp;

    let lagSeconds = null;

    if (lastProcessedEventTimestamp) {
      const now = new Date();
      const lastProcessed = new Date(lastProcessedEventTimestamp);
      lagSeconds = (now - lastProcessed) / 1000;
    }

    res.status(200).json({
      lastProcessedEventTimestamp: lastProcessedEventTimestamp ? lastProcessedEventTimestamp.toISOString() : null,
      lagSeconds: lagSeconds !== null ? parseFloat(lagSeconds.toFixed(2)) : null
    });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    res.status(500).json({ error: 'Failed to fetch sync status' });
  }
});

module.exports = router;
