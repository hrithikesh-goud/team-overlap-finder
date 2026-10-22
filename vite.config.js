import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" makes the built files work from any folder, including GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: "./"
});
