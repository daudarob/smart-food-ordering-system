# API Endpoints Design

## Overview
The SFO API follows RESTful principles, using JSON for data exchange. All endpoints require authentication via JWT tokens in the Authorization header, except for public routes like registration and login.

## Authentication Endpoints
- **POST /api/auth/register**
  - Body: { email, password, name }
  - Response: { userId, token }

- **POST /api/auth/login**
  - Body: { email, password }
  - Response: { userId, token }

- **POST /api/auth/logout**
  - Headers: Authorization: Bearer <token>
  - Response: { message: "Logged out" }

## Menu Endpoints
- **GET /api/menu**
  - Query: ?category=string&search=string
  - Response: [{ id, name, description, price, image, category }]

- **GET /api/menu/:id**
  - Response: { id, name, description, price, image, category, ingredients }

## Order Endpoints
- **POST /api/orders**
  - Body: { items: [{ menuId, quantity }], total, paymentMethod }
  - Response: { orderId, status: "pending" }

- **GET /api/orders**
  - Response: [{ orderId, items, total, status, createdAt }]

- **GET /api/orders/:id**
  - Response: { orderId, items, total, status, createdAt, userId }

- **PUT /api/orders/:id/status**
  - Body: { status: "confirmed" | "preparing" | "ready" | "delivered" }
  - Admin only

## User Endpoints
- **GET /api/users/profile**
  - Response: { id, name, email, phone, address }

- **PUT /api/users/profile**
  - Body: { name, phone, address }

## Admin Endpoints
- **GET /api/admin/orders**
  - Response: [{ orderId, user, items, total, status }]

- **GET /api/admin/menu**
  - Response: [{ id, name, ... }]

- **POST /api/admin/menu**
  - Body: { name, description, price, ... }

- **PUT /api/admin/menu/:id**
  - Body: updates

- **DELETE /api/admin/menu/:id**

## Error Handling
All endpoints return standard HTTP status codes. Errors include { error: "message" }.

## Rate Limiting
Implemented at API Gateway level: 100 requests/min per user.