import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  ssr: {
    noExternal: ["@xyflow/react", "@xyflow/system"],
  },
  resolve: {
    alias: {
      "use-sync-external-store/shim/with-selector": "use-sync-external-store/shim/with-selector.js",
    },
  },
  optimizeDeps: {
    include: ["@xyflow/react", "@xyflow/system", "use-sync-external-store/shim/with-selector"],
  },
});
