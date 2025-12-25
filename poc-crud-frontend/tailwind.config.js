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
          50: '#FFF4F0',
          100: '#FFE4DC',
          200: '#FAD0BF',
          300: '#F8B6A1',
          400: '#F58B6D',
          500: '#F06649',
          600: '#E45536',
          700: '#D13F23',
          800: '#B9361F',
          900: '#8A2817',
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
