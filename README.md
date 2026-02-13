# CQRS & Event-Driven E-Commerce Analytics System 🚀

A high-performance backend system for e-commerce analytics, built using the **CQRS** (Command Query Responsibility Segregation) pattern and **Event-Driven Architecture**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)

## 🏗️ Architecture

This project strictly separates write and read concerns to achieve scalability and eventual consistency.

```mermaid
graph TD
    Client[Client / API Consumer]

    subgraph "Write Side (Command)"
        CS[Command Service]
        WDB[(Write DB\nPostgres)]
        Outbox[Outbox Table]
    end

    subgraph "Event Bus"
        RMQ[RabbitMQ Broker]
    end

    subgraph "Read Side (Query)"
        Cons[Consumer Service]
        RDB[(Read DB\nPostgres)]
        QS[Query Service]
    end

    Client -->|POST /orders| CS
    CS -->|1. Transact Write| WDB
    CS -->|2. Write Event| Outbox
    Outbox -.->|3. Publish| RMQ
    RMQ -->|4. Consume| Cons
    Cons -->|5. Update View| RDB
    Client -->|GET /analytics| QS
    QS -->|6. Read View| RDB
```

### Components

1.  **Command Service** (`:8080`): Handles `POST` requests. Validates data (using Joi) and writes to `products`/`orders` tables. Uses **Transactional Outbox** payload.
2.  **RabbitMQ**: Message broker for asynchronous communication.
3.  **Consumer Service**: Subscribes to `ProductCreated` and `OrderCreated` events. Updates materialized views. Handles **Idempotency**.
4.  **Query Service** (`:8081`): Handles `GET` requests. Reads pre-calculated analytics from materialized views.

---

## 🚀 Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js (optional, for running local verification scripts)

### Installation & Run

The entire system is containerized.

1.  **Clone the repository**
2.  **Start the System**
    ```bash
    docker compose up --build -d
    ```
3.  **Wait for Health Checks**
    The services will wait for RabbitMQ and PostgreSQL to be ready. You can check status with:
    ```bash
    docker compose ps
    ```

---

## 🧪 Verification & Testing

We have included an automated end-to-end verification script.

```bash
# Run the verification script
node verify_system.js
```

**What this script tests:**

1.  ✅ **Health**: Checks if all microservices command/query/consumer are up.
2.  ✅ **Commands**: Creates a Product and an Order via Command Service.
3.  ✅ **Event Flow**: Waits for RabbitMQ delivery and Consumer processing.
4.  ✅ **Analytics**: Queries the Read API to verify materialized views match the created data.
5.  ✅ **Consistency**: Checks `sync-status` for lag.

---

## 📡 API Documentation

### Command Service (Writes)

Base URL: `http://localhost:8080`

| Method | Endpoint        | Description          | Payload                                                                       |
| :----- | :-------------- | :------------------- | :---------------------------------------------------------------------------- |
| `POST` | `/api/products` | Create a new product | `{"name": "Laptop", "category": "Tech", "price": 999, "stock": 50}`           |
| `POST` | `/api/orders`   | Create a new order   | `{"customerId": 1, "items": [{"productId": 1, "quantity": 1, "price": 999}]}` |
| `GET`  | `/health`       | Service health check | -                                                                             |

### Query Service (Reads)

Base URL: `http://localhost:8081`

| Method | Endpoint                                      | Description                      |
| :----- | :-------------------------------------------- | :------------------------------- |
| `GET`  | `/api/analytics/products/:id/sales`           | Get sales stats for a product    |
| `GET`  | `/api/analytics/categories/:cat/revenue`      | Get revenue stats for a category |
| `GET`  | `/api/analytics/customers/:id/lifetime-value` | Get LTV for a customer           |
| `GET`  | `/api/analytics/sync-status`                  | Check event processing lag       |
| `GET`  | `/health`                                     | Service health check             |

---

## ⚙️ Configuration

Environment variables are documented in `.env.example`.

- **Database**: `postgres://user:password@db:5432/write_db`
- **Broker**: `amqp://guest:guest@broker:5672/`

---

## 🛠️ Design Decisions & Patterns

- **Transactional Outbox**: We do not publish to RabbitMQ directly after a DB write. Instead, we write the event to an `outbox` table in the _same transaction_. A background publisher (in `outbox-publisher.js`) then reliably pushes to the broker. This guarantees **At-Least-Once** delivery.
- **Idempotency**: The Consumer Service tracks `processed_events` to prevent processing the same message twice (handling potential duplicate deliveries from RabbitMQ).
- **Optimizations**:
  - **Indexes**: Added to `customer_id` and foreign keys for performance.
  - **Validation**: Joi schemas prevent bad data from entering the write model.
  - **Graceful Shutdown**: All services handle SIGTERM to prevent connection leaks.
