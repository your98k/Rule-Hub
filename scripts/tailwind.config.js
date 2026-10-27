const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    path.join(__dirname, 'site-template.html'),
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'monospace'],
      },
      colors: {
        ios: {
          blue: '#0A84FF',
          indigo: '#5E5CE6',
          purple: '#BF5AF2',
          cyan: '#64D2FF',
          mint: '#00C7BE',
          green: '#30D158',
          orange: '#FF9F0A',
          pink: '#FF375F',
        },
      },
    },
  },
};
