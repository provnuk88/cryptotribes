import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      // Wallet connection and authentication
      connectWallet: async () => {
        if (typeof window.ethereum === 'undefined') {
          set({ error: 'MetaMask is not installed' });
          return null;
        }

        try {
          set({ isLoading: true, error: null });
          const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts',
          });
          set({ isLoading: false });
          return accounts[0];
        } catch (error) {
          set({ isLoading: false, error: error.message });
          return null;
        }
      },

      login: async (walletAddress) => {
        try {
          set({ isLoading: true, error: null });

          // Get nonce from server (GET with wallet address in path)
          const { data: nonceResponse } = await api.get(`/api/v1/auth/nonce/${walletAddress}`);
          const nonceData = nonceResponse.data;

          // Sign the message (use exact message from server)
          const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [nonceData.message, walletAddress],
          });

          // Authenticate with server
          const { data: loginResponse } = await api.post('/api/v1/auth/login', {
            walletAddress,
            signature,
          });
          const loginData = loginResponse.data;

          // Set authentication state
          set({
            user: loginData.user,
            token: loginData.accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Set token in API client
          api.defaults.headers.common['Authorization'] = `Bearer ${loginData.accessToken}`;

          return loginData;
        } catch (error) {
          set({
            isLoading: false,
            error: error.response?.data?.message || error.message,
          });
          throw error;
        }
      },

      register: async (walletAddress, displayName) => {
        try {
          set({ isLoading: true, error: null });

          // Get nonce from server (GET with wallet address in path)
          const { data: nonceResponse } = await api.get(`/api/v1/auth/nonce/${walletAddress}`);
          const nonceData = nonceResponse.data;

          // Sign the message (use exact message from server)
          const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [nonceData.message, walletAddress],
          });

          // Register with server
          const { data: registerResponse } = await api.post('/api/v1/auth/register', {
            walletAddress,
            signature,
            displayName,
            nonce: nonceData.nonce,
          });
          const registerData = registerResponse.data;

          // Set authentication state
          set({
            user: registerData.user,
            token: registerData.accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Set token in API client
          api.defaults.headers.common['Authorization'] = `Bearer ${registerData.accessToken}`;

          return registerData;
        } catch (error) {
          set({
            isLoading: false,
            error: error.response?.data?.message || error.message,
          });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
        delete api.defaults.headers.common['Authorization'];
      },

      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData },
        }));
      },

      // Restore session on app load
      restoreSession: async () => {
        const { token } = get();
        if (!token) return;

        try {
          set({ isLoading: true });
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          const { data: meResponse } = await api.get('/api/v1/auth/me');
          set({
            user: meResponse.data,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          // Token invalid, clear session
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
          delete api.defaults.headers.common['Authorization'];
        }
      },
    }),
    {
      name: 'cryptotribes-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
