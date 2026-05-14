import type { Config } from "tailwindcss";

// 디자인 토큰의 단일 출처. 시스템 설명은 apps/web/DESIGN.md 참고.
const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F2EBDD",
        ink: "#23201B",
        panel: "#2A2620",
        "panel-2": "#352F26",
        cream: "#EDE6D6",
        accent: "#FF5C36",
        signal: "#23C9B3",
        marigold: "#F2B33D",
        hair: "#D8CEB8",
      },
      fontFamily: {
        sans: ['"IBM Plex Sans KR"', "system-ui", "sans-serif"],
        mono: ['"Space Mono"', '"IBM Plex Sans KR"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
