import { lazy, Suspense } from "react";
import type { Id } from "convex/_generated/dataModel";

// Lazy load the Canvas component to avoid SSR issues
const Canvas = lazy(() => import("./Canvas"));

export function CanvasWrapper({ projectId }: { projectId: Id<"projects"> }) {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <p className="text-muted-foreground">Loading canvas...</p>
      </div>
    }>
      <Canvas projectId={projectId} />
    </Suspense>
  );
}