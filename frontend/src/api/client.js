import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5112';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 600000, // 10 minutes timeout for long-running pipeline requests
});

client.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('tfc_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected error occurred';
    if (error.response) {
      const detail = error.response.data?.detail;
      message = typeof detail === 'string' ? detail : JSON.stringify(detail || error.response.statusText);
      if (error.response.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('tfc_token');
        localStorage.removeItem('tfc_user');
      }
    } else if (error.request) {
      message = 'Network error: Backend server is unreachable';
    } else {
      message = error.message;
    }
    return Promise.reject(new Error(message));
  }
);

export default client;
