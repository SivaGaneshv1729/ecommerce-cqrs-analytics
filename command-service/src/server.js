const express = require('express');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const { startOutboxPublisher } = require('./outbox-publisher');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(require('helmet')()); // Security headers

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Routes
app.use(productsRouter);
app.use(ordersRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`✓ Command Service listening on port ${PORT}`);
  
  // Start outbox publisher in background
  setTimeout(() => {
    startOutboxPublisher().catch(err => {
      console.error('Failed to start outbox publisher:', err);
    });
  }, 2000); // Wait 2s for database to be ready
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down Command Service...');
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  try {
    const db = require('./db');
    await db.end();
    console.log('Database pool closed');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
