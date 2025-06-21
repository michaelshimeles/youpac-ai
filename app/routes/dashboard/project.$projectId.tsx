import { lazy, Suspense } from "react";
import { useParams } from "react-router";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

const Canvas = lazy(() => import("~/components/canvas/Canvas"));

export default function ProjectCanvas() {
  const { projectId } = useParams();
  const project = useQuery(api.projects.get, { 
    id: projectId as Id<"projects"> 
  });

  if (!project && project !== undefined) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
          <p className="text-muted-foreground">Loading canvas...</p>
        </div>
      }
    >
      <Canvas projectId={projectId as Id<"projects">} />
    </Suspense>
  );
}