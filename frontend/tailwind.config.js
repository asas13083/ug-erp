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
      keyframes: {
        fadein: {
          '0%': { opacity: 0, transform: 'translateY(6px) scale(0.98)' },
          '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(20px, -25px) scale(1.08)' },
          '66%': { transform: 'translate(-15px, 15px) scale(0.95)' },
        },
        glow: { '0%, 100%': { opacity: 0.5 }, '50%': { opacity: 0.85 } },
      },
      animation: {
        fadein: 'fadein 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
        blob: 'blob 12s infinite ease-in-out',
        glow: 'glow 4s infinite ease-in-out',
      },
    },
  },
  plugins: [],
};
