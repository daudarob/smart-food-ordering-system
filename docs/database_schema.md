# Database Schema Outlines

## Overview
The database uses PostgreSQL with normalized tables for users, menu items, orders, and related entities. Foreign keys ensure data integrity.

## Tables

### Users
- id (Primary Key, UUID)
- email (Unique, VARCHAR)
- password_hash (VARCHAR)
- name (VARCHAR)
- phone (VARCHAR)
- address (TEXT)
- role (ENUM: 'user', 'admin')
- created_at (TIMESTAMP)

### MenuItems
- id (Primary Key, UUID)
- name (VARCHAR)
- description (TEXT)
- price (DECIMAL)
- image_url (VARCHAR)
- category_id (Foreign Key to Categories)
- ingredients (TEXT)
- available (BOOLEAN)
- created_at (TIMESTAMP)

### Categories
- id (Primary Key, UUID)
- name (VARCHAR, Unique)
- description (TEXT)

### Orders
- id (Primary Key, UUID)
- user_id (Foreign Key to Users)
- total (DECIMAL)
- status (ENUM: 'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')
- payment_method (VARCHAR)
- payment_status (ENUM: 'pending', 'paid', 'failed')
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### OrderItems
- id (Primary Key, UUID)
- order_id (Foreign Key to Orders)
- menu_item_id (Foreign Key to MenuItems)
- quantity (INTEGER)
- price (DECIMAL)  // Price at time of order

## Relationships
- Users 1:N Orders
- Orders 1:N OrderItems
- MenuItems N:1 Categories
- OrderItems N:1 MenuItems

## Indexes
- Users: email
- MenuItems: category_id, available
- Orders: user_id, status, created_at
- OrderItems: order_id

## Constraints
- Foreign key constraints on all FKs
- Check constraints on enums
- Unique on email in Users