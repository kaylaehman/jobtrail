/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // status pill palette — mapped one-to-one with the JobStatus enum.
        saved: '#94a3b8',
        applied: '#3b82f6',
        phone_screen: '#8b5cf6',
        interview: '#0ea5e9',
        offer: '#10b981',
        rejected: '#ef4444',
        withdrawn: '#64748b',
      },
    },
  },
  plugins: [],
};
