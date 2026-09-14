import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Change this to your local IP or production URL
export const API_URL = 'http://localhost:4321/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach token to every request
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('rider_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
