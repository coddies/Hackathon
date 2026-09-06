/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F7F9FC',
        surface: {
          DEFAULT: '#FFFFFF',
          soft: '#F1F5F9',
        },
        navy: {
          DEFAULT: '#102A43',
          dark: '#0A1A2A',
          light: '#243B53',
        },
        brandText: {
          DEFAULT: '#243B53',
          muted: '#627D98',
        },
        brandBorder: {
          DEFAULT: '#D9E2EC',
          light: '#E2E8F0',
        },
        primary: {
          DEFAULT: '#1976D2',
          hover: '#125EA8',
          light: '#E3F2FD',
          50: '#F0F7FF',
          100: '#E0EFFF',
          500: '#1976D2',
          600: '#125EA8',
          700: '#0C4A80',
        },
        success: {
          DEFAULT: '#059669',
          light: '#ECFDF5',
          border: '#A7F3D0',
        },
        warning: {
          DEFAULT: '#D97706',
          light: '#FFFBEB',
          border: '#FDE68A',
        },
        danger: {
          DEFAULT: '#DC2626',
          light: '#FEF2F2',
          border: '#FECACA',
        },
        info: {
          DEFAULT: '#0EA5E9',
          light: '#F0F9FF',
          border: '#BAE6FD',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'card': '16px',
        'card-sm': '12px',
        'card-lg': '20px',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(16, 42, 67, 0.05), 0 1px 2px 0 rgba(16, 42, 67, 0.03)',
        'card': '0 4px 12px 0 rgba(16, 42, 67, 0.05), 0 1px 3px 0 rgba(16, 42, 67, 0.03)',
        'elevated': '0 10px 25px -5px rgba(16, 42, 67, 0.08), 0 8px 10px -6px rgba(16, 42, 67, 0.04)',
      }
    },
  },
  plugins: [],
}
