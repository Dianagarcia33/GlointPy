/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',  // Naranja ultra claro
          400: '#fbbf24', // Ámbar
          500: '#f97316', // Naranja principal
          600: '#ea580c', // Naranja oscuro
        },
        surface: {
          bg: '#f1f5f9',    // slate-100
          border: '#e5e7eb',// gray-200
        }
      }
    },
  },
  plugins: [],
}
