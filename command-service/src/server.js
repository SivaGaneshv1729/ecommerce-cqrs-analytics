const express = require('express');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const { startOutboxPublisher } = require('./outbox-publisher');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());

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
process.on('SIGTERM', () => {
  console.log('Shutting down Command Service...');
  process.exit(0);
});
