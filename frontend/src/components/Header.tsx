import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../redux/store';
import { logout } from '../redux/authSlice';
import './Header.css';

const Header: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <header className="header">
      <div className="logo">
        <Link to="/">USIU-A Smart Food System</Link>
      </div>
      <nav className="nav">
        <Link to="/">Home</Link>
        <Link to="/menu">Menu</Link>
        {(!isAuthenticated || user?.role !== 'admin') && <Link to="/cafeteria">Cafeterias</Link>}
        <Link to="/cart">Cart</Link>
        {isAuthenticated && <Link to="/profile">Profile</Link>}
        {isAuthenticated && user?.role === 'admin' && <Link to="/admin">Admin Dashboard</Link>}
      </nav>
      <div className="auth-buttons">
        {isAuthenticated ? (
          <>
            <span>Welcome, {user?.name}</span>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <Link to="/login">
            <button>Login</button>
          </Link>
        )}
      </div>
    </header>
  );
};

export default Header;