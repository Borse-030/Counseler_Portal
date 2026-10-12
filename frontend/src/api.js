const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

import { consumeNotificationStream } from './utils/notificationStream';

let authToken = localStorage.getItem('token') || null;
let refreshToken = localStorage.getItem('refreshToken') || null;

let isRefreshing = false;

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

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && refreshToken && !isRefreshing && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
    try {
      isRefreshing = true;
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        api.setToken(refreshData.token || refreshData.accessToken);
        if (refreshData.refreshToken) {
          api.setRefreshToken(refreshData.refreshToken);
        }
        isRefreshing = false;
        return request(endpoint, options);
      }
    } catch (e) {
      console.error('Auto token refresh failed:', e);
    } finally {
      isRefreshing = false;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && (data.message === 'Invalid token' || data.message === 'Invalid token.' || data.message === 'Token expired')) {
      api.logout();
      window.dispatchEvent(new CustomEvent('auth-invalid-token'));
    }
    const error = new Error(data.message || 'Something went wrong');
    error.details = data;
    throw error;
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

  setRefreshToken: (token) => {
    refreshToken = token;
    if (token) {
      localStorage.setItem('refreshToken', token);
    } else {
      localStorage.removeItem('refreshToken');
    }
  },

  getToken: () => authToken,

  getRefreshToken: () => refreshToken,

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
    api.setRefreshToken(data.refreshToken);
    api.setCurrentUser(data.user);
    return data;
  },

  register: async (userData) => {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (data.token) {
      api.setToken(data.token);
      api.setRefreshToken(data.refreshToken);
      api.setCurrentUser(data.user);
    }
    return data;
  },

  logout: () => {
    api.setToken(null);
    api.setRefreshToken(null);
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
    if (data.token) {
      api.setToken(data.token);
      api.setRefreshToken(data.refreshToken);
      api.setCurrentUser(data.user);
    }
    return data;
  },

  verifyRegistrationOtp: async (mobile, otp) => {
    const data = await request('/auth/verify-registration-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile, otp }),
    });
    if (data.token) {
      api.setToken(data.token);
      api.setRefreshToken(data.refreshToken);
      api.setCurrentUser(data.user);
    }
    return data;
  },

  getProfile: async () => {
    const user = await request('/auth/profile');
    if (user) {
      api.setCurrentUser(user);
    }
    return user;
  },

  updateProfile: async (profileData) => {
    const data = await request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    if (data.user) {
      api.setCurrentUser(data.user);
    }
    return data;
  },

  refreshSession: async () => {
    const data = await request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    api.setToken(data.token);
    api.setRefreshToken(data.refreshToken);
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

  getCounselorSlots: async (id, date, duration = 60, appointmentType = '', excludeId = '') => {
    const params = new URLSearchParams({ date, duration: String(duration) });
    if (appointmentType) params.set('appointmentType', appointmentType);
    if (excludeId) params.set('excludeId', excludeId);
    return request(`/counselors/${id}/slots?${params}`);
  },

  getCounselorExceptions: id => request(`/counselors/${id}/exceptions`),
  addCounselorException: exception => request('/counselors/exceptions', { method: 'POST', body: JSON.stringify(exception) }),
  deleteCounselorException: id => request(`/counselors/exceptions/${id}`, { method: 'DELETE' }),

  // Appointments API
  editAppointmentSchedule: (id, schedule) => request(`/appointments/${id}/schedule`, {
    method: 'PUT', body: JSON.stringify(schedule),
  }),
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

  requestAppointment: async (requestData) => {
    return request('/session-requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  },

  getSessionRequests: async () => request('/session-requests'),

  assignSessionRequest: async (id, assignment) => request(`/session-requests/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify(assignment),
  }),

  decideSessionRequest: async (id, decision) => request(`/session-requests/${id}/decision`, {
    method: 'POST',
    body: JSON.stringify(decision),
  }),

  saveDiscoveryNotes: async (id, notes, discoveryPlan) => request(`/session-requests/${id}/discovery-notes`, {
    method: 'PUT',
    body: JSON.stringify({ notes, discoveryPlan }),
  }),

  assignFinalCounselor: async (id, assignment) => request(`/session-requests/${id}/final-assignment`, {
    method: 'POST',
    body: JSON.stringify(assignment),
  }),

  scheduleRequestSession: async (id, schedule) => request(`/session-requests/${id}/sessions`, {
    method: 'POST',
    body: JSON.stringify(schedule),
  }),

  closeSessionRequest: async (id) => request(`/session-requests/${id}/close`, { method: 'POST' }),

  updateAppointment: async (id, updateData) => {
    return request(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  recordSessionOutcome: async (id, data) => request(`/appointments/${id}/outcome`, { method: 'POST', body: JSON.stringify(data) }),
  requestReschedule: async (id, data) => request(`/appointments/${id}/reschedule-request`, { method: 'POST', body: JSON.stringify(data) }),
  reviewReschedule: async (id, data) => request(`/appointments/${id}/reschedule-review`, { method: 'POST', body: JSON.stringify(data) }),

  submitReview: async (id, reviewText) => {
    return request(`/appointments/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ reviewText }),
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
  getNotifications: async ({ cursor, filter = 'all', limit = 25, signal } = {}) => {
    const params = new URLSearchParams({ filter, limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return request(`/notifications?${params}`, { signal });
  },

  markAllNotificationsRead: (before) => request('/notifications/read-all', {
    method: 'PUT', body: JSON.stringify({ before }),
  }),

  // Fetch-based SSE keeps bearer tokens out of URLs and access logs.
  subscribeNotifications: (onEvent, onStatus) => {
    const controller = new AbortController();
    let timer;
    let delay = 1000;
    const connect = async () => {
      if (controller.signal.aborted || !authToken) return;
      try {
        onStatus('connecting');
        const response = await fetch(`${BASE_URL}/notifications/stream`, {
          headers: { Authorization: `Bearer ${authToken}`, Accept: 'text/event-stream' },
          signal: controller.signal,
        });
        if (response.status === 401) {
          await request('/notifications?limit=1', { signal: controller.signal });
          throw new Error('Reconnecting with refreshed session');
        }
        if (!response.ok || !response.body) throw new Error('Notification connection unavailable');
        onStatus('live');
        delay = 1000;
        await consumeNotificationStream(response.body, event => {
          if (!controller.signal.aborted) onEvent(event);
        });
      } catch {
        // The next connection reconciles any missed events.
      }
      if (!controller.signal.aborted && authToken) {
        onStatus('reconnecting');
        timer = setTimeout(connect, delay + Math.random() * 500);
        delay = Math.min(delay * 2, 30000);
      }
    };
    void connect();
    return () => { controller.abort(); clearTimeout(timer); };
  },

  markNotificationRead: async (id) => {
    return request(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }
};
