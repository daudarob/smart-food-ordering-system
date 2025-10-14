import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home: React.FC = () => {
  return (
    <div className="home">
      <section className="hero">
        <h1>Welcome to USIU-A Smart Food System</h1>
        <p>Delicious food delivered to your door</p>
        <Link to="/menu">
          <button className="order-now-btn">Order Now</button>
        </Link>
      </section>
      <section className="featured-menu">
        <h2>Featured Menu</h2>
        <div className="carousel">
          {/* Placeholder for carousel */}
          <div className="featured-item">
            <img src="https://via.placeholder.com/200" alt="Pizza" />
            <h3>Pizza</h3>
            <p>Cheesy and delicious</p>
          </div>
          <div className="featured-item">
            <img src="https://via.placeholder.com/200" alt="Burger" />
            <h3>Burger</h3>
            <p>Juicy and tasty</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;