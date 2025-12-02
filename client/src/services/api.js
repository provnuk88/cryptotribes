import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Token is set in authStore when logging in
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle specific error codes
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Token expired or invalid - clear auth state
          // This is handled by the auth store
          break;
        case 403:
          // Forbidden
          console.error('Access forbidden:', error.response.data?.message);
          break;
        case 429:
          // Rate limited
          console.error('Rate limited:', error.response.data?.message);
          break;
        case 500:
          // Server error
          console.error('Server error:', error.response.data?.message);
          break;
      }
    } else if (error.request) {
      // Network error
      console.error('Network error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
