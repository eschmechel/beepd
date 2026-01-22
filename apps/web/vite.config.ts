import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@beepd/shared": resolve(__dirname, "../../packages/shared/src"),
      "@beepd/ui": resolve(__dirname, "../../packages/ui/src"),
    },
  },
});
