import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './redux/store';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import io from 'socket.io-client';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import CampusCafeteriaOrdering from './components/CampusCafeteriaOrdering';
import { fetchCategories, fetchMenuItems } from './redux/menuSlice';
import { updateOrderStatus } from './redux/ordersSlice';
import { updateOrderStatusLocally } from './redux/adminSlice';
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Socket.io client
const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');

const App: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchMenuItems());
  }, [dispatch]);

  useEffect(() => {
    // Request notification permission and get FCM token
    const requestNotificationPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const token = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
          if (token) {
            // Send token to backend to store for user
            console.log('FCM Token:', token);
            // TODO: Send token to backend API
          }
        }
      } catch (error) {
        console.error('Error getting notification permission:', error);
      }
    };

    requestNotificationPermission();

    // Handle incoming messages
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Message received:', payload);
      // Display notification
      if (payload.notification) {
        new Notification(payload.notification.title || 'Notification', {
          body: payload.notification.body || '',
          icon: '/vite.svg'
        });
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Socket.io connection
    if (isAuthenticated && user) {
      socket.emit('join', user.id);

      socket.on('orderStatusUpdate', (data) => {
        console.log('Order status update:', data);
        dispatch(updateOrderStatus({ orderId: data.orderId, status: data.status, updatedAt: data.updatedAt }));
      });

      socket.on('menuUpdated', () => {
        console.log('Menu updated, fetching latest menu items');
        dispatch(fetchMenuItems());
      });

      socket.on('orderStatusChanged', (data) => {
        console.log('Order status changed:', data);
        dispatch(updateOrderStatusLocally(data));
      });
    }

    return () => {
      socket.off('orderStatusUpdate');
      socket.off('menuUpdated');
      socket.off('orderStatusChanged');
    };
  }, [isAuthenticated, user]);

  return (
    <Router>
      <div className="app">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/cafeteria" element={<CampusCafeteriaOrdering />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;