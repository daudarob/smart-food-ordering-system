import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../redux/store';
import { logout } from '../redux/authSlice';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import './Header.css';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  category_id: string;
  cafeteria_id: string;
  Category?: {
    name: string;
  };
}

const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MenuItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchError, setSearchError] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const handleScroll = () => {
      const header = document.querySelector('.header');
      if (header) {
        if (window.scrollY > 50) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      const searchContainer = document.querySelector('.search-container');
      if (searchContainer && !searchContainer.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchError('');
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);
    setSearchError('');

    try {
      const response = await api.get(`/menu?search=${encodeURIComponent(searchQuery.trim())}`);
      const results = response.data.items || response.data || [];
      setSearchResults(results);

      if (results.length === 0) {
        setSearchError('No items found matching your search');
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
      setSearchError('Search failed. Please try again later.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (!e.target.value.trim()) {
      setShowResults(false);
      setSearchResults([]);
      setSearchError('');
    }
  };

  const handleResultClick = (item: MenuItem) => {
    setShowResults(false);
    setSearchQuery('');
    navigate('/menu', { state: { searchItem: item, searchQuery } });
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    setSearchError('');
  };


  return (
    <header className="header" role="banner">
      <div className="logo">
        <Link to="/" aria-label="USIU-A Smart Food System Home">
          USIU-A Smart Food System
        </Link>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search for products..."
            value={searchQuery}
            onChange={handleSearchInputChange}
            className="search-input"
            aria-label="Search menu items"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="clear-button"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
          <button type="submit" className="search-button" aria-label="Search" disabled={isSearching}>
            {isSearching ? '⏳' : '🔍'}
          </button>
        </form>

        {/* Search Results Dropdown */}
        {showResults && (searchResults.length > 0 || isSearching || searchError) && (
          <div className="search-results">
            {isSearching ? (
              <div className="search-loading">Searching...</div>
            ) : searchResults.length > 0 ? (
              <>
                <div className="search-header">
                  <span>{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found</span>
                  <button
                    onClick={() => navigate('/menu', { state: { searchQuery } })}
                    className="view-all-button"
                  >
                    View all
                  </button>
                </div>
                <div className="search-items">
                  {searchResults.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="search-item"
                      onClick={() => handleResultClick(item)}
                    >
                      <div className="search-item-content">
                        <div className="search-item-name">{item.name}</div>
                        <div className="search-item-category">
                          {item.Category?.name || 'Uncategorized'}
                        </div>
                        <div className="search-item-price">KES {item.price}</div>
                      </div>
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="search-item-image"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : searchError ? (
              <div className="search-error-message">
                {searchError}
              </div>
            ) : (
              <div className="search-no-results">
                No products found for "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>

      <nav className={`nav ${isMenuOpen ? 'open' : ''}`} role="navigation" aria-label="Main navigation">
        <Link to="/" onClick={() => setIsMenuOpen(false)}>{t('Home')}</Link>
        <Link to="/menu" onClick={() => setIsMenuOpen(false)}>{t('Menu')}</Link>
        {isAuthenticated && user?.role !== 'cafeteria_admin' && (
          <Link to="/cafeterias" onClick={() => setIsMenuOpen(false)}>{t('Cafeterias')}</Link>
        )}
        {!isAuthenticated && (
          <Link to="/login" onClick={() => setIsMenuOpen(false)}>{t('Login')}</Link>
        )}
        {isAuthenticated && (
          <>
            <Link to="/cart" onClick={() => setIsMenuOpen(false)}>{t('Cart')}</Link>
            <Link to="/profile" onClick={() => setIsMenuOpen(false)}>{t('Profile')}</Link>
          </>
        )}
        {isAuthenticated && user?.role === 'cafeteria_admin' && (
          <Link to="/admin" onClick={() => setIsMenuOpen(false)}>{t('Admin Dashboard')}</Link>
        )}
      </nav>

      <div className="header-actions">

        {/* Language selector */}
        <div className="language-selector">
          <button
            onClick={() => changeLanguage('en')}
            aria-label="Switch to English"
            type="button"
            className={i18n.language === 'en' ? 'active' : ''}
          >
            EN
          </button>
          <button
            onClick={() => changeLanguage('sw')}
            aria-label="Switch to Swahili"
            type="button"
            className={i18n.language === 'sw' ? 'active' : ''}
          >
            SW
          </button>
        </div>

        {isAuthenticated ? (
          <>
            <span aria-live="polite" className="welcome-text">{t('Welcome')}, {user?.name}</span>
            <button
              onClick={handleLogout}
              aria-label={t('Logout from your account')}
              type="button"
              className="logout-btn"
            >
              {t('Logout')}
            </button>
          </>
        ) : (
          <Link to="/login" aria-label={t('Login to your account')}>
            <button type="button" className="cta-button">{t('Order Now')}</button>
          </Link>
        )}

        {/* Hamburger Menu */}
        <button
          className={`hamburger ${isMenuOpen ? 'open' : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
          aria-expanded={isMenuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  );
};

export default Header;
