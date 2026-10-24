/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        epilogue: ['Plus Jakarta Sans', 'Epilogue', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'Epilogue', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        }
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
        hover: '0 20px 30px -10px rgba(99, 102, 241, 0.15), 0 10px 15px -5px rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
}
