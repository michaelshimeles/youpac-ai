import { useQuery, useMutation } from "convex/react";
import { api } from "~/convex/_generated/api";
import { Id } from "~/convex/_generated/dataModel";
import { useCanvasStore } from "~/services/canvas/store/useCanvasStore";
import { CanvasNode, CanvasEdge, NodeType } from "~/types/canvas";
import { useState, useCallback, useRef } from "react";

/**
 * Hook for canvas state management and operations
 */
export function useCanvasOperations(projectId: Id<"projects">) {
  const canvasState = useQuery(api.canvas.getState, { projectId });
  const saveStateMutation = useMutation(api.canvas.saveState);
  
  const {
    nodes,
    edges,
    viewport,
    setNodes,
    setEdges,
    setViewport,
    addNode,
    updateNode,
    removeNode,
    addEdge,
    removeEdge,
    arrangeNodes,
    fitView,
    resetCanvas,
  } = useCanvasStore();

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Load canvas state from database
  const loadCanvasState = useCallback(() => {
    if (canvasState) {
      setNodes(canvasState.nodes || []);
      setEdges(canvasState.edges || []);
      setViewport(canvasState.viewport || { x: 0, y: 0, zoom: 1 });
    }
  }, [canvasState, setNodes, setEdges, setViewport]);

  // Auto-save canvas state with debouncing
  const saveCanvasState = useCallback(async (immediate = false) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const doSave = async () => {
      setIsSaving(true);
      try {
        await saveStateMutation({
          projectId,
          nodes: nodes.map(node => ({
            id: node.id,
            type: node.type,
            position: node.position,
            data: node.data,
          })),
          edges: edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: edge.type,
          })),
          viewport,
        });
        setLastSaved(new Date());
      } catch (error) {
        console.error("Failed to save canvas state:", error);
      } finally {
        setIsSaving(false);
      }
    };

    if (immediate) {
      await doSave();
    } else {
      saveTimeoutRef.current = setTimeout(doSave, 1000); // Debounce by 1 second
    }
  }, [saveStateMutation, projectId, nodes, edges, viewport]);

  // Create different types of nodes
  const createVideoNode = useCallback((
    position: { x: number; y: number },
    videoId: Id<"videos">,
    videoData: any
  ) => {
    const nodeId = `video-${videoId}`;
    const node: CanvasNode = {
      id: nodeId,
      type: "video",
      position,
      data: {
        videoId,
        ...videoData,
      },
    };
    addNode(node);
    return nodeId;
  }, [addNode]);

  const createAgentNode = useCallback((
    position: { x: number; y: number },
    agentType: "title" | "description" | "thumbnail" | "tweets",
    agentId: Id<"agents">
  ) => {
    const nodeId = `agent-${agentId}`;
    const node: CanvasNode = {
      id: nodeId,
      type: "agent",
      position,
      data: {
        agentId,
        agentType,
        status: "idle",
        draft: "",
      },
    };
    addNode(node);
    return nodeId;
  }, [addNode]);

  const createTranscriptionNode = useCallback((
    position: { x: number; y: number },
    transcriptionData: any
  ) => {
    const nodeId = `transcription-${Date.now()}`;
    const node: CanvasNode = {
      id: nodeId,
      type: "transcription",
      position,
      data: transcriptionData,
    };
    addNode(node);
    return nodeId;
  }, [addNode]);

  const createMoodBoardNode = useCallback((
    position: { x: number; y: number },
    moodBoardData: any
  ) => {
    const nodeId = `moodboard-${Date.now()}`;
    const node: CanvasNode = {
      id: nodeId,
      type: "moodboard",
      position,
      data: moodBoardData,
    };
    addNode(node);
    return nodeId;
  }, [addNode]);

  // Node connection utilities
  const connectNodes = useCallback((
    sourceId: string,
    targetId: string,
    edgeType?: string
  ) => {
    const edgeId = `${sourceId}-${targetId}`;
    const edge: CanvasEdge = {
      id: edgeId,
      source: sourceId,
      target: targetId,
      type: edgeType,
      animated: true,
    };
    addEdge(edge);
    return edgeId;
  }, [addEdge]);

  const disconnectNodes = useCallback((edgeId: string) => {
    removeEdge(edgeId);
  }, [removeEdge]);

  // Auto-connect related nodes
  const autoConnectNodes = useCallback((
    videoNodeId: string,
    agentNodeIds: string[]
  ) => {
    agentNodeIds.forEach(agentId => {
      connectNodes(videoNodeId, agentId, "data-flow");
    });
  }, [connectNodes]);

  // Canvas layout operations
  const arrangeNodesByType = useCallback(() => {
    const nodesByType = nodes.reduce((acc, node) => {
      if (!acc[node.type]) acc[node.type] = [];
      acc[node.type].push(node);
      return acc;
    }, {} as Record<string, CanvasNode[]>);

    const typeOrder: NodeType[] = ["video", "transcription", "agent", "moodboard"];
    let currentY = 100;
    const spacing = { x: 350, y: 250 };

    typeOrder.forEach(type => {
      const typeNodes = nodesByType[type] || [];
      let currentX = 100;

      typeNodes.forEach((node, index) => {
        updateNode(node.id, {
          position: { x: currentX, y: currentY },
        });

        currentX += spacing.x;
        if ((index + 1) % 3 === 0) {
          currentX = 100;
          currentY += spacing.y / 2;
        }
      });

      if (typeNodes.length > 0) {
        currentY += spacing.y;
      }
    });
  }, [nodes, updateNode]);

  const centerCanvas = useCallback(() => {
    if (nodes.length === 0) return;

    const bounds = nodes.reduce(
      (acc, node) => ({
        minX: Math.min(acc.minX, node.position.x),
        maxX: Math.max(acc.maxX, node.position.x),
        minY: Math.min(acc.minY, node.position.y),
        maxY: Math.max(acc.maxY, node.position.y),
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    setViewport({
      x: -centerX + 600, // Assuming canvas width ~1200px
      y: -centerY + 400, // Assuming canvas height ~800px
      zoom: 1,
    });
  }, [nodes, setViewport]);

  // Canvas search and filtering
  const searchNodes = useCallback((query: string) => {
    if (!query.trim()) return nodes;

    const lowerQuery = query.toLowerCase();
    return nodes.filter(node => {
      const searchableText = [
        node.id,
        node.type,
        JSON.stringify(node.data),
      ].join(" ").toLowerCase();

      return searchableText.includes(lowerQuery);
    });
  }, [nodes]);

  const filterNodesByType = useCallback((type: NodeType) => {
    return nodes.filter(node => node.type === type);
  }, [nodes]);

  const getConnectedNodes = useCallback((nodeId: string) => {
    const connectedIds = edges
      .filter(edge => edge.source === nodeId || edge.target === nodeId)
      .map(edge => edge.source === nodeId ? edge.target : edge.source);

    return nodes.filter(node => connectedIds.includes(node.id));
  }, [nodes, edges]);

  // Canvas validation
  const validateCanvas = useCallback(() => {
    const errors: string[] = [];
    const nodeIds = new Set(nodes.map(node => node.id));

    // Check for orphaned edges
    edges.forEach(edge => {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge ${edge.id} references non-existent source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge ${edge.id} references non-existent target node: ${edge.target}`);
      }
    });

    // Check for duplicate node IDs
    const nodeIdCounts = new Map<string, number>();
    nodes.forEach(node => {
      const count = nodeIdCounts.get(node.id) || 0;
      nodeIdCounts.set(node.id, count + 1);
    });

    nodeIdCounts.forEach((count, nodeId) => {
      if (count > 1) {
        errors.push(`Duplicate node ID found: ${nodeId}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [nodes, edges]);

  // Canvas export
  const exportCanvas = useCallback((format: "json" | "png" | "svg" = "json") => {
    switch (format) {
      case "json":
        return {
          nodes,
          edges,
          viewport,
          metadata: {
            exportedAt: new Date().toISOString(),
            nodeCount: nodes.length,
            edgeCount: edges.length,
          },
        };

      case "png":
      case "svg":
        // This would typically be handled by a canvas rendering library
        console.log(`Export to ${format} not implemented yet`);
        return null;

      default:
        return null;
    }
  }, [nodes, edges, viewport]);

  // Canvas history operations
  const [history, setHistory] = useState<{
    past: Array<{ nodes: CanvasNode[]; edges: CanvasEdge[] }>;
    present: { nodes: CanvasNode[]; edges: CanvasEdge[] };
    future: Array<{ nodes: CanvasNode[]; edges: CanvasEdge[] }>;
  }>({
    past: [],
    present: { nodes: [], edges: [] },
    future: [],
  });

  const saveToHistory = useCallback(() => {
    setHistory(prev => ({
      past: [...prev.past, prev.present].slice(-20), // Keep last 20 states
      present: { nodes, edges },
      future: [],
    }));
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (history.past.length === 0) return;

    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);

    setNodes(previous.nodes);
    setEdges(previous.edges);

    setHistory({
      past: newPast,
      present: previous,
      future: [history.present, ...history.future],
    });
  }, [history, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (history.future.length === 0) return;

    const next = history.future[0];
    const newFuture = history.future.slice(1);

    setNodes(next.nodes);
    setEdges(next.edges);

    setHistory({
      past: [...history.past, history.present],
      present: next,
      future: newFuture,
    });
  }, [history, setNodes, setEdges]);

  return {
    // State
    nodes,
    edges,
    viewport,
    isLoading: canvasState === undefined,
    isSaving,
    lastSaved,

    // Basic operations
    loadCanvasState,
    saveCanvasState,
    resetCanvas,

    // Node creation
    createVideoNode,
    createAgentNode,
    createTranscriptionNode,
    createMoodBoardNode,

    // Node management
    updateNode,
    removeNode,

    // Edge operations
    connectNodes,
    disconnectNodes,
    autoConnectNodes,

    // Layout operations
    arrangeNodes,
    arrangeNodesByType,
    fitView,
    centerCanvas,

    // Search and filtering
    searchNodes,
    filterNodesByType,
    getConnectedNodes,

    // Validation and export
    validateCanvas,
    exportCanvas,

    // History operations
    saveToHistory,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}

/**
 * Hook for canvas selection management
 */
export function useCanvasSelection() {
  const {
    selectedNodeIds,
    selectNode,
    selectNodes,
    deselectAll,
    toggleNodeSelection,
    getSelectedNodes,
  } = useCanvasStore();

  const selectMultiple = useCallback((nodeIds: string[], additive = false) => {
    if (additive) {
      const newSelection = [...new Set([...selectedNodeIds, ...nodeIds])];
      selectNodes(newSelection);
    } else {
      selectNodes(nodeIds);
    }
  }, [selectedNodeIds, selectNodes]);

  const selectByType = useCallback((type: string) => {
    const nodes = useCanvasStore.getState().nodes;
    const typeNodeIds = nodes.filter(node => node.type === type).map(node => node.id);
    selectNodes(typeNodeIds);
  }, [selectNodes]);

  const selectConnected = useCallback((nodeId: string) => {
    const { nodes, edges } = useCanvasStore.getState();
    const connectedIds = edges
      .filter(edge => edge.source === nodeId || edge.target === nodeId)
      .map(edge => edge.source === nodeId ? edge.target : edge.source);
    
    selectNodes([nodeId, ...connectedIds]);
  }, [selectNodes]);

  const invertSelection = useCallback(() => {
    const nodes = useCanvasStore.getState().nodes;
    const allNodeIds = nodes.map(node => node.id);
    const unselectedIds = allNodeIds.filter(id => !selectedNodeIds.includes(id));
    selectNodes(unselectedIds);
  }, [selectedNodeIds, selectNodes]);

  return {
    selectedNodeIds,
    selectedNodes: getSelectedNodes(),
    selectNode,
    selectNodes,
    selectMultiple,
    selectByType,
    selectConnected,
    deselectAll,
    toggleNodeSelection,
    invertSelection,
    hasSelection: selectedNodeIds.length > 0,
    selectionCount: selectedNodeIds.length,
  };
}

/**
 * Hook for canvas keyboard shortcuts
 */
export function useCanvasKeyboard() {
  const { undo, redo, canUndo, canRedo } = useCanvasOperations("" as Id<"projects">);
  const { selectAll, deselectAll, deleteSelected } = useCanvasSelection() as any;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return; // Don't handle shortcuts when typing in inputs
    }

    const { ctrlKey, metaKey, shiftKey, key } = event;
    const isModifierPressed = ctrlKey || metaKey;

    switch (key.toLowerCase()) {
      case 'z':
        if (isModifierPressed && shiftKey && canRedo) {
          event.preventDefault();
          redo();
        } else if (isModifierPressed && canUndo) {
          event.preventDefault();
          undo();
        }
        break;

      case 'y':
        if (isModifierPressed && canRedo) {
          event.preventDefault();
          redo();
        }
        break;

      case 'a':
        if (isModifierPressed) {
          event.preventDefault();
          selectAll();
        }
        break;

      case 'escape':
        deselectAll();
        break;

      case 'delete':
      case 'backspace':
        if (deleteSelected) {
          event.preventDefault();
          deleteSelected();
        }
        break;

      default:
        break;
    }
  }, [undo, redo, canUndo, canRedo, selectAll, deselectAll, deleteSelected]);

  return {
    handleKeyDown,
  };
}