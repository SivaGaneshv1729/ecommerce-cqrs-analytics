const express = require('express');
const analyticsRouter = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 8081;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Routes
app.use(analyticsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✓ Query Service listening on port ${PORT}`);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down Query Service...');
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
