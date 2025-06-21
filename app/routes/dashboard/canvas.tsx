import { lazy, Suspense } from "react";
import type { Route } from "./+types/canvas";

// Lazy load the Canvas component to avoid SSR issues with ReactFlow
const Canvas = lazy(() => import("~/components/canvas/Canvas"));

export default function CanvasPage() {
  return (
    <Suspense fallback={<CanvasLoading />}>
      <Canvas />
    </Suspense>
  );
}

function CanvasLoading() {
  return (
    <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
        <p className="mt-2 text-sm text-muted-foreground">Loading canvas...</p>
      </div>
    </div>
  );
}

export async function loader(_args: Route.LoaderArgs) {
  return {};
}