export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        wx: {
          rail: '#E6E7EC',
          railActive: '#DADCE2',
          list: '#F4F4F4',
          chat: '#F5F5F5',
          green: '#95EC69',
          line: '#E6E6E6',
          text: '#1F1F1F',
          muted: '#7A7A7A'
        }
      },
      boxShadow: {
        soft: '0 2px 10px rgba(0,0,0,0.08)'
      }
    }
  },
  plugins: []
}
