# Payment Interface Design for Campus Cafeteria Ordering App

## Overview
The payment interface for the campus cafeteria ordering app supports three primary payment methods: M-Pesa, Credit Card, and Digital Wallet. The design ensures a seamless, user-friendly experience with responsive layout, accessibility features, and comprehensive error handling.

## Architecture
- **Component**: `PaymentModal.tsx` - A modal dialog that handles payment method selection and processing
- **Integration**: Used within `CampusCafeteriaOrdering.tsx` for cafeteria-specific orders
- **Backend**: Integrates with `/payments` endpoint for processing transactions
- **State Management**: Uses Redux for cart and authentication state

## Payment Methods

### 1. Credit Card
**Features**:
- Input fields: Cardholder name, card number (formatted), expiration date (MM/YY), CVV, billing address (street, city, ZIP)
- Automatic formatting for card number and expiry
- Real-time validation with error messages
- Secure processing simulation

**UI Flow**:
```
Select Credit Card → Enter Details → Validate → Confirm → Process Payment
```

### 2. M-Pesa
**Features**:
- Input fields: Phone number, amount (pre-filled), reference (optional)
- Step-by-step instructions for Pay Bill process
- Business number: 123456, Account: CAFETERIA
- PIN entry on mobile device

**UI Flow**:
```
Select M-Pesa → Enter Phone → Confirm Details → Redirect to M-Pesa → Enter PIN → Payment Complete
```

### 3. Digital Wallet
**Features**:
- Supported wallets: PayPal, Apple Pay, Google Pay
- Wallet selection interface
- Authentication via biometric/PIN
- Automatic transaction confirmation

**UI Flow**:
```
Select Digital Wallet → Choose Wallet → Authenticate → Confirm Transaction → Payment Complete
```

## UI Components

### PaymentModal Structure
```
┌─────────────────────────────────────┐
│ Choose Payment Method               │
├─────────────────────────────────────┤
│ 💳 Credit Card                      │
│ 📱 M-Pesa                           │
│ 👛 Digital Wallet                   │
└─────────────────────────────────────┘
```

### Credit Card Form
```
Cardholder Name: [____________________]
Card Number:     [____ ____ ____ ____]
Expiry Date:     [__/__]    CVV: [___]
Billing Address: [____________________]
City:            [________] ZIP: [_____]
[Pay with Credit Card]
```

### M-Pesa Form
```
Phone Number: [0712345678]
Amount:       [KES 25.00] (read-only)
Reference:    [Order reference] (optional)

Instructions:
1. Click "Pay with M-Pesa" to open M-Pesa
2. Select "Lipa na M-Pesa" > "Pay Bill"
3. Enter Business Number: 123456
4. Enter Account Number: CAFETERIA
5. Enter Amount: 25.00
6. Enter your M-Pesa PIN and confirm

[Pay with M-Pesa]
```

### Digital Wallet Form
```
Select Wallet:
┌─────────┐ ┌─────────┐ ┌─────────┐
│ 🅿️      │ │ 🍎      │ │ 🤖      │
│ PayPal  │ │Apple Pay│ │GooglePay│
└─────────┘ └─────────┘ └─────────┘

Authenticate with PayPal
Use your device's biometric authentication or PIN.

[Pay with PayPal]
```

## Responsive Design
- **Desktop**: Full modal with side-by-side form fields
- **Mobile**: Stacked layout, single-column grids
- **Tablet**: Adaptive grid layouts

## Accessibility Features
- Keyboard navigation support
- Screen reader labels
- Focus indicators
- High contrast colors
- ARIA attributes

## Error Handling
- Field validation with specific error messages
- Network error handling
- Payment failure notifications
- Loading states with progress indicators

## Integration Points
- **Authentication**: Requires user login before payment
- **Cart Management**: Clears cart on successful payment
- **Order Creation**: Triggers order placement
- **Notifications**: Success/failure alerts

## Code Snippets

### PaymentModal Usage
```tsx
<PaymentModal
  isOpen={showPayment}
  onClose={() => setShowPayment(false)}
  total={total}
  onPaymentSuccess={handlePaymentSuccess}
/>
```

### Handle Payment Success
```tsx
const handlePaymentSuccess = (method: string) => {
  // Create order
  // Clear cart
  // Update loyalty points
  // Navigate to confirmation
};
```

## Security Considerations
- Client-side validation only (server validates too)
- No sensitive data stored in state
- HTTPS required for production
- PCI compliance for credit card processing

## Future Enhancements
- Integration with actual payment gateways
- Support for more digital wallets
- Biometric authentication
- Payment history and receipts
- Loyalty point redemption during payment