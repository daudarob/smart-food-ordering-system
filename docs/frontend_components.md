# Frontend Component Breakdown

## Overview
The frontend is built with React.js, using a component-based architecture for reusability and maintainability.

## Core Components
- **App**: Root component with routing (React Router)
- **Header**: Navigation bar with logo, menu links, cart icon, user dropdown
- **Footer**: Static footer with links and info

## Page Components
- **HomePage**: Hero section, featured menu carousel
- **MenuPage**: Filters, menu grid
- **CartPage**: Cart list, order summary, checkout form
- **ProfilePage**: User form, order history list
- **AdminDashboard**: Stats cards, tables for menu/orders

## Reusable Components
- **MenuCard**: Displays item image, name, price, add to cart button
- **CartItem**: Item in cart with quantity controls
- **OrderHistoryItem**: Past order summary
- **FormInput**: Reusable input field with validation
- **Button**: Styled button component
- **Modal**: For confirmations, e.g., delete item
- **Table**: For admin tables with sorting/pagination

## Layout Components
- **Layout**: Wraps pages with Header/Footer
- **Sidebar**: For filters or admin nav
- **Grid**: For menu items display

## State Management
- Context API for global state (user, cart)
- Local state for forms and UI toggles

Components follow atomic design: atoms (buttons), molecules (cards), organisms (pages).