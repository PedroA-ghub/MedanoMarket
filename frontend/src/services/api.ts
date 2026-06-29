import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

api.interceptors.request.use((config) => {
  const csrfToken = getCookie('csrftoken');
  if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
    config.headers['X-CSRFToken'] = csrfToken;
  }
  return config;
});

export const authService = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login/', { email, password });
    return data;
  },
  register: async (data: {
    email: string;
    username?: string;
    password1: string;
    password2: string;
    profile_picture?: File;
    age?: number;
    identity_card?: string;
  }) => {
    const formData = new FormData();
    formData.append('email', data.email);
    if (data.username) formData.append('username', data.username);
    formData.append('password1', data.password1);
    formData.append('password2', data.password2);
    if (data.profile_picture) formData.append('profile_picture', data.profile_picture);
    if (data.age) formData.append('age', String(data.age));
    if (data.identity_card) formData.append('identity_card', data.identity_card);

    const response = await api.post('/auth/register/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  resendVerification: async (email: string) => {
    const { data } = await api.post('/auth/resend_verification/', { email });
    return data;
  },
  logout: async () => {
    const { data } = await api.post('/auth/logout/');
    return data;
  },
  me: async () => {
    const { data } = await api.get('/auth/me/');
    return data;
  },
  csrf: async () => {
    const { data } = await api.get('/auth/csrf/');
    return data;
  },
  updateProfile: async (data: {
    username?: string;
    email?: string;
    age?: number | null;
    identity_card?: string;
    profile_picture?: File | null;
    onboarding_complete?: string;
  }) => {
    const formData = new FormData();
    if (data.username) formData.append('username', data.username);
    if (data.email) formData.append('email', data.email);
    if (data.age !== undefined) formData.append('age', data.age !== null ? String(data.age) : '');
    if (data.identity_card) formData.append('identity_card', data.identity_card);
    if (data.profile_picture) formData.append('profile_picture', data.profile_picture);
    if (data.onboarding_complete) formData.append('onboarding_complete', data.onboarding_complete);

    const response = await api.put('/auth/update_profile/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export const productService = {
  list: async () => {
    const { data } = await api.get('/products/');
    return data.results ?? data;
  },
  get: async (id: number) => {
    const { data } = await api.get(`/products/${id}/`);
    return data;
  },
  search: async (params: {
    q?: string;
    min_price?: number;
    max_price?: number;
    location?: string;
    in_stock?: boolean;
    ordering?: string;
  }) => {
    const { data } = await api.get('/products/search/', { params });
    return data.results ?? data;
  },
  create: async (formData: FormData) => {
    const { data } = await api.post('/products/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  update: async (id: number, formData: FormData) => {
    const { data } = await api.put(`/products/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  delete: async (id: number) => {
    const { data } = await api.delete(`/products/${id}/`);
    return data;
  },
};

export const wishlistService = {
  list: async () => {
    const { data } = await api.get('/wishlist/');
    return data.results ?? data;
  },
  add: async (productId: number) => {
    const { data } = await api.post('/wishlist/add/', { product_id: productId });
    return data;
  },
  remove: async (productId: number) => {
    const { data } = await api.delete(`/wishlist/remove/?product_id=${productId}`);
    return data;
  },
};

export const cartService = {
  list: async () => {
    const { data } = await api.get('/cart/');
    return data.results ?? data;
  },
  add: async (productId: number, quantity: number = 1) => {
    const { data } = await api.post('/cart/add/', { product_id: productId, quantity });
    return data;
  },
  remove: async (productId: number) => {
    const { data } = await api.delete(`/cart/remove/?product_id=${productId}`);
    return data;
  },
  updateQuantity: async (productId: number, quantity: number) => {
    const { data } = await api.put('/cart/update_quantity/', { product_id: productId, quantity });
    return data;
  },
  clear: async () => {
    const { data } = await api.delete('/cart/clear/');
    return data;
  },
};

export const orderService = {
  list: async () => {
    const { data } = await api.get('/orders/');
    return data.results ?? data;
  },
  get: async (id: string) => {
    const { data } = await api.get(`/orders/${id}/`);
    return data;
  },
  create: async (productId: number, shippingAddress: string, quantity: number = 1) => {
    const { data } = await api.post('/orders/', {
      product_id: productId,
      shipping_address: shippingAddress,
      quantity,
    });
    return data;
  },
  createMultiItem: async (items: { product_id: number; quantity: number }[], shippingAddress: string = '') => {
    const { data } = await api.post('/orders/', { items, shipping_address: shippingAddress });
    return data;
  },
  deliver: async (id: string) => {
    const { data } = await api.post(`/orders/${id}/deliver/`);
    return data;
  },
  pay: async (id: string, paymentMethod: string, notes: string = '') => {
    const { data } = await api.post(`/orders/${id}/pay/`, {
      payment_method: paymentMethod,
      notes,
    });
    return data;
  },
  cancel: async (id: string) => {
    const { data } = await api.post(`/orders/${id}/cancel/`);
    return data;
  },
  sendMessage: async (id: string, content: string) => {
    const { data } = await api.post(`/orders/${id}/messages/`, { content });
    return data;
  },
};

export const proService = {
  dashboard: async () => {
    const { data } = await api.get('/pro/dashboard/');
    return data;
  },
  upgrade: async () => {
    const { data } = await api.post('/pro/upgrade/');
    return data;
  },
  sendProof: async (image: File) => {
    const formData = new FormData();
    formData.append('image', image);
    const { data } = await api.post('/pro/send_proof/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  toggleFeatured: async (productId: number) => {
    const { data } = await api.post(`/pro/${productId}/toggle_featured/`);
    return data;
  },
};

export const exchangeRateService = {
  getRate: async () => {
    const { data } = await api.get('/exchange-rate/current/');
    return data;
  },
};

export const reportService = {
  reportUser: async (payload: {
    reported_user_id: string;
    reason: string;
    description: string;
    related_product_id?: number;
    related_order_id?: string;
  }) => {
    const { data } = await api.post('/reports/', payload);
    return data;
  },
};

export default api;
