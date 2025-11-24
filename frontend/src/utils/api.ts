import axios from 'axios';

// Extend window interface for CSRF token
declare global {
  interface Window {
    csrfToken?: string;
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000, // 10 second timeout
  withCredentials: true, // Enable sending cookies with requests
});

// Request retry logic
api.interceptors.request.use((config) => {
  // Add request ID for tracking
  (config as any).metadata = {
    startTime: Date.now(),
    requestId: Math.random().toString(36).substr(2, 9)
  };
  return config;
});

// Request interceptor to add JWT token and CSRF token
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add CSRF token for state-changing requests, except login
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '') && !config.url?.includes('/auth/login')) {
      try {
        // Get CSRF token if not already cached
        if (!window.csrfToken) {
          const csrfUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/csrf-token`;
          console.log('Frontend: Fetching CSRF token from', csrfUrl);
          const csrfResponse = await fetch(csrfUrl, {
            credentials: 'include'
          });
          if (csrfResponse.ok) {
            const csrfData = await csrfResponse.json();
            window.csrfToken = csrfData.csrfToken;
            console.log('Frontend: CSRF token fetched and cached:', window.csrfToken?.substring(0, 10) + '...');
          } else {
            console.error('Frontend: Failed to fetch CSRF token, status:', csrfResponse.status);
          }
        } else {
          console.log('Frontend: Using cached CSRF token');
        }

        if (window.csrfToken) {
          config.headers['X-CSRF-Token'] = window.csrfToken;
          console.log('Frontend: Added X-CSRF-Token header to request:', config.url);
        } else {
          console.warn('Frontend: No CSRF token available for request:', config.url);
          // Don't fail the request, just warn
        }
      } catch (error) {
        console.error('Frontend: Failed to get CSRF token:', error);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh or logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;

    // Network error (no response received)
    if (!response) {
      console.error('Network error:', error.message);
      // Show offline message or retry logic
      if (navigator.onLine) {
        // Online but server unreachable
        console.error('Server unreachable');
      } else {
        // User is offline
        console.error('User is offline');
      }
      return Promise.reject({
        ...error,
        message: 'Network error - please check your connection'
      });
    }

    // Handle different HTTP status codes
    switch (response.status) {
      case 401:
        // Token expired or invalid, logout user
        localStorage.removeItem('token');
        window.location.href = '/login';
        break;

      case 403:
        console.error('Access forbidden:', response.data?.error);
        break;

      case 404:
        console.error('Resource not found:', response.data?.error);
        break;

      case 429:
        console.error('Rate limited:', response.data?.error);
        // Could implement retry with backoff
        break;

      case 500:
      case 502:
      case 503:
      case 504:
        console.error('Server error:', response.data?.error);
        // Could show user-friendly message and retry
        break;

      default:
        console.error('API error:', response.data?.error);
    }

    return Promise.reject(error);
  }
);

// Add retry logic for failed requests
const retryRequest = async (error: any) => {
  const { config } = error;
  if (!config || !config.retry) return Promise.reject(error);

  config.retryCount = config.retryCount || 0;

  if (config.retryCount >= config.retry) {
    return Promise.reject(error);
  }

  config.retryCount += 1;

  const delay = config.retryDelay * Math.pow(2, config.retryCount - 1); // Exponential backoff

  return new Promise(resolve => {
    setTimeout(() => resolve(api(config)), delay);
  });
};

// Apply retry interceptor
api.interceptors.response.use(
  response => response,
  error => {
    // Only retry on network errors or 5xx server errors
    if (!error.response || (error.response.status >= 500 && error.response.status <= 599)) {
      return retryRequest(error);
    }
    return Promise.reject(error);
  }
);

// API functions
export const getCafeterias = () => api.get('/menu/cafeterias');

export default api;