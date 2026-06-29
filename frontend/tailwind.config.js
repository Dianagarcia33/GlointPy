/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        montserrat: ['Montserrat', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fff7ed',  // Naranja ultra claro
          400: '#fbbf24', // Ámbar
          500: '#f97316', // Naranja principal
          600: '#ea580c', // Naranja oscuro
        },
        surface: {
          bg: '#f8fafc',    // slate-50 (Lighter, cleaner)
          border: '#f1f5f9',// slate-100
        }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.05)',
        'glass-hover': '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
        'glow-brand': '0 0 20px rgba(249, 115, 22, 0.3)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInScale: {
          '0%': { opacity: '0', transform: 'scale(0.98) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-out forwards',
        fadeInScale: 'fadeInScale 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        slideUp: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        shimmer: 'shimmer 1.5s infinite',
      }
    },
  },
  plugins: [],
}
