/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12151C',
        inksoft: '#1B1F29',
        inkline: '#262B37',
        silver: '#C7CCD6',
        silversoft: '#EEF0F3',
      },
    },
  },
  plugins: [],
};
