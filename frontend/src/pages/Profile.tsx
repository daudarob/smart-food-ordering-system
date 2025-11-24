import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../redux/store';
import { fetchUserOrders } from '../redux/ordersSlice';
import { updateProfile } from '../redux/authSlice';
// import io from 'socket.io-client';
import FormInput from '../components/FormInput';
import { formatTimestamp } from '../utils/timestamp';
import './Profile.css';

// const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');

const Profile: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { orders, loading, error } = useSelector((state: RootState) => state.orders);

  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchUserOrders());
    }
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
      });
    }
  }, [user]);

  // useEffect(() => {
  //   if (isAuthenticated && user) {
  //     socket.emit('join', user.id);

  //     socket.on('orderStatusUpdate', (data) => {
  //       dispatch(updateOrderStatus(data));
  //     });
  //   }

  //   return () => {
  //     socket.off('orderStatusUpdate');
  //   };
  // }, [isAuthenticated, user, dispatch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      await dispatch(updateProfile(profile));
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      alert('Failed to update profile');
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Reset profile to current user data
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
      });
    }
    setIsEditing(false);
  };

  if (!isAuthenticated) {
    return <div>Please log in to view your profile.</div>;
  }

  return (
    <div className="profile">
      <div className="user-info">
        <h2>Profile Information</h2>
        {isEditing ? (
          <>
            <FormInput label="Name" type="text" value={profile.name} onChange={handleChange} name="name" />
            <FormInput label="Email" type="email" value={profile.email} onChange={handleChange} name="email" />
            <FormInput label="Phone" type="tel" value={profile.phone} onChange={handleChange} name="phone" />
            <FormInput label="Address" type="text" value={profile.address} onChange={handleChange} name="address" />
            <div className="button-group">
              <button onClick={handleSave}>Save Changes</button>
              <button onClick={handleCancel} className="cancel-btn">Cancel</button>
            </div>
          </>
        ) : (
          <>
            <div className="profile-display">
              <div className="profile-field">
                <label>Name:</label>
                <span>{profile.name || 'Not set'}</span>
              </div>
              <div className="profile-field">
                <label>Email:</label>
                <span>{profile.email || 'Not set'}</span>
              </div>
              <div className="profile-field">
                <label>Phone:</label>
                <span>{profile.phone || 'Not set'}</span>
              </div>
              <div className="profile-field">
                <label>Address:</label>
                <span>{profile.address || 'Not set'}</span>
              </div>
            </div>
            <button onClick={handleEdit}>Edit Profile</button>
          </>
        )}
      </div>
      <div className="order-history">
        <h2>Order History</h2>
        {loading && <div>Loading orders...</div>}
        {error && <div>Error: {error}</div>}
        <ul>
          {orders.map(order => (
            <li key={order.id}>
              Order #{order.id} - {formatTimestamp(order.createdAt)} - {order.status} - KES {order.total}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Profile;