import { defineConfig } from "astro/config";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  site: "https://beepd.app",
  vite: {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@beepd/shared": path.resolve(__dirname, "../../packages/shared/src"),
        "@beepd/ui": path.resolve(__dirname, "../../packages/ui/src"),
      },
    },
  },
});
