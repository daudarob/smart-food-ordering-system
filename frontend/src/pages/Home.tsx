import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Footer from '../components/Footer';
import './Home.css';

const Home: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const slideshowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (slideshowRef.current) {
        const rect = slideshowRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const moveX = (x - centerX) / centerX * 10; // Adjust sensitivity
        const moveY = (y - centerY) / centerY * 10;

        slideshowRef.current.style.transform = `translate(${moveX}px, ${moveY}px)`;
      }
    };

    const slideshowElement = slideshowRef.current;
    if (slideshowElement) {
      slideshowElement.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (slideshowElement) {
        slideshowElement.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, []);

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h1>USIU-Africa Smart Food System</h1>
            <p className="hero-subtitle">
              Experience the future of campus dining with real-time updates, secure payments, and estimated wait times.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        {/* Enhanced Animated Background Slideshow with Parallax */}
        <div className="features-slideshow" ref={slideshowRef}>
          <div className="slide active">
            <img src="/whole-fish.jpg" alt="Fresh whole fish" />
          </div>
          <div className="slide">
            <img src="/tea.jpg" alt="Premium tea selection" />
          </div>
          <div className="slide">
            <img src="/salad.jpg" alt="Fresh vegetable salad" />
          </div>
          <div className="slide">
            <img src="/pizza.jpg" alt="Gourmet pizza" />
          </div>
          <div className="slide">
            <img src="/burger.jpg" alt="Juicy gourmet burger" />
          </div>
          <div className="slide">
            <img src="/cake.jpg" alt="Delicious cake dessert" />
          </div>
        </div>

        <div className="container">
          <h2><strong>{t('Why Choose Our Smart Food System?')}</strong></h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🍽️</div>
              <h3>{t('Real-time Menu Updates')}</h3>
              <p>{t('Always know what\'s available with live menu updates and stock tracking.')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💳</div>
              <h3>{t('Secure Payments')}</h3>
              <p>{t('Multiple payment options including M-Pesa and card payments with full security.')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>{t('Mobile Optimized')}</h3>
              <p>{t('Order from anywhere on campus with our responsive mobile-first design.')}</p>
            </div>
          </div>
        </div>
      </section>



      <Footer />
    </div>
  );
};

export default Home;
