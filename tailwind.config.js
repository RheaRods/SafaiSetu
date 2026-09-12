/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#23301F',
        paper: '#F3F0E4',
        forest: {
          DEFAULT: '#2E4A2C',
          light: '#3D5F3A',
          dark: '#1E3320',
        },
        moss: {
          DEFAULT: '#7C9A5C',
          light: '#A9C084',
          dark: '#5E7943',
        },
        clay: {
          DEFAULT: '#B5673A',
          light: '#D08856',
          dark: '#8F4F2C',
        },
        sand: {
          DEFAULT: '#E4DCC5',
          light: '#EFE9D8',
          dark: '#CBBF9E',
        },
        brick: {
          DEFAULT: '#A63D2F',
          light: '#C25642',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['"Work Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
