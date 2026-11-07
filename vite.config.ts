import { defineConfig } from "vite";
// Relative base so the site works under https://<user>.github.io/<repo>/
export default defineConfig({ base: "./", test: { globals: true } } as never);
