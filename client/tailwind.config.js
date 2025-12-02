/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark medieval theme
        primary: {
          50: '#fef3e2',
          100: '#fde4c4',
          200: '#fbc993',
          300: '#f7a754',
          400: '#f4892a',
          500: '#eb6b0a', // Gold/amber
          600: '#c44f07',
          700: '#a33a0b',
          800: '#852f10',
          900: '#6d280f',
        },
        secondary: {
          50: '#f4f6f7',
          100: '#e3e7ea',
          200: '#c9d1d7',
          300: '#a4b0bb',
          400: '#788997',
          500: '#5d6e7c',
          600: '#4f5c69',
          700: '#444e58',
          800: '#3c444c', // Slate
          900: '#353b42',
        },
        accent: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#b9e5fe',
          300: '#7cd3fd',
          400: '#36befa',
          500: '#0ca5eb',
          600: '#0083c9', // Royal blue
          700: '#0169a3',
          800: '#055886',
          900: '#0a496f',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        // Game-specific
        gold: '#fbbf24',
        vp: '#8b5cf6',
        militia: '#94a3b8',
        spearman: '#3b82f6',
        archer: '#22c55e',
        cavalry: '#f97316',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Cinzel', 'serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'parchment': 'url("/textures/parchment.png")',
      },
      boxShadow: {
        'inner-lg': 'inset 0 4px 8px 0 rgb(0 0 0 / 0.15)',
        'glow': '0 0 20px rgb(251 191 36 / 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
