/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // JobTrail brand palette — sampled from jobtrail-banner.png.
        // Navy is the dark "chrome" backdrop; blue→purple is the wordmark gradient;
        // teal/cyan are the road accent from the location-pin icon.
        brand: {
          navy: '#0a0f2c',
          'navy-deep': '#070a1f',
          blue: '#4f7df9',
          'blue-light': '#6c91fc',
          purple: '#8b5cf6',
          'purple-light': '#a78bfa',
          teal: '#2dd4bf',
          cyan: '#06b6d4',
        },
        // Status pill palette — realigned to the brand colors for the active
        // pipeline statuses; rejected/withdrawn deliberately stay outside the
        // brand range so they read as "exit" states at a glance.
        saved: '#94a3b8',
        applied: '#4f7df9',       // brand blue
        phone_screen: '#8b5cf6',  // brand purple
        interview: '#06b6d4',     // brand cyan
        offer: '#2dd4bf',         // brand teal
        rejected: '#ef4444',
        withdrawn: '#64748b',
      },
    },
  },
  plugins: [],
};
