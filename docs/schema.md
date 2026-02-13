# Database Schema Documentation

## 1. Write Model (Normalized)

**Database**: `write_db` (PostgreSQL)
**Purpose**: Optimized for transactional integrity and consistency.

### `products`

Stores the catalog of items available for sale.

- `id`: SERIAL PRIMARY KEY
- `name`: VARCHAR(255)
- `category`: VARCHAR(255)
- `price`: DECIMAL(10, 2)
- `stock`: INTEGER
- `created_at`: TIMESTAMP

### `orders`

Stores order metadata.

- `id`: SERIAL PRIMARY KEY
- `customer_id`: INTEGER (Indexed)
- `total`: DECIMAL(10, 2)
- `status`: VARCHAR(50) [default: 'pending']
- `created_at`: TIMESTAMP

### `order_items`

Link table between orders and products.

- `id`: SERIAL PRIMARY KEY
- `order_id`: INTEGER (FK -> orders.id, Indexed)
- `product_id`: INTEGER (FK -> products.id, Indexed)
- `quantity`: INTEGER
- `price`: DECIMAL(10, 2)

### `outbox`

**Pattern**: Transactional Outbox
Ensures atomicity between DB writes and event publishing.

- `id`: SERIAL PRIMARY KEY
- `topic`: VARCHAR(255)
- `payload`: JSONB
- `created_at`: TIMESTAMP
- `published_at`: TIMESTAMP (Indexed where NULL)

---

## 2. Read Model (Denormalized)

**Database**: `read_db` (PostgreSQL)
**Purpose**: Optimized for specific analytical queries (Materialized Views).

### `product_sales_view`

Aggregates sales by product.

- `product_id`: INTEGER PK
- `total_quantity_sold`: INTEGER
- `total_revenue`: DECIMAL
- `order_count`: INTEGER

### `category_metrics_view`

Aggregates performance by category.

- `category_name`: VARCHAR PK
- `total_revenue`: DECIMAL
- `total_orders`: INTEGER

### `customer_ltv_view`

Tracks customer lifetime value.

- `customer_id`: INTEGER PK
- `total_spent`: DECIMAL
- `order_count`: INTEGER
- `last_order_date`: TIMESTAMP

### `hourly_sales_view`

Time-series aggregation for sales trends.

- `hour_timestamp`: TIMESTAMP PK
- `total_orders`: INTEGER
- `total_revenue`: DECIMAL

### `processed_events`

**Pattern**: Idempotent Consumer
Tracks which events have been applied to views to prevent duplicates.

- `event_id`: VARCHAR PK
- `processed_at`: TIMESTAMP
