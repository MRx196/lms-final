import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import checker from "vite-plugin-checker";
// @ts-expect-error - No type declarations for custom plugin
import clearLogPlugin from "./dala-internal-vite-clear-log-plugin.js";

import dns from "node:dns";

dns.setDefaultResultOrder("verbatim");

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    clearLogPlugin(),
    react(),
    tailwindcss(),
    checker({
      typescript: true,
    }),
  ],
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
  },
  preview: {
    port: 3000,
    host: true,
    allowedHosts: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 5000, // Increases the limit to 5MB
    // Custom `manualChunks` was intentionally removed.
    // Splitting React/react-dom/scheduler into a dedicated `react-vendor` chunk
    // while React-dependent libraries (Radix UI, sonner, vaul, recharts,
    // framer-motion, @tanstack/react-query, @dnd-kit, react-hook-form, etc.)
    // lived in separate `ui-vendor` / `vendor` chunks caused those chunks to be
    // evaluated BEFORE React finished initializing. At runtime this produced:
    //   "Uncaught TypeError: Cannot read properties of undefined
    //    (reading 'useLayoutEffect')"
    // Letting Rollup/Vite perform its DEFAULT chunk splitting keeps React and
    // every React-dependent package in a consistent module-evaluation order,
    // eliminating the undefined-hook race condition.
  },
});