/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        charcoal: { DEFAULT: "#0D0D12", soft: "#16161F", muted: "#1E1E2A" },
        action: { DEFAULT: "#E11D48", hover: "#BE123C", light: "#FFF1F2" },
        flare: { DEFAULT: "#F97316", deep: "#EA580C", light: "#FFF7ED" },
        ocean: { DEFAULT: "#185FA5", deep: "#0F4274", light: "#E8F1FA" },
        emerald: { DEFAULT: "#10B981", deep: "#059669", light: "#ECFDF5" },
        ink: { DEFAULT: "#0F0F14", muted: "#52525B", faint: "#A1A1AA" },
        coral: { DEFAULT: "#E85D4C", light: "#FDECEA" },
        sand: { DEFAULT: "#F4F4F5", dark: "#E4E4E7", surface: "#FAFAFA" },
        slateiq: "#71717A",
        violet: { DEFAULT: "#6B4FBB", light: "#F0EBFA" },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 15, 20, 0.04), 0 8px 24px rgba(15, 15, 20, 0.06)",
        lift: "0 20px 50px -12px rgba(15, 15, 20, 0.18), 0 8px 16px -8px rgba(15, 15, 20, 0.1)",
        glow: "0 0 0 1px rgba(255,255,255,0.06), 0 24px 48px -12px rgba(225, 29, 72, 0.25)",
        "inner-soft": "inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "hero-mesh":
          "radial-gradient(ellipse 80% 60% at 20% 40%, rgba(225,29,72,0.15), transparent), radial-gradient(ellipse 60% 50% at 80% 20%, rgba(249,115,22,0.12), transparent), linear-gradient(165deg, #0D0D12 0%, #16161F 45%, #0D0D12 100%)",
        "hero-photo":
          "linear-gradient(105deg, rgba(13,13,18,0.92) 0%, rgba(13,13,18,0.75) 45%, rgba(13,13,18,0.55) 100%), url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80')",
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease-out forwards",
        "fade-in": "fadeIn 0.4s ease-out forwards",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
    },
  },
  plugins: [],
};
