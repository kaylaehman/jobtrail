/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // JobTrail brand palette — user-supplied hex codes.
        // Two gradients are canonical: blue→purple (4894F1 → 5F65F7) and cyan→aqua (3BB2D2 → 2DA198).
        brand: {
          navy: '#00061A',          // Deep Navy Background
          'navy-deep': '#00061A',
          indigo: '#1E2558',        // Dark Indigo (card/chrome accent)
          white: '#F8F8F8',         // Bright White
          blue: '#5F65F7',          // Electric Blue (primary action)
          'blue-light': '#4894F1',  // Sky Blue (gradient stop)
          sky: '#4894F1',
          purple: '#5F65F7',
          'purple-light': '#7F84F9',
          steel: '#3158A5',         // Steel Blue
          cyan: '#3BB2D2',          // Cyan Teal
          teal: '#2DA198',          // Aqua Green
          aqua: '#2DA198',
        },
        // Status pill palette — maps the pipeline statuses onto the new brand range.
        // rejected/withdrawn intentionally stay outside-brand so they read as exit states.
        saved: '#94a3b8',
        applied: '#5F65F7',       // electric blue
        phone_screen: '#4894F1',  // sky blue
        interview: '#3BB2D2',     // cyan teal
        offer: '#2DA198',         // aqua green
        rejected: '#ef4444',
        withdrawn: '#64748b',
      },
    },
  },
  plugins: [],
};
