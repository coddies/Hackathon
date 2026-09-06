import { apiClient } from './client';
import type { UserResponse, TokenResponse, UserRole } from '../types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name?: string;
  role?: UserRole;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>('/auth/login', payload);
    return res.data;
  },

  register: async (payload: RegisterPayload): Promise<UserResponse> => {
    const res = await apiClient.post<UserResponse>('/auth/register', payload);
    return res.data;
  },

  getMe: async (): Promise<UserResponse> => {
    const res = await apiClient.get<UserResponse>('/auth/me');
    return res.data;
  },

  refreshToken: async (refreshToken: string): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>('/auth/refresh', { refresh_token: refreshToken });
    return res.data;
  },
};
