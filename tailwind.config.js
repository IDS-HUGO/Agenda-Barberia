/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        alien: {
          bg: '#090B0E',
          card: '#12161D',
          hover: '#1A202C',
          border: '#1F2937',
          neon: '#76C81C',
          neonHover: '#8CE026',
          silver: '#D1D5DB',
          text: '#F8FAFC',
          muted: '#94A3B8',
          occupiedBg: '#131720',
          occupiedBorder: '#262F3F',
          occupiedText: '#64748B',
          barberConfirmed: '#161D27',
          barberCompleted: '#101E19',
          amberAccent: '#F59E0B',
          emeraldAccent: '#10B981'
        }
      },
      boxShadow: {
        'alien-glow': '0 0 20px rgba(118, 200, 28, 0.22)',
        'alien-glow-lg': '0 0 35px rgba(118, 200, 28, 0.35)',
      }
    },
  },
  plugins: [],
}
