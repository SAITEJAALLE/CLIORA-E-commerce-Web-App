import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,          // use Vite proxy so origin stays 
  withCredentials: true,    // send/receive refresh_token cookie
});

// attaches access token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// auto-refresh once on 401, then retry original request
let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original?._retry) {
      try {
        original._retry = true;

        if (!refreshing) {
          refreshing = api.post('/auth/refresh'); // cookie-based refresh
        }
        const { data } = await refreshing;
        refreshing = null;

        if (data?.token) {
          localStorage.setItem('access_token', data.token);
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${data.token}`;
          return api(original);
        }
      } catch (e) {
        refreshing = null;
      }
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
    }
    return Promise.reject(error);
  }
);

export default api;
