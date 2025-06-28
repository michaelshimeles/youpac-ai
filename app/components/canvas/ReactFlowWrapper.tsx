import { useEffect, useState, type ReactNode } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
} from "@xyflow/react";

interface ReactFlowWrapperProps {
  children: (components: {
    ReactFlow: typeof ReactFlow;
    ReactFlowProvider: typeof ReactFlowProvider;
    Background: typeof Background;
    Controls: typeof Controls;
    MiniMap: typeof MiniMap;
    useNodesState: typeof useNodesState;
    useEdgesState: typeof useEdgesState;
    addEdge: typeof addEdge;
  }) => ReactNode;
}

// Define the components object statically
// Types are inferred from the imports
const flowComponents = {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
};

export function ReactFlowWrapper({ children }: ReactFlowWrapperProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Dynamically import CSS only on the client side
    // and confirm client-side rendering
    if (typeof window !== "undefined") {
      import("@xyflow/react/dist/style.css").then(() => {
        setIsClient(true);
      });
    }
  }, []);

  if (!isClient) {
    // Render nothing or a placeholder until client-side is confirmed and CSS is loaded
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <p className="text-muted-foreground">Loading canvas...</p>
      </div>
    );
  }

  // Pass the statically imported components
  return <>{children(flowComponents)}</>;
}