import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../redux/store';
import { addItem } from '../redux/cartSlice';
import MenuCard from '../components/MenuCard';
import './Menu.css';

const Menu: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: menuItems, categories, loading, error } = useSelector((state: RootState) => state.menu);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categoryNames = ['All', ...categories.map(cat => cat.name)];
  const filteredItems = selectedCategory === 'All' ? menuItems : menuItems.filter(item => item.Category?.name === selectedCategory);

  const handleAddToCart = (id: string) => {
    const item = menuItems.find(item => item.id === id);
    if (item) {
      dispatch(addItem({ id: item.id, name: item.name, price: item.price, quantity: 1 }));
    }
  };

  if (loading) return <div className="loading">Loading menu...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="menu">
      <div className="filters">
        {categoryNames.map(category => (
          <button key={category} onClick={() => setSelectedCategory(category)} className={selectedCategory === category ? 'active' : ''}>
            {category}
          </button>
        ))}
      </div>
      <div className="menu-grid">
        {filteredItems.map(item => (
          <MenuCard
            key={item.id}
            id={item.id}
            name={item.name}
            description={item.description}
            price={item.price}
            image={item.image_url}
            onAddToCart={handleAddToCart}
          />
        ))}
      </div>
    </div>
  );
};

export default Menu;