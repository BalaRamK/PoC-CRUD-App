/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './public/index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary-orange)',
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        neutral: {
          50: '#F8FAFC',
          100: '#F3F5F8',
          200: '#E5E7EB',
          700: '#374151',
          800: '#1F2937',
        },
      },
      boxShadow: {
        soft: '0 6px 24px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        xl: '12px',
      },
    },
  },
  plugins: [],
};
