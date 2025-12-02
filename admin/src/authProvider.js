/**
 * React-Admin Auth Provider for CryptoTribes Admin Panel
 * Supports both Super Admin (email/password) and GM/Moderator (wallet) login
 */

const API_URL = '/api/admin';

const authProvider = {
  // Called when user submits login form
  login: async ({ username, password, walletAddress, signature }) => {
    // Wallet-based login for GM/Moderator
    if (walletAddress && signature) {
      const response = await fetch(`${API_URL}/auth/login/wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, signature }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Wallet login failed');
      }

      const { data } = await response.json();
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.admin));
      localStorage.setItem('adminPermissions', JSON.stringify(data.permissions));
      return;
    }

    // Email/password login for Super Admin
    const response = await fetch(`${API_URL}/auth/login/super`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Login failed');
    }

    const { data } = await response.json();
    localStorage.setItem('adminToken', data.token);
    localStorage.setItem('adminUser', JSON.stringify(data.admin));
    localStorage.setItem('adminPermissions', JSON.stringify(data.permissions));
  },

  // Called when user clicks logout button
  logout: async () => {
    const token = localStorage.getItem('adminToken');

    if (token) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (e) {
        // Ignore logout errors
      }
    }

    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminPermissions');
    return '/login';
  },

  // Called when API returns an error
  checkError: ({ status }) => {
    if (status === 401 || status === 403) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('adminPermissions');
      return Promise.reject();
    }
    return Promise.resolve();
  },

  // Called when user navigates to a new location
  checkAuth: async () => {
    const token = localStorage.getItem('adminToken');

    if (!token) {
      throw new Error('No token found');
    }

    // Verify token is still valid
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('adminPermissions');
        throw new Error('Token invalid');
      }

      const { data } = await response.json();
      // Update stored user data
      localStorage.setItem('adminUser', JSON.stringify(data.admin));
      localStorage.setItem('adminPermissions', JSON.stringify(data.permissions));
    } catch (e) {
      throw new Error('Authentication check failed');
    }
  },

  // Called when user identity is needed
  getIdentity: () => {
    try {
      const userStr = localStorage.getItem('adminUser');
      const user = (userStr && userStr !== 'undefined') ? JSON.parse(userStr) : {};
      return Promise.resolve({
        id: user.id || user._id || 'guest',
        fullName: user.username || 'Admin',
        avatar: undefined,
        role: user.role || 'guest',
      });
    } catch (e) {
      return Promise.resolve({
        id: 'guest',
        fullName: 'Guest',
        avatar: undefined,
        role: 'guest',
      });
    }
  },

  // Called to check user permissions
  getPermissions: () => {
    try {
      const permStr = localStorage.getItem('adminPermissions');
      const userStr = localStorage.getItem('adminUser');

      // Handle null, undefined, or 'undefined' string
      const permissions = (permStr && permStr !== 'undefined')
        ? JSON.parse(permStr)
        : [];
      const user = (userStr && userStr !== 'undefined')
        ? JSON.parse(userStr)
        : {};

      return Promise.resolve({
        role: user.role || 'guest',
        permissions,
      });
    } catch (e) {
      console.error('getPermissions error:', e);
      return Promise.resolve({ role: 'guest', permissions: [] });
    }
  },
};

// Helper to get nonce for wallet login
export const getWalletNonce = async (walletAddress) => {
  const response = await fetch(`${API_URL}/auth/nonce/${walletAddress}`);
  if (!response.ok) {
    throw new Error('Failed to get nonce');
  }
  const { data } = await response.json();
  return data.nonce;
};

export default authProvider;
