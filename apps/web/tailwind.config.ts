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
          graphite: '#7b7b7b',
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
        'aqua-button': 'linear-gradient(to bottom, #ffffff, #e8e8e8)',
        'aqua-button-hover': 'linear-gradient(to bottom, #f8f8f8, #e0e0e0)',
        'aqua-button-active': 'linear-gradient(to bottom, #e0e0e0, #d8d8d8)',
        pinstripe: 'repeating-linear-gradient(0deg, #e9edf3 0 2px, #f7f9fc 2px 6px)',
      },
      borderRadius: {
        aqua: '10px',
      },
      boxShadow: {
        'aqua-window': '0 1px 0 #fff inset, 0 8px 24px rgba(0, 0, 0, 0.15)',
        'aqua-button': '0 1px 2px rgba(0, 0, 0, 0.1)',
        'aqua-button-active': '0 1px 1px rgba(0, 0, 0, 0.15) inset',
      },
    },
  },
};

export default config;

