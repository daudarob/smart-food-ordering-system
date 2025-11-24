import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { store } from './redux/store';
import { initializeAuth } from './redux/authSlice';
import { updateOrderStatus } from './redux/ordersSlice';
import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';
import { socketService } from './services/socketService';
import type { RootState } from './redux/store';
import Home from './pages/Home';
import Login from './pages/Login';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
import Cafeterias from './pages/Cafeterias';
import Offline from './pages/Offline';
import Header from './components/Header';
import './App.css';

// Firebase config (replace with your actual config)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase only if config is available
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'dummy_api_key') {
  try {
    const app = initializeApp(firebaseConfig);
    void getMessaging(app);
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
  }
} else {
  console.log('Firebase not configured for development - skipping initialization');
}

// Socket service will be initialized in AppContent component

const AppContent: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Initialize socket connection when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('Initializing socket connection for user:', user.id);
      socketService.connect(user.id);
    } else {
      socketService.disconnect();
    }

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, user]);

  return (
    <div className="app">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/cafeterias" element={<Cafeterias />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/offline" element={<Offline />} />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    store.dispatch(initializeAuth());
  }, []);

  return (
    <Provider store={store}>
      <Router>
        <AppContent />
      </Router>
    </Provider>
  );
};

export default App;