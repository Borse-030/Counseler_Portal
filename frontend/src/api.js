const BASE_URL = 'http://localhost:5001/api';

let authToken = localStorage.getItem('token') || null;

const request = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
};

export const api = {
  setToken: (token) => {
    authToken = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  },
  
  getToken: () => authToken,
  
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  setCurrentUser: (user) => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  },

  // Auth API
  login: async (email, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    api.setToken(data.token);
    api.setCurrentUser(data.user);
    return data;
  },

  register: async (userData) => {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    api.setToken(data.token);
    api.setCurrentUser(data.user);
    return data;
  },

  logout: () => {
    api.setToken(null);
    api.setCurrentUser(null);
  },

  sendOtp: async (mobile, isSignUp = false) => {
    return request('/auth/mobile-otp-send', {
      method: 'POST',
      body: JSON.stringify({ mobile, isSignUp }),
    });
  },

  verifyOtp: async (mobile, otp) => {
    const data = await request('/auth/mobile-otp-verify', {
      method: 'POST',
      body: JSON.stringify({ mobile, otp }),
    });
    api.setToken(data.token);
    api.setCurrentUser(data.user);
    return data;
  },

  getCounselorAppointmentTypes: async (id) => {
    return request(`/counselors/${id}/appointment-types`);
  },

  // Counselors API
  getCounselors: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.specialty) params.append('specialty', filters.specialty);
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
    if (filters.minRating) params.append('minRating', filters.minRating);
    if (filters.search) params.append('search', filters.search);
    
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return request(`/counselors${queryStr}`);
  },

  getCounselor: async (id) => {
    return request(`/counselors/${id}`);
  },

  getCounselorAvailability: async (id) => {
    return request(`/counselors/${id}/availability`);
  },

  updateCounselorAvailability: async (availabilityData) => {
    return request('/counselors/availability', {
      method: 'PUT',
      body: JSON.stringify(availabilityData),
    });
  },

  getCounselorSlots: async (id, date) => {
    return request(`/counselors/${id}/slots?date=${date}`);
  },

  // Appointments API
  getAppointments: async () => {
    return request('/appointments');
  },

  getAppointment: async (id) => {
    return request(`/appointments/${id}`);
  },

  bookAppointment: async (bookingData) => {
    return request('/appointments', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  updateAppointment: async (id, updateData) => {
    return request(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  submitReview: async (id, rating, reviewText) => {
    return request(`/appointments/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ rating, reviewText }),
    });
  },

  // Admin API
  getAdminUsers: async () => {
    return request('/admin/users');
  },

  createAdminUser: async (userData) => {
    return request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  updateAdminUserStatus: async (id, statusData) => {
    return request(`/admin/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusData),
    });
  },

  getAdminTransactions: async () => {
    return request('/admin/transactions');
  },

  getAdminStats: async () => {
    return request('/admin/stats');
  },

  resetDatabase: async () => {
    return request('/admin/reset', {
      method: 'POST',
    });
  },

  // Notifications API
  getNotifications: async () => {
    return request('/notifications');
  },

  markNotificationRead: async (id) => {
    return request(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }
};
