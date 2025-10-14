import React from 'react';
import './CartItem.css';

interface CartItemProps {
  id: string;
  name: string;
  price: number;
  quantity: number;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onRemove: (id: string) => void;
}

const CartItem: React.FC<CartItemProps> = ({ id, name, price, quantity, onIncrease, onDecrease, onRemove }) => {
  return (
    <div className="cart-item">
      <h4>{name}</h4>
      <p>KES {price.toFixed(2)} each</p>
      <div className="quantity-controls">
        <button onClick={() => onDecrease(id)}>-</button>
        <span>{quantity}</span>
        <button onClick={() => onIncrease(id)}>+</button>
      </div>
      <p>Subtotal: KES {(price * quantity).toFixed(2)}</p>
      <button onClick={() => onRemove(id)}>Remove</button>
    </div>
  );
};

export default CartItem;