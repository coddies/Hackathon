import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

// Attach JWT access token to every outgoing request if present
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('skyflow_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Intercept responses to handle 401, 403, 409 etc.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        // Clear expired auth session if unauthorized
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
          localStorage.removeItem('skyflow_access_token');
          localStorage.removeItem('skyflow_refresh_token');
          localStorage.removeItem('skyflow_user');
          // Dispatched event so UI can react gracefully
          window.dispatchEvent(new CustomEvent('skyflow_auth_expired'));
        }
      }
    }
    return Promise.reject(error);
  }
);
