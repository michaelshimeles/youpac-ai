// convex/convex.config.ts
import { defineApp } from "convex/server";
import polar from "@convex-dev/polar/convex.config";

const app = defineApp();
app.use(polar, {
  // Externalize AI SDK dependencies that cause bundling issues
  external: [
    "@ai-sdk/openai",
    "@ai-sdk/provider",
    "@ai-sdk/provider-utils", 
    "@ai-sdk/ui-utils",
    "@opentelemetry/api",
    "openai",
    "ai"
  ]
});

export default app;
