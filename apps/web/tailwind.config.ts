import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        aqua: {
          blue: '#5A8DD9',
          'blue-hover': '#6B9DE5',
          'blue-active': '#4978C8',
          'blue-border': '#0066cc',
          'blue-border-hover': '#0072dd',
          graphite: '#7b7b7b',
          'button-border': '#a0a0a0',
          'button-border-dark': '#8a8a8a',
        },
        bezel: {
          dark: '#7b7b7b',
          light: '#ffffff',
        },
      },
      fontFamily: {
        ui: [
          'Lucida Grande',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      backgroundImage: {
        'aqua-window': 'linear-gradient(to bottom, #f6f8fb, #e7ebf3)',
        'aqua-titlebar': 'linear-gradient(to bottom, #fdfefe, #ecf1f7)',
        'aqua-button': 'linear-gradient(to bottom, #ffffff 0%, #f5f5f5 30%, #e8e8e8 70%, #e0e0e0 100%)',
        'aqua-button-hover': 'linear-gradient(to bottom, #fefefe 0%, #f0f0f0 30%, #e3e3e3 70%, #dbdbdb 100%)',
        'aqua-button-active': 'linear-gradient(to bottom, #e0e0e0 0%, #d8d8d8 50%, #d0d0d0 100%)',
        'aqua-button-blue': 'linear-gradient(to bottom, #6bb7ff 0%, #5dafff 30%, #1e8fff 70%, #0a7aff 100%)',
        'aqua-button-blue-hover': 'linear-gradient(to bottom, #7dc7ff 0%, #6bb7ff 30%, #2e98ff 70%, #1a8aff 100%)',
        'aqua-button-blue-active': 'linear-gradient(to bottom, #4fa0ff 0%, #3d8fff 30%, #0e78ff 70%, #0060dd 100%)',
        pinstripe: 'repeating-linear-gradient(0deg, #e9edf3 0 2px, #f7f9fc 2px 6px)',
      },
      borderRadius: {
        aqua: '10px',
        'aqua-sm': '6px',
        'aqua-button': '4px',
      },
      boxShadow: {
        'aqua-window': '0 1px 0 #fff inset, 0 8px 24px rgba(0, 0, 0, 0.15)',
        'aqua-button': 'inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 1px 2px rgba(0, 0, 0, 0.1)',
        'aqua-button-active': 'inset 1px 1px 2px rgba(0, 0, 0, 0.15), inset -1px -1px 0 rgba(255, 255, 255, 0.3)',
        'aqua-button-blue': 'inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 1px 2px rgba(0, 0, 0, 0.25)',
        'aqua-button-blue-active': 'inset 0 1px 3px rgba(0, 0, 0, 0.3), inset 0 -1px 0 rgba(255, 255, 255, 0.2)',
      },
    },
  },
};

export default config;

