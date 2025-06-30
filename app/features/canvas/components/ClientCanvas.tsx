// Client-only Canvas component
import { useEffect, useState } from "react";
import type { Id } from "convex/_generated/dataModel";

export default function ClientCanvas({ projectId }: { projectId: Id<"projects"> }) {
  const [CanvasComponent, setCanvasComponent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // First ensure React Flow styles are loaded
    import("@xyflow/react/dist/style.css").then(() => {
      // Then dynamically import the Canvas component
      return import("./Canvas");
    }).then((module) => {
      setCanvasComponent(() => module.default);
    }).catch((err) => {
      console.error("Failed to load Canvas component:", err);
      setError(err.message);
    });
  }, []);
  
  if (error) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load canvas</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }
  
  if (!CanvasComponent) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <p className="text-muted-foreground">Loading canvas...</p>
      </div>
    );
  }
  
  return <CanvasComponent projectId={projectId} />;
}