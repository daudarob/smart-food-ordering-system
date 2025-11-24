# SFO System API Documentation

## Overview

The USIU-A Smart Food Ordering (SFO) System provides a comprehensive REST API for managing campus cafeteria operations. This documentation covers all available endpoints, authentication, and usage examples.

## Base URL
```
Production: https://api.sfo.usiu.ac.ke
Development: http://localhost:3000
```

## Authentication

All API requests require authentication except for health check endpoints. The system uses JWT (JSON Web Tokens) for authentication.

### Authentication Headers
```
Authorization: Bearer <jwt_token>
X-API-Key: <api_key> (for service-to-service calls)
```

### Obtaining a Token

#### POST /api/auth/login
Authenticate user and receive JWT token.

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@usiu.ac.ke",
    "password": "securePassword123"
  }'
```

**Response:**
```json
{
  "userId": "uuid-string",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "name": "John Doe",
  "email": "student@usiu.ac.ke",
  "role": "student"
}
```

## Core API Endpoints

### Authentication

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "student@usiu.ac.ke",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "userId": "uuid",
  "token": "jwt_token",
  "name": "John Doe",
  "email": "student@usiu.ac.ke"
}
```

**Error Responses:**
- `400`: Validation error
- `409`: Email already exists

#### GET /api/auth/verify
Verify JWT token and get user information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "student@usiu.ac.ke",
  "role": "student",
  "cafeteria_id": null
}
```

#### PUT /api/auth/profile
Update user profile information.

**Request Body:**
```json
{
  "name": "Updated Name",
  "phone": "+254712345678",
  "address": "USIU-Africa Campus"
}
```

#### PUT /api/auth/change-password
Change user password.

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword123"
}
```

### Menu Management

#### GET /api/menu/categories
Get all menu categories.

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Main Courses",
    "description": "Hearty main dishes"
  }
]
```

#### GET /api/menu
Get menu items with optional filtering.

**Query Parameters:**
- `category`: Filter by category ID
- `search`: Search in item names
- `limit`: Number of items to return (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Chicken Burger",
    "description": "Grilled chicken burger with fries",
    "price": 15.99,
    "image_url": "/uploads/menu/chicken-burger.jpg",
    "category_id": "uuid",
    "cafeteria_id": "uuid",
    "stock": 45,
    "available": true,
    "Category": {
      "name": "Burgers"
    }
  }
]
```

#### GET /api/menu/:id
Get specific menu item details.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "Chicken Burger",
  "description": "Grilled chicken burger with fries",
  "price": 15.99,
  "ingredients": "Chicken breast, bun, lettuce, tomato, fries",
  "nutritional_info": {
    "calories": 650,
    "protein": 35,
    "carbs": 45,
    "fat": 28
  },
  "available": true,
  "stock": 45
}
```

### Order Management

#### POST /api/orders
Create a new order.

**Request Body:**
```json
{
  "items": [
    {
      "menu_item_id": "uuid",
      "quantity": 2
    },
    {
      "menu_item_id": "uuid2",
      "quantity": 1
    }
  ],
  "special_instructions": "Extra spicy please",
  "payment_method": "mpesa"
}
```

**Response:** `201 Created`
```json
{
  "orderId": "order-uuid",
  "total": 47.97,
  "status": "pending",
  "estimated_prep_time": 15,
  "items": [
    {
      "menu_item_id": "uuid",
      "name": "Chicken Burger",
      "quantity": 2,
      "price": 15.99,
      "subtotal": 31.98
    }
  ]
}
```

#### GET /api/orders
Get user orders (students/staff) or all orders (admins).

**Query Parameters (for admins):**
- `status`: Filter by order status
- `cafeteria_id`: Filter by cafeteria
- `date_from`: Start date (YYYY-MM-DD)
- `date_to`: End date (YYYY-MM-DD)
- `limit`: Number of orders (default: 50)
- `offset`: Pagination offset

**Response:** `200 OK`
```json
{
  "orders": [
    {
      "id": "order-uuid",
      "user_id": "user-uuid",
      "total": 47.97,
      "status": "preparing",
      "payment_method": "mpesa",
      "payment_status": "paid",
      "created_at": "2025-11-04T10:30:00Z",
      "User": {
        "name": "John Doe",
        "email": "john@usiu.ac.ke"
      },
      "OrderItems": [
        {
          "menu_item_id": "item-uuid",
          "quantity": 2,
          "price": 15.99,
          "MenuItem": {
            "name": "Chicken Burger"
          }
        }
      ]
    }
  ],
  "total": 150,
  "page": 1,
  "totalPages": 3
}
```

#### PUT /api/orders/:id/status
Update order status (admin only).

**Request Body:**
```json
{
  "status": "ready"
}
```

**Valid Statuses:**
- `pending`: Order placed, awaiting confirmation
- `confirmed`: Order confirmed by cafeteria
- `preparing`: Food being prepared
- `ready`: Order ready for pickup
- `completed`: Order picked up
- `cancelled`: Order cancelled

### Payment Processing

#### POST /api/payments/initiate
Initiate payment for an order.

**Request Body:**
```json
{
  "order_id": "order-uuid",
  "payment_method": "mpesa",
  "phone_number": "+254712345678"
}
```

**Response:** `200 OK`
```json
{
  "checkout_request_id": "ws_CO_123456789",
  "response_code": "0",
  "response_description": "Success. Request accepted for processing",
  "customer_message": "Please enter your M-Pesa PIN to complete payment"
}
```

#### GET /api/payments/status/:checkoutRequestId
Check payment status.

**Response:** `200 OK`
```json
{
  "order_id": "order-uuid",
  "status": "paid",
  "amount": 47.97,
  "transaction_id": "transaction-uuid",
  "paid_at": "2025-11-04T10:35:00Z"
}
```

### Administrative Endpoints

#### GET /api/admin/dashboard
Get dashboard statistics (admin only).

**Response:** `200 OK`
```json
{
  "todayOrders": 45,
  "todayRevenue": 1250.50,
  "pendingOrders": 8,
  "lowStockItems": [
    {
      "id": "item-uuid",
      "name": "Chicken Burger",
      "stock": 3
    }
  ],
  "popularItems": [
    {
      "name": "Chicken Burger",
      "orders": 25
    }
  ]
}
```

#### POST /api/admin/categories
Create new menu category (admin only).

**Request Body:**
```json
{
  "name": "Beverages",
  "description": "Drinks and refreshments"
}
```

#### PUT /api/admin/categories/:id
Update menu category (admin only).

#### DELETE /api/admin/categories/:id
Delete menu category (admin only).

#### POST /api/admin/menu-items
Create new menu item (admin only).

**Request Body:**
```json
{
  "name": "Chicken Burger",
  "description": "Grilled chicken burger with fries",
  "price": 15.99,
  "category_id": "category-uuid",
  "stock": 50,
  "ingredients": "Chicken breast, bun, lettuce, tomato, fries",
  "available": true
}
```

#### PUT /api/admin/menu-items/:id
Update menu item (admin only).

#### DELETE /api/admin/menu-items/:id
Delete menu item (admin only).

### System Health & Monitoring

#### GET /health
System health check.

**Response:** `200 OK` or `503 Service Unavailable`
```json
{
  "status": "healthy",
  "timestamp": "2025-11-04T10:30:00.000Z",
  "uptime": "2h 15m",
  "memory": {
    "rss": "85MB",
    "heapUsed": "65MB",
    "heapTotal": "120MB"
  },
  "database": "connected",
  "cache": {
    "status": "connected",
    "hitRate": 0.95
  },
  "checks": {
    "responseTime": true,
    "errorRate": true,
    "memory": true,
    "database": true
  }
}
```

#### GET /metrics
Prometheus-compatible metrics.

**Response:** `200 OK`
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/menu",status_code="200"} 1250
http_requests_total{method="POST",route="/api/orders",status_code="201"} 45

# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/api/menu",le="0.1"} 1200
```

#### GET /alerts
Current alert status.

**Response:** `200 OK`
```json
{
  "HIGH_ERROR_RATE": {
    "lastTriggered": "2025-11-04T09:15:00.000Z",
    "cooldownRemaining": 245
  }
}
```

## Error Handling

All API endpoints follow consistent error response formats:

### Standard Error Response
```json
{
  "error": "Error message description",
  "requestId": "uuid-request-id",
  "details": {} // Optional additional error details
}
```

### Common HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate data)
- `422`: Unprocessable Entity (business logic errors)
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error
- `503`: Service Unavailable (maintenance/health issues)

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General API**: 1000 requests per 15 minutes (production), 100 per 15 minutes (development)
- **Authentication**: 20 attempts per 15 minutes
- **Order Creation**: 200 requests per 5 minutes

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1638360000
```

## WebSocket Integration

Real-time updates are provided via WebSocket connections:

### Connection
```javascript
const socket = io('http://localhost:3000');

// Join user room
socket.emit('join', userId);

// Listen for order updates
socket.on('orderStatusUpdate', (data) => {
  console.log('Order status changed:', data);
});

// Listen for menu updates
socket.on('menuUpdated', () => {
  // Refresh menu data
});
```

### Events
- `orderStatusUpdate`: Order status changes
- `menuUpdated`: Menu items modified
- `orderStatusChanged`: Admin order status updates

## File Upload

### POST /api/auth/upload-profile-picture
Upload user profile picture.

**Content-Type:** `multipart/form-data`

**Form Data:**
- `profile_picture`: Image file (max 10MB, formats: JPG, PNG, GIF)

**Response:** `200 OK`
```json
{
  "profile_picture_url": "/uploads/profiles/uuid-filename.jpg"
}
```

## Data Export

### GET /api/admin/export/orders
Export orders data (admin only).

**Query Parameters:**
- `format`: `csv` or `json` (default: json)
- `date_from`: Start date
- `date_to`: End date

**Response:** File download with orders data.

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `limit`: Number of items per page (default: 50, max: 100)
- `offset`: Number of items to skip (default: 0)

**Response includes:**
```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "totalPages": 3,
  "hasNext": true,
  "hasPrev": false
}
```

## Caching

The API uses Redis for caching frequently accessed data:

- Menu items: 10 minutes
- Categories: 30 minutes
- User profiles: 5 minutes

Cache headers are included in responses:
```
X-Cache-Status: HIT
X-Cache-TTL: 598
```

## Security Considerations

### Authentication
- JWT tokens expire after 24 hours
- Refresh tokens available for extended sessions
- Secure token storage recommended

### HTTPS Only
- All production traffic must use HTTPS
- HSTS headers enforced
- Secure cookie settings

### CORS
- Configured for specific origins
- Credentials allowed for authenticated requests

### Input Validation
- All inputs validated using Joi schemas
- SQL injection prevention via parameterized queries
- XSS protection with input sanitization

## SDKs and Libraries

### JavaScript/TypeScript Client
```javascript
import { SFOClient } from '@usiu/sfo-client';

const client = new SFOClient({
  baseURL: 'https://api.sfo.usiu.ac.ke',
  apiKey: 'your-api-key'
});

// Authenticate
const { token } = await client.auth.login('user@usiu.ac.ke', 'password');

// Get menu
const menu = await client.menu.getItems();

// Create order
const order = await client.orders.create({
  items: [{ menu_item_id: 'item-uuid', quantity: 2 }],
  payment_method: 'mpesa'
});
```

## Changelog

### Version 1.0.0
- Initial release with core ordering functionality
- Multi-role authentication
- M-Pesa payment integration
- Real-time order tracking
- Administrative dashboard

## Support

For API support and questions:
- **Documentation**: https://docs.sfo.usiu.ac.ke
- **Issues**: https://github.com/usiu/sfo-system/issues
- **Email**: api-support@usiu.ac.ke

## Rate Limits & Quotas

### Free Tier (Students)
- 1000 requests per day
- 10 orders per day
- Basic support

### Premium Tier (Staff/Cafeterias)
- 10000 requests per day
- Unlimited orders
- Priority support
- Advanced analytics

## Deprecation Policy

API versions are supported for 12 months after a new version is released. Deprecated endpoints will return deprecation headers:

```
Deprecation: version="2025-01-01"
Sunset: version="2025-12-01"
```

---

**Last updated:** November 4, 2025
**API Version:** 1.0.0