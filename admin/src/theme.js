import { defaultTheme } from 'react-admin';
import { createTheme } from '@mui/material/styles';

const cryptoTribesTheme = createTheme({
  ...defaultTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: '#FFD700', // Gold
      light: '#FFE44D',
      dark: '#B8860B',
      contrastText: '#000',
    },
    secondary: {
      main: '#8B4513', // SaddleBrown
      light: '#A0522D',
      dark: '#654321',
      contrastText: '#fff',
    },
    background: {
      default: '#1a1a2e',
      paper: '#16213e',
    },
    error: {
      main: '#ff4444',
    },
    warning: {
      main: '#ffbb33',
    },
    success: {
      main: '#00C851',
    },
    info: {
      main: '#33b5e5',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#16213e',
          backgroundImage: 'linear-gradient(to right, #16213e, #1a1a2e)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0f0f23',
          backgroundImage: 'linear-gradient(180deg, #0f0f23 0%, #1a1a2e 100%)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#16213e',
          borderRadius: 12,
          border: '1px solid rgba(255, 215, 0, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    RaMenuItemLink: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '4px 8px',
          '&.RaMenuItemLink-active': {
            backgroundColor: 'rgba(255, 215, 0, 0.15)',
            borderLeft: '3px solid #FFD700',
          },
        },
      },
    },
  },
});

export default cryptoTribesTheme;
