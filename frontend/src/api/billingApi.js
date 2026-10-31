import { apiClient } from './axiosClient.js';

export const taxesApi = {
  list: (params) => apiClient.get('/taxes', { params }),
  getById: (id) => apiClient.get(`/taxes/${id}`),
  create: (data) => apiClient.post('/taxes', data),
  update: (id, data) => apiClient.patch(`/taxes/${id}`, data),
  delete: (id) => apiClient.delete(`/taxes/${id}`),
};

export const discountsApi = {
  list: (params) => apiClient.get('/discounts', { params }),
  getById: (id) => apiClient.get(`/discounts/${id}`),
  create: (data) => apiClient.post('/discounts', data),
  update: (id, data) => apiClient.patch(`/discounts/${id}`, data),
  delete: (id) => apiClient.delete(`/discounts/${id}`),
  validate: (code, orderAmount) => apiClient.post('/discounts/validate', { code, orderAmount }),
};

export const quotationsApi = {
  list: (params) => apiClient.get('/quotations', { params }),
  getById: (id) => apiClient.get(`/quotations/${id}`),
  create: (data) => apiClient.post('/quotations', data),
  update: (id, data) => apiClient.patch(`/quotations/${id}`, data),
  changeStatus: (id, status) => apiClient.post(`/quotations/${id}/status`, { status }),
  convert: (id, data) => apiClient.post(`/quotations/${id}/convert`, data),
  delete: (id) => apiClient.delete(`/quotations/${id}`),
};

export const subscriptionsApi = {
  list: (params) => apiClient.get('/subscriptions', { params }),
  getById: (id) => apiClient.get(`/subscriptions/${id}`),
  create: (data) => apiClient.post('/subscriptions', data),
  update: (id, data) => apiClient.patch(`/subscriptions/${id}`, data),
  cancel: (id, reason) => apiClient.post(`/subscriptions/${id}/cancel`, { reason }),
  pause: (id) => apiClient.post(`/subscriptions/${id}/pause`),
  resume: (id) => apiClient.post(`/subscriptions/${id}/resume`),
  renew: (id) => apiClient.post(`/subscriptions/${id}/renew`),
};

export const invoicesApi = {
  list: (params) => apiClient.get('/invoices', { params }),
  getById: (id) => apiClient.get(`/invoices/${id}`),
  create: (data) => apiClient.post('/invoices', data),
  post: (id) => apiClient.post(`/invoices/${id}/post`),
  void: (id, reason) => apiClient.post(`/invoices/${id}/void`, { reason }),
};

export const paymentsApi = {
  list: (params) => apiClient.get('/payments', { params }),
  getById: (id) => apiClient.get(`/payments/${id}`),
  create: (data) => apiClient.post('/payments', data),
  refund: (id, reason) => apiClient.post(`/payments/${id}/refund`, { reason }),
};

export const productsApi = {
  list: (params) => apiClient.get('/products', { params }),
  getById: (id) => apiClient.get(`/products/${id}`),
  create: (data) => apiClient.post('/products', data),
  update: (id, data) => apiClient.patch(`/products/${id}`, data),
  delete: (id) => apiClient.delete(`/products/${id}`),
  addVariant: (productId, data) => apiClient.post(`/products/${productId}/variants`, data),
  updateVariant: (productId, variantId, data) => apiClient.patch(`/products/${productId}/variants/${variantId}`, data),
  deleteVariant: (productId, variantId) => apiClient.delete(`/products/${productId}/variants/${variantId}`),
};

export const plansApi = {
  list: (params) => apiClient.get('/plans', { params }),
  getById: (id) => apiClient.get(`/plans/${id}`),
  create: (data) => apiClient.post('/plans', data),
  update: (id, data) => apiClient.patch(`/plans/${id}`, data),
  delete: (id) => apiClient.delete(`/plans/${id}`),
};

export const customersApi = {
  list: (params) => apiClient.get('/customers', { params }),
  getById: (id) => apiClient.get(`/customers/${id}`),
  create: (data) => apiClient.post('/customers', data),
  update: (id, data) => apiClient.patch(`/customers/${id}`, data),
  delete: (id) => apiClient.delete(`/customers/${id}`),
};

export const usersApi = {
  list: (params) => apiClient.get('/users', { params }),
  getById: (id) => apiClient.get(`/users/${id}`),
  createStaff: (data) => apiClient.post('/users/staff', data),
  update: (id, data) => apiClient.patch(`/users/${id}`, data),
  delete: (id) => apiClient.delete(`/users/${id}`),
};

