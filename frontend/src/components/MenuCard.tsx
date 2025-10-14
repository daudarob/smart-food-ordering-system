import React from 'react';
import './MenuCard.css';

interface MenuCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  onAddToCart: (id: string) => void;
}

const MenuCard: React.FC<MenuCardProps> = ({ id, name, description, price, image, onAddToCart }) => {
  return (
    <div className="menu-card">
      <img src={image} alt={name} className="menu-image" />
      <h3>{name}</h3>
      <p>{description}</p>
      <p className="price">KES {price.toFixed(2)}</p>
      <button onClick={() => onAddToCart(id)}>Add to Cart</button>
    </div>
  );
};

export default MenuCard;