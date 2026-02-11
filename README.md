# CQRS and Event-Driven Analytics System

A high-performance e-commerce analytics backend built with **CQRS** (Command Query Responsibility Segregation) and **Event-Driven Architecture** patterns.

## 🏗️ Architecture Overview

This system separates write operations (commands) from read operations (queries) to achieve:

- **High scalability**: Write and read models can scale independently
- **Optimized performance**: Queries use denormalized materialized views
- **Eventual consistency**: Read models converge over time via asynchronous event processing
- **Reliability**: Transactional outbox pattern ensures no event loss

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      WRITE PATH (Commands)                      │
│                                                                 │
│  Client → Command Service → Write DB (PostgreSQL)              │
│                    ↓                                            │
│                 Outbox Table (Events)                           │
│                    ↓                                            │
│              Outbox Publisher                                   │
│                    ↓                                            │
└────────────────────┼───────────────────────────────────────────┘
                     │
            ┌────────▼────────┐
            │   RabbitMQ      │
            │  Message Broker │
            └────────┬────────┘
                     │
┌────────────────────┼───────────────────────────────────────────┐
│                    ▼           READ PATH (Queries)             │
│              Consumer Service                                  │
│                    ↓                                            │
│         Materialized Views (Denormalized)                      │
│                    ↓                                            │
│  Client → Query Service → Read DB (PostgreSQL)                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Patterns Implemented

1. **CQRS**: Separate models for writes (normalized) and reads (denormalized)
2. **Transactional Outbox**: Events written atomically with business data
3. **Event-Driven Architecture**: Asynchronous communication via RabbitMQ
4. **Idempotency**: Consumers handle duplicate events gracefully
5. **Eventual Consistency**: Read models updated asynchronously

---

## 📋 Features

### Command Service (Port 8080)

- ✅ `POST /api/products` - Create products
- ✅ `POST /api/orders` - Create orders with stock validation
- ✅ Transactional outbox pattern for reliable event publishing
- ✅ Background outbox publisher

### Consumer Service

- ✅ Processes `ProductCreated` events
- ✅ Processes `OrderCreated` events
- ✅ Updates 4 materialized views
- ✅ Idempotency via `processed_events` table

### Query Service (Port 8081)

- ✅ `GET /api/analytics/products/:id/sales` - Product sales analytics
- ✅ `GET /api/analytics/categories/:category/revenue` - Category revenue
- ✅ `GET /api/analytics/customers/:id/lifetime-value` - Customer LTV
- ✅ `GET /api/analytics/sync-status` - Event processing lag

---

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Setup Instructions

1. **Clone/Navigate to the project directory**:

   ```bash
   cd C:\Users\user\Desktop\Dev\cqrs-analytics
   ```

2. **Start all services**:

   ```bash
   docker-compose up --build
   ```

   This will start:
   - PostgreSQL (write database) on port `5432`
   - PostgreSQL (read database) on port `5433`
   - RabbitMQ on ports `5672` (AMQP) and `15672` (Management UI)
   - Command Service on port `8080`
   - Consumer Service (background)
   - Query Service on port `8081`

3. **Wait for health checks** (approximately 1-2 minutes):

   ```bash
   docker-compose ps
   ```

   All services should show `healthy` status.

4. **Access services**:
   - Command API: http://localhost:8080
   - Query API: http://localhost:8081
   - RabbitMQ Management: http://localhost:15672 (guest/guest)

---

## 📚 API Documentation

### Command Service (http://localhost:8080)

#### Create Product

```bash
POST /api/products
Content-Type: application/json

{
  "name": "Gaming Laptop",
  "category": "Electronics",
  "price": 1299.99,
  "stock": 50
}

Response (201 Created):
{
  "productId": 1
}
```

#### Create Order

```bash
POST /api/orders
Content-Type: application/json

{
  "customerId": 100,
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "price": 1299.99
    }
  ]
}

Response (201 Created):
{
  "orderId": 1
}
```

### Query Service (http://localhost:8081)

#### Get Product Sales Analytics

```bash
GET /api/analytics/products/{productId}/sales

Response (200 OK):
{
  "productId": 1,
  "totalQuantitySold": 5,
  "totalRevenue": 6499.95,
  "orderCount": 3
}
```

#### Get Category Revenue

```bash
GET /api/analytics/categories/{category}/revenue

Response (200 OK):
{
  "category": "Electronics",
  "totalRevenue": 15999.80,
  "totalOrders": 8
}
```

#### Get Customer Lifetime Value

```bash
GET /api/analytics/customers/{customerId}/lifetime-value

Response (200 OK):
{
  "customerId": 100,
  "totalSpent": 3899.97,
  "orderCount": 3,
  "lastOrderDate": "2026-02-11T16:35:00.000Z"
}
```

#### Get Sync Status

```bash
GET /api/analytics/sync-status

Response (200 OK):
{
  "lastProcessedEventTimestamp": "2026-02-11T16:35:00.000Z",
  "lagSeconds": 2.5
}
```

---

## 🧪 Testing Guide

### End-to-End Test Flow

```bash
# 1. Create a product
curl -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Wireless Mouse","category":"Electronics","price":29.99,"stock":100}'

# Response: {"productId": 1}

# 2. Create an order
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId":50,"items":[{"productId":1,"quantity":3,"price":29.99}]}'

# Response: {"orderId": 1}

# 3. Wait 5 seconds for event processing
timeout 5

# 4. Query product sales
curl http://localhost:8081/api/analytics/products/1/sales

# Expected: totalQuantitySold: 3, totalRevenue: 89.97, orderCount: 1

# 5. Query category revenue
curl http://localhost:8081/api/analytics/categories/Electronics/revenue

# Expected: totalRevenue: 89.97, totalOrders: 1

# 6. Query customer LTV
curl http://localhost:8081/api/analytics/customers/50/lifetime-value

# Expected: totalSpent: 89.97, orderCount: 1

# 7. Check sync status
curl http://localhost:8081/api/analytics/sync-status

# Expected: lastProcessedEventTimestamp with recent time, lagSeconds < 5
```

### Verifying Event Flow

1. **Check Outbox Table**:

   ```bash
   docker exec -it cqrs-analytics-db-1 psql -U user -d write_db \
     -c "SELECT id, topic, published_at IS NOT NULL as published FROM outbox;"
   ```

2. **Check RabbitMQ Queues**:
   Visit http://localhost:15672, navigate to "Queues" tab, check message counts.

3. **Check Materialized Views**:
   ```bash
   docker exec -it cqrs-analytics-read_db-1 psql -U user -d read_db \
     -c "SELECT * FROM product_sales_view;"
   ```

---

## 🗄️ Database Schemas

### Write Database (write_db)

**Products**

```sql
id | name | category | price | stock | created_at
```

**Orders**

```sql
id | customer_id | total | status | created_at
```

**Order Items**

```sql
id | order_id | product_id | quantity | price
```

**Outbox** (Transactional Outbox Pattern)

```sql
id | topic | payload | created_at | published_at
```

### Read Database (read_db)

**product_sales_view**

```sql
product_id | total_quantity_sold | total_revenue | order_count | last_updated
```

**category_metrics_view**

```sql
category_name | total_revenue | total_orders | last_updated
```

**customer_ltv_view**

```sql
customer_id | total_spent | order_count | last_order_date | last_updated
```

**hourly_sales_view**

```sql
hour_timestamp | total_orders | total_revenue | last_updated
```

**processed_events** (Idempotency)

```sql
event_id | processed_at
```

**sync_status**

```sql
id | last_processed_event_timestamp
```

---

## 🔧 Environment Variables

See `.env.example` for all configuration options:

```env
DATABASE_URL=postgresql://user:password@db:5432/write_db
READ_DATABASE_URL=postgresql://user:password@read_db:5432/read_db
BROKER_URL=amqp://guest:guest@broker:5672/
COMMAND_SERVICE_PORT=8080
QUERY_SERVICE_PORT=8081
```

---

## 📦 Project Structure

```
cqrs-analytics/
├── docker-compose.yml          # Service orchestration
├── .env.example                # Environment variables
├── submission.json             # Evaluation config
├── README.md                   # This file
│
├── command-service/            # Write model
│   ├── Dockerfile
│   ├── package.json
│   ├── init.sql                # Write DB schema
│   └── src/
│       ├── server.js           # Express server
│       ├── db.js               # Database connection
│       ├── outbox-publisher.js # Background event publisher
│       ├── utils.js            # UUID generator
│       └── routes/
│           ├── products.js     # POST /api/products
│           └── orders.js       # POST /api/orders
│
├── consumer-service/           # Event processor
│   ├── Dockerfile
│   ├── package.json
│   ├── init.sql                # Read DB schema
│   └── src/
│       ├── consumer.js         # RabbitMQ subscriber
│       ├── db.js               # Database connection
│       └── handlers/
│           ├── orderCreatedHandler.js
│           └── productCreatedHandler.js
│
└── query-service/              # Read model
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── server.js           # Express server
        ├── db.js               # Database connection
        └── routes/
            └── analytics.js    # Analytics endpoints
```

---

## 🛠️ Troubleshooting

### Services won't start

- Ensure Docker Desktop is running
- Check if ports 5432, 5433, 5672, 8080, 8081, 15672 are available
- Run `docker-compose down -v` to clean up volumes, then retry

### Events not processing

- Check consumer logs: `docker-compose logs consumer-service`
- Verify RabbitMQ connection at http://localhost:15672
- Check outbox publisher logs: `docker-compose logs command-service`

### Analytics showing zero/null

- Ensure you've created products and orders
- Wait 5-10 seconds for event processing
- Check sync-status endpoint for lag
- Verify consumer processed events: `docker exec -it cqrs-analytics-read_db-1 psql -U user -d read_db -c "SELECT COUNT(*) FROM processed_events;"`

---

## 🎯 Design Decisions

### Why CQRS?

- **Performance**: Analytics queries don't slow down order processing
- **Scalability**: Can scale read replicas independently
- **Optimization**: Each model optimized for its purpose

### Why Transactional Outbox?

- **Reliability**: No lost events even if broker is down
- **Atomicity**: Business data and events saved together
- **Consistency**: Guarantees eventual consistency

### Why RabbitMQ?

- **Simplicity**: Easier setup than Kafka for this scale
- **Features**: Built-in management UI, message persistence
- **Reliability**: Mature message queuing system

### Why Idempotency?

- **Robustness**: Handles at-least-once delivery semantics
- **Accuracy**: Prevents duplicate data in analytics
- **Reliability**: Safe to retry failed events

---

## 📝 Requirements Checklist

- ✅ Docker Compose with all services
- ✅ Health checks for all services
- ✅ .env.example file
- ✅ submission.json file
- ✅ Write DB: products, orders, order_items, outbox tables
- ✅ Read DB: 4 materialized views + processed_events + sync_status
- ✅ POST /api/products endpoint
- ✅ POST /api/orders endpoint
- ✅ Transactional outbox pattern
- ✅ Event publishing to RabbitMQ
- ✅ Consumer with idempotency
- ✅ GET /api/analytics/products/:id/sales
- ✅ GET /api/analytics/categories/:category/revenue
- ✅ GET /api/analytics/customers/:id/lifetime-value
- ✅ GET /api/analytics/sync-status

---

## 👨‍💻 Tech Stack

- **Language**: Node.js 18
- **Framework**: Express.js
- **Databases**: PostgreSQL 14
- **Message Broker**: RabbitMQ 3
- **Containerization**: Docker & Docker Compose

---

## 📄 License

This project is created for educational purposes as part of a backend development assessment.

---

## 🙏 Acknowledgments

Built as a demonstration of modern backend architecture patterns including CQRS, Event-Driven Architecture, and the Transactional Outbox pattern.
