# API Specification

## Command Service

**Host**: `localhost:8080`

### 1. Create Product

**POST** `/api/products`

**Request Body**:

```json
{
  "name": "Smartphone X",
  "category": "Electronics",
  "price": 699.99,
  "stock": 100
}
```

**Response (201 Created)**:

```json
{
  "productId": 1
}
```

### 2. Create Order

**POST** `/api/orders`

**Request Body**:

```json
{
  "customerId": 101,
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "price": 699.99
    }
  ]
}
```

**Response (201 Created)**:

```json
{
  "orderId": 5
}
```

---

## Query Service

**Host**: `localhost:8081`

### 1. Product Sales Analytics

**GET** `/api/analytics/products/{productId}/sales`

**Response (200 OK)**:

```json
{
  "productId": "1",
  "totalQuantitySold": "15",
  "totalRevenue": "10499.85",
  "orderCount": "8"
}
```

### 2. Category Revenue Analytics

**GET** `/api/analytics/categories/{categoryName}/revenue`

**Response (200 OK)**:

```json
{
  "category": "Electronics",
  "totalRevenue": "54000.00",
  "totalOrders": "42"
}
```

### 3. Customer LTV Analytics

**GET** `/api/analytics/customers/{customerId}/lifetime-value`

**Response (200 OK)**:

```json
{
  "customerId": "101",
  "totalSpent": "2500.50",
  "orderCount": "5",
  "lastOrderDate": "2023-10-27T10:00:00.000Z"
}
```

### 4. Sync Status (Lag Monitoring)

**GET** `/api/analytics/sync-status`

**Response (200 OK)**:

```json
{
  "lastProcessedEventTimestamp": "2023-10-27T10:05:00.000Z",
  "lagSeconds": 2.5
}
```
