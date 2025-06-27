import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

export interface AuthorizedEmail {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
  created_by: number | null;
}

export interface Transaction {
  id: number;
  user_id: number;
  amount: number;
  description: string;
  created_at: string;
}

export interface CreateAuthorizedEmail {
  email: string;
  is_active?: boolean;
}

export interface UpdateAuthorizedEmail {
  is_active?: boolean;
}

export interface UpdateUser {
  email?: string;
  full_name?: string;
  is_active?: boolean;
  is_superuser?: boolean;
}

export const adminApi = {
  getAuthorizedEmails: async (): Promise<AuthorizedEmail[]> => {
    const response = await api.get('/admin-api/authorized-emails');
    return response.data;
  },

  createAuthorizedEmail: async (email: CreateAuthorizedEmail): Promise<AuthorizedEmail> => {
    const response = await api.post('/admin-api/authorized-emails', email);
    return response.data;
  },

  updateAuthorizedEmail: async (id: number, update: UpdateAuthorizedEmail): Promise<AuthorizedEmail> => {
    const response = await api.put(`/admin-api/authorized-emails/${id}`, update);
    return response.data;
  },

  deleteAuthorizedEmail: async (id: number): Promise<AuthorizedEmail> => {
    const response = await api.delete(`/admin-api/authorized-emails/${id}`);
    return response.data;
  },

  getUsers: async (): Promise<User[]> => {
    const response = await api.get('/admin-api/users');
    return response.data;
  },

  getUser: async (id: number): Promise<User> => {
    const response = await api.get(`/admin-api/users/${id}`);
    return response.data;
  },

  updateUser: async (id: number, update: UpdateUser): Promise<User> => {
    const response = await api.put(`/admin-api/users/${id}`, update);
    return response.data;
  },

  deleteUser: async (id: number): Promise<User> => {
    const response = await api.delete(`/admin-api/users/${id}`);
    return response.data;
  },

  getUserTransactions: async (id: number): Promise<Transaction[]> => {
    const response = await api.get(`/admin-api/users/${id}/transactions`);
    return response.data;
  },

  getUserBalance: async (id: number): Promise<number> => {
    const response = await api.get(`/admin-api/users/${id}/balance`);
    return response.data;
  },

  addCredits: async (id: number, amount: number, description: string): Promise<number> => {
    const response = await api.post(`/admin-api/users/${id}/add-credits`, null, {
      params: { amount, description }
    });
    return response.data;
  },
};

export default api; 