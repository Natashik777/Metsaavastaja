/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 34px rgba(16, 185, 129, 0.22)',
      },
    },
  },
  plugins: [],
};
