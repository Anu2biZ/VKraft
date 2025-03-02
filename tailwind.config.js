/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./web/**/*.{vue,js,html}",
  ],
  theme: {
    extend: {
      colors: {
        'vk-blue': '#2787F5',
        'vk-light-blue': '#5181B8',
        'vk-bg': '#EDEEF0',
        'vk-text': '#000000',
        'vk-secondary': '#626D7A',
        'vk-border': '#DCE1E6',
      },
    },
  },
  plugins: [],
}
