/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-color)",
        surface: "var(--surface-color)",
        primary: "var(--primary-color)",
        secondary: "var(--secondary-color)",
        text: {
          main: "var(--text-main)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
        },
        danger: "#ff4d4d",
        success: "#2ecc71",
        warning: "#f1c40f",
        info: "#3498db",
      },
      boxShadow: {
        neu: "var(--shadow-neu)",
        "neu-pressed": "var(--shadow-neu-pressed)",
        "neu-sm": "var(--shadow-neu-sm)",
        "neu-icon": "var(--shadow-neu-icon)",
        "neu-button": "var(--shadow-neu-button)",
        "neu-button-active": "var(--shadow-neu-button-active)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [],
};
