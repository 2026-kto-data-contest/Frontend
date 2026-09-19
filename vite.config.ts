import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5173,
    // 프론트에서 백엔드를 절대 주소로 직접 호출하지 않고 /api 상대 경로로 호출하므로
    // (배포 환경은 vercel.json 리라이트가 담당), 로컬 개발 서버도 같은 경로를
    // 실제 백엔드로 그대로 전달해 개발 중에도 동일하게 동작하게 합니다.
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND_ORIGIN || "https://jeontongjuro-backend.onrender.com",
        changeOrigin: true,
      },
      "/recommended-courses": {
        target: process.env.VITE_BACKEND_ORIGIN || "https://jeontongjuro-backend.onrender.com",
        changeOrigin: true,
      },
    },
  },
});
