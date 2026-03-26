/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#00FF94',
        secondary: '#7B61FF',
        danger: '#FF6B6B',
        warning: '#FFB347',
        success: '#00D68F',
        dark: {
          900: '#050508',
          800: '#0A0A0F',
          700: '#0F0F18',
          600: '#1A1A27',
          500: '#222233',
          400: '#2A2A3F',
        },
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
