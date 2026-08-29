import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  // GitHub Pages veröffentlicht dieses Projekt unter /LTV/.
  base: "/LTV/",
  build: {
    rollupOptions: {
      input: {
        landing: resolve(import.meta.dirname, "index.html"),
        trainer: resolve(import.meta.dirname, "trainer.html")
      }
    }
  }
});
