/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        accent: {
          yellow: '#FFD43B',
          teal: '#00C4CC',
          purple: '#7D2AE8',
          gold: '#D5A021',
          coral: '#FF3E90',
        },
        brand: {
          dark: '#0F0F10',
          navy: '#112133',
        },
      },
      fontFamily: {
        grotesk: ['SpaceGrotesk_700Bold'],
        display: ['SpaceGrotesk_900Black'],
      },
    },
  },
  plugins: [],
};
