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
          50: '#fbf6e6',  // Marfil dorado
          400: '#d4a537', // Dorado del logo (acentos sobre fondos oscuros)
          500: '#9a6f12', // Dorado profundo: botones y enlaces (texto blanco 4.5:1)
          600: '#7f5a0f', // Hover
          700: '#6b4e10', // Dorado oscuro
          800: '#4f3a0c', // Bronce oscuro
        },
        surface: {
          bg: '#f1f5f9',    // slate-100
          border: '#e5e7eb',// gray-200
        }
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInScale: {
          '0%': { opacity: '0', transform: 'scale(0.9) translateY(20px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out forwards',
        fadeInScale: 'fadeInScale 0.5s ease-out forwards',
        shimmer: 'shimmer 1.5s infinite',
      }
    },
  },
  plugins: [],
}
