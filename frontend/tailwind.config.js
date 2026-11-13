/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        kaira: {
          bg: '#FFFDFB',          // Main background: very light warm white
          bgSecondary: '#FFF7F4', // Secondary background: warm cream/peach
          primary: '#E85D8A',     // Primary pink accent: CTA, active nav, selected items
          primaryHover: '#D64B78',// Hover state for primary buttons
          primarySoft: '#F8DCE5', // Soft pink: selected folder, card accents
          peach: '#F8D8C5',       // Secondary peach accent
          lavender: '#E8DDF0',    // Soft lavender accent
          cream: '#FFF0D8',       // Warm cream accent
          navy: '#182033',        // Dark navy: sidebar, primary text, headings
          navyLight: '#222C44',   // Navy hover / lighter sidebar tone
          navyBorder: '#2A3654',  // Navy border
          body: '#344054',        // Body text
          muted: '#667085',       // Secondary / muted text
          border: '#E9E5E4',      // Clean warm borders
          success: '#22A06B',     // Active status
          warning: '#E59A23',     // Warning / Draft status
          error: '#D6455D',       // Error / Inactive
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(24, 32, 51, 0.05), 0 1px 2px -1px rgba(24, 32, 51, 0.05)',
        dropdown: '0 10px 25px -5px rgba(24, 32, 51, 0.1), 0 8px 10px -6px rgba(24, 32, 51, 0.05)',
      },
    },
  },
  plugins: [],
};
