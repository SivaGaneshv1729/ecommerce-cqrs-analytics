-- Read Database Schema (Materialized Views)

-- Product sales aggregation view
CREATE TABLE IF NOT EXISTS product_sales_view (
    product_id INTEGER PRIMARY KEY,
    total_quantity_sold INTEGER DEFAULT 0,
    total_revenue DECIMAL(10, 2) DEFAULT 0,
    order_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Category metrics aggregation view
CREATE TABLE IF NOT EXISTS category_metrics_view (
    category_name VARCHAR(255) PRIMARY KEY,
    total_revenue DECIMAL(10, 2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Customer lifetime value view
CREATE TABLE IF NOT EXISTS customer_ltv_view (
    customer_id INTEGER PRIMARY KEY,
    total_spent DECIMAL(10, 2) DEFAULT 0,
    order_count INTEGER DEFAULT 0,
    last_order_date TIMESTAMP,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Hourly sales aggregation view
CREATE TABLE IF NOT EXISTS hourly_sales_view (
    hour_timestamp TIMESTAMP PRIMARY KEY,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(10, 2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Processed events table for idempotency
CREATE TABLE IF NOT EXISTS processed_events (
    event_id VARCHAR(255) PRIMARY KEY,
    processed_at TIMESTAMP DEFAULT NOW()
);

-- Sync status table
CREATE TABLE IF NOT EXISTS sync_status (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_processed_event_timestamp TIMESTAMP,
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert initial sync status row
INSERT INTO sync_status (id, last_processed_event_timestamp) 
VALUES (1, NULL) 
ON CONFLICT (id) DO NOTHING;
