/** Rebuild CSS after editing classes:  npm run build:css */
module.exports = {
  content: ['./index.html', './app.js', './rewards.html', './rewards.js', './i18n.js'],
  theme: {
    extend: {
      keyframes: {
        shake: { '0%,100%': { transform: 'translateX(0)' }, '25%': { transform: 'translateX(-8px)' }, '75%': { transform: 'translateX(8px)' } },
        pop: { '0%': { transform: 'scale(.8)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        fade: { '0%': { opacity: '0' }, '15%,85%': { opacity: '1' }, '100%': { opacity: '0' } },
      },
      animation: { shake: 'shake .3s ease-in-out', pop: 'pop .18s ease-out', fade: 'fade .95s ease-in-out forwards' },
    },
  },
};
