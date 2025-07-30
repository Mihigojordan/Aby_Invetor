import axios  from 'axios';

export const API_URL = import.meta.env.VITE_API_URL
// Create an axios instance with a base URL
const api = axios.create({
  baseURL:API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
   
  },
  withCredentials:true
});

// Example usage
// api.get('/users') will make a request to https://api.example.com/users

export default api;