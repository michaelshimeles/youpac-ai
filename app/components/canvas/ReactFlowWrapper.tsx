import { useEffect, useState } from "react";
import type { ReactNode } from "react";

interface ReactFlowWrapperProps {
  children: (components: {
    ReactFlow: any;
    ReactFlowProvider: any;
    Background: any;
    Controls: any;
    MiniMap: any;
    useNodesState: any;
    useEdgesState: any;
    addEdge: any;
  }) => ReactNode;
}

export function ReactFlowWrapper({ children }: ReactFlowWrapperProps) {
  const [components, setComponents] = useState<any>(null);

  useEffect(() => {
    // Only import ReactFlow on the client side
    if (typeof window !== "undefined") {
      Promise.all([
        import("@xyflow/react"),
        import("@xyflow/react/dist/style.css"),
      ]).then(([reactFlowModule]) => {
        setComponents({
          ReactFlow: reactFlowModule.ReactFlow,
          ReactFlowProvider: reactFlowModule.ReactFlowProvider,
          Background: reactFlowModule.Background,
          Controls: reactFlowModule.Controls,
          MiniMap: reactFlowModule.MiniMap,
          useNodesState: reactFlowModule.useNodesState,
          useEdgesState: reactFlowModule.useEdgesState,
          addEdge: reactFlowModule.addEdge,
        });
      });
    }
  }, []);

  if (!components) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <p className="text-muted-foreground">Loading canvas...</p>
      </div>
    );
  }

  return <>{children(components)}</>;
}