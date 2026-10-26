/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          darkest: '#0a0f1e',
          dark: '#0d1321',
          panel: '#111827',
          card: '#1e293b',
          border: '#334155',
        },
        accent: '#3b82f6',
        safe: '#22c55e',
        warning: '#f59e0b',
        critical: '#ef4444',
        flame: '#f97316',
        info: '#06b6d4',
        offline: '#6b7280',
      },
    },
  },
  plugins: [],
};
