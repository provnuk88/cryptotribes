import React, { useState } from 'react';
import { useLogin, useNotify } from 'react-admin';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

import { getWalletNonce } from '../authProvider';

const LoginPage = () => {
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = useLogin();
  const notify = useNotify();

  const handleSuperAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login({ username: email, password });
      notify('Login successful', { type: 'success' });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWalletLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // Check if MetaMask is available
      if (!window.ethereum) {
        throw new Error('MetaMask not found. Please install MetaMask to use wallet login.');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please connect your wallet.');
      }

      const walletAddress = accounts[0].toLowerCase();

      // Get nonce from server
      const nonce = await getWalletNonce(walletAddress);

      // Sign message
      const message = `CryptoTribes Admin Login\nNonce: ${nonce}`;
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, walletAddress],
      });

      // Login with signature
      await login({ walletAddress, signature });
      notify('Wallet login successful', { type: 'success' });
    } catch (err) {
      setError(err.message || 'Wallet login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      }}
    >
      <Card sx={{ minWidth: 400, maxWidth: 450 }}>
        <CardContent>
          <Box textAlign="center" mb={3}>
            <Typography variant="h4" color="primary" gutterBottom>
              CryptoTribes
            </Typography>
            <Typography variant="h6" color="textSecondary">
              Admin Panel
            </Typography>
          </Box>

          <Tabs
            value={tab}
            onChange={(_, newValue) => setTab(newValue)}
            variant="fullWidth"
            sx={{ mb: 3 }}
          >
            <Tab icon={<LockIcon />} label="Super Admin" />
            <Tab icon={<AccountBalanceWalletIcon />} label="Wallet" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {tab === 0 && (
            <form onSubmit={handleSuperAdminLogin}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
                margin="normal"
                autoComplete="email"
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
                margin="normal"
                autoComplete="current-password"
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Login as Super Admin'}
              </Button>
            </form>
          )}

          {tab === 1 && (
            <Box>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Connect your authorized wallet to login as Game Master or Moderator.
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                size="large"
                onClick={handleWalletLogin}
                disabled={loading}
                startIcon={<AccountBalanceWalletIcon />}
              >
                {loading ? <CircularProgress size={24} /> : 'Connect Wallet'}
              </Button>
            </Box>
          )}

          <Box mt={3} textAlign="center">
            <Typography variant="caption" color="textSecondary">
              Authorized personnel only. All actions are logged.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
