/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        kakao: {
          rail: '#ECECEC',
          section: '#F5F5F5',
          chat: '#B7C9DB',
          yellow: '#FEE500',
          line: '#E5E5E5',
          text: '#222222',
          muted: '#666666'
        }
      },
      boxShadow: {
        bubble: '0 1px 1px rgba(0, 0, 0, 0.05)'
      }
    }
  },
  plugins: []
}
