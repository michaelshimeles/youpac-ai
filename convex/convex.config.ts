// convex/convex.config.ts
import { defineApp } from "convex/server";
import polar from "@convex-dev/polar/convex.config";

const app = defineApp();
app.use(polar);

export default app;
