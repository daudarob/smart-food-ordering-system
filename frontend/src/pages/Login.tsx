import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState, AppDispatch } from '../redux/store';
import { loginUser, registerUser, clearError } from '../redux/authSlice';
import FormInput from '../components/FormInput';
import './Login.css';

const Login: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading, error, user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    console.log('🔄 Auth state changed:', { loading, error, user, isAuthenticated });
  }, [loading, error, user, isAuthenticated]);

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

    console.log('🔍 Auth attempt started');
    console.log('📧 Email:', formData.email);
    console.log('🔑 Password length:', formData.password.length);
    console.log('🔄 Is Login:', isLogin);

    try {
      let result;
      if (isLogin) {
        console.log('🚀 Dispatching loginUser...');
        result = await dispatch(loginUser({
          email: formData.email,
          password: formData.password
        }));
      } else {
        console.log('🚀 Dispatching registerUser...');
        result = await dispatch(registerUser({
          email: formData.email,
          password: formData.password,
          name: formData.name
        }));
      }

      console.log('📋 Dispatch result:', result);
      console.log('📋 Result type:', result.type);
      console.log('📋 Result payload:', result.payload);
      console.log('📋 Result meta:', result.meta);

      if (isLogin ? loginUser.fulfilled.match(result) : registerUser.fulfilled.match(result)) {
        const user = result.payload as any;
        console.log('✅ Auth successful, user:', user);
        alert(`${isLogin ? 'Logged in' : 'Registered'} as ${user.name} with role ${user.role}`);

        // Check localStorage
        const token = localStorage.getItem('token');
        console.log('💾 Token in localStorage:', !!token);

        // Navigate immediately without setTimeout
        const redirectPath = isLogin && user.role === 'cafeteria_admin' ? '/admin' : '/';
        console.log('🧭 Navigating to:', redirectPath);
        navigate(redirectPath);
      } else {
        console.log('❌ Auth failed, error:', result.payload);
        alert(`Authentication failed: ${result.payload}`);
      }
    } catch (error) {
      console.error('💥 Auth error caught:', error);
      alert(`Authentication error: ${error}`);
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
        {error && !loading && (
          <div className="error-message">
            <strong>Login Failed</strong>
            <span>Please check your email and password, then try again.</span>
          </div>
        )}
        <button onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Need to register?' : 'Already have an account?'}
        </button>
      </div>
    </div>
  );
};

export default Login;
