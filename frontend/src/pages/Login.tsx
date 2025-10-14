import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState, AppDispatch } from '../redux/store';
import { loginUser, registerUser, clearError } from '../redux/authSlice';
import FormInput from '../components/FormInput';
import './Login.css';

const Login: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading, error, user } = useSelector((state: RootState) => state.auth);

  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
   e.preventDefault();
   dispatch(clearError());

   if (isLogin) {
     const result = await dispatch(loginUser({ email: formData.email, password: formData.password }));
     if (loginUser.fulfilled.match(result)) {
       alert(`Logged in as ${result.payload.name} with role ${result.payload.role}`);
       navigate(result.payload.role === 'admin' ? '/admin' : '/');
     }
   } else {
     const result = await dispatch(registerUser({
       email: formData.email,
       password: formData.password,
       name: formData.name
     }));
     if (registerUser.fulfilled.match(result)) {
       navigate('/');
     }
   }
 };

  return (
    <div className="login">
      <div className="login-container">
        <h2>{isLogin ? 'Login' : 'Register'}</h2>
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <FormInput
              label="Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          )}
          <FormInput
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <FormInput
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        <button onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Need to register?' : 'Already have an account?'}
        </button>
      </div>
    </div>
  );
};

export default Login;
