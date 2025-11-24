import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../redux/store';
import { getCafeterias } from '../utils/api';
import CafeteriaCardSkeleton from '../components/CafeteriaCardSkeleton';
import './Cafeterias.css';

interface Cafeteria {
  id: string;
  name: string;
  image_url?: string;
}

const Cafeterias: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [cafeterias, setCafeterias] = useState<Cafeteria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Redirect cafeteria admins to admin dashboard
  useEffect(() => {
    if (isAuthenticated && user?.role === 'cafeteria_admin') {
      navigate('/admin');
      return;
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const fetchCafeterias = async () => {
      try {
        setLoading(true);
        const response = await getCafeterias();
        setCafeterias(response.data);
      } catch (err: any) {
        console.error('Failed to fetch cafeterias:', err);
        setError('Failed to load cafeterias. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchCafeterias();
  }, []);

  const handleCafeteriaClick = (cafeteria: Cafeteria) => {
    // Navigate to menu with selected cafeteria
    navigate(`/menu?cafeteria=${cafeteria.id}`);
  };

  if (loading) {
    return (
      <div className="cafeterias">
        <div className="container">
          <h1>Choose Your Cafeteria</h1>
          <div className="cafeterias-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <CafeteriaCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cafeterias">
        <div className="container">
          <h1>Choose Your Cafeteria</h1>
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="cafeterias">
      <div className="container">
        <h1>Choose Your Cafeteria</h1>
        <p>Select a cafeteria to browse its menu and place your order.</p>
        <div className="cafeterias-grid">
          {cafeterias.map((cafeteria) => (
            <div
              key={cafeteria.id}
              className="cafeteria-card"
              onClick={() => handleCafeteriaClick(cafeteria)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && handleCafeteriaClick(cafeteria)}
              aria-label={`Select ${cafeteria.name} cafeteria`}
            >
              <div className="cafeteria-image">
                {cafeteria.image_url ? (
                  <img src={cafeteria.image_url} alt={cafeteria.name} />
                ) : (
                  <div className="cafeteria-placeholder">🍽️</div>
                )}
              </div>
              <div className="cafeteria-info">
                <h3>{cafeteria.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Cafeterias;