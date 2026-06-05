import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({ baseURL: API_URL });

// 自動帶入 JWT Token
api.interceptors.request.use(config => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Token 過期自動登出
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (data) => api.post('/api/auth/login', data),
  register: (data) => api.post('/api/auth/register', data),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me'),
  changePassword: (data) => api.post('/api/auth/change-password', data),
};

export const quotesAPI = {
  list: (params) => api.get('/api/quotes', { params }),
  stats: () => api.get('/api/quotes/stats'),
  get: (id) => api.get(`/api/quotes/${id}`),
  create: (data) => api.post('/api/quotes', data),
  update: (id, data) => api.put(`/api/quotes/${id}`, data),
  delete: (id) => api.delete(`/api/quotes/${id}`),
  copy: (id) => api.post(`/api/quotes/${id}/copy`),
};

export const quotationsAPI = {
  list: () => api.get('/api/quotations'),
  get: (id) => api.get(`/api/quotations/${id}`),
  create: (data) => api.post('/api/quotations', data),
  update: (id, data) => api.put(`/api/quotations/${id}`, data),
  delete: (id) => api.delete(`/api/quotations/${id}`),
};

export const clientsAPI = {
  list: (params) => api.get('/api/clients', { params }),
  get: (id) => api.get(`/api/clients/${id}`),
  create: (data) => api.post('/api/clients', data),
  update: (id, data) => api.put(`/api/clients/${id}`, data),
  delete: (id) => api.delete(`/api/clients/${id}`),
};

export const usersAPI = {
  list: () => api.get('/api/users'),
  pending: () => api.get('/api/users/pending'),
  approve: (id) => api.post(`/api/users/${id}/approve`),
  reject: (id) => api.post(`/api/users/${id}/reject`),
  create: (data) => api.post('/api/users', data),
  update: (id, data) => api.put(`/api/users/${id}`, data),
  delete: (id) => api.delete(`/api/users/${id}`),
};

export default api;
