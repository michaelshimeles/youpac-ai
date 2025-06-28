import { api } from "~/convex/_generated/api";
import { Id } from "~/convex/_generated/dataModel";
import { ConvexReactClient } from "convex/react";
import { ServiceError, ErrorHandler } from "../common/ErrorHandler";

export interface CanvasPosition {
  x: number;
  y: number;
}

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface NodeData {
  id: string;
  type: string;
  position: CanvasPosition;
  data: any;
}

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  type?: string;
}

export interface CanvasState {
  nodes: NodeData[];
  edges: EdgeData[];
  viewport: CanvasViewport;
}

export interface VideoUploadOptions {
  file: File;
  position: CanvasPosition;
  onProgress?: (progress: number) => void;
}

export interface AgentCreationOptions {
  type: "title" | "description" | "thumbnail" | "tweets";
  position: CanvasPosition;
  connectedVideoId?: Id<"videos">;
}

/**
 * Service for managing canvas state and operations
 * Handles node/edge management, video uploads, and agent creation
 */
export class CanvasService {
  constructor(private convex: ConvexReactClient) {}

  /**
   * Get canvas state for a project
   */
  async getCanvasState(projectId: Id<"projects">) {
    try {
      return await this.convex.query(api.canvas.getState, { projectId });
    } catch (error) {
      const serviceError = ErrorHandler.handle(error, "Canvas state retrieval");
      throw serviceError;
    }
  }

  /**
   * Save canvas state (nodes, edges, viewport)
   */
  async saveCanvasState(
    projectId: Id<"projects">,
    nodes: NodeData[],
    edges: EdgeData[],
    viewport: CanvasViewport
  ): Promise<void> {
    try {
      await this.convex.mutation(api.canvas.saveState, {
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
    } catch (error) {
      const serviceError = ErrorHandler.handle(error, "Canvas state save");
      ErrorHandler.notify(serviceError);
      throw serviceError;
    }
  }

  /**
   * Create a video node from file upload
   */
  async createVideoNode(
    projectId: Id<"projects">,
    options: VideoUploadOptions
  ): Promise<{ nodeId: string; videoId: Id<"videos"> }> {
    try {
      const { file, position, onProgress } = options;

      // Validate file
      if (!this.isValidVideoFile(file)) {
        throw new ServiceError("Invalid video file", "validation", {
          details: "Please upload a valid video file (MP4, MOV, AVI, WebM)",
        });
      }

      onProgress?.(0.1);

      // Upload file to storage
      const uploadUrl = await this.convex.mutation(api.files.generateUploadUrl);
      
      onProgress?.(0.2);
      
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResult.ok) {
        throw new ServiceError("Upload failed", "upload", {
          details: "Failed to upload video file to storage",
        });
      }

      const { storageId } = await uploadResult.json();
      onProgress?.(0.5);

      // Create video record
      const videoId = await this.convex.mutation(api.videos.create, {
        projectId,
        title: file.name,
        storageId,
        canvasPosition: position,
      });

      onProgress?.(0.8);

      // Create canvas node
      const nodeId = `video-${videoId}`;
      await this.addNodeToCanvas(projectId, {
        id: nodeId,
        type: "video",
        position,
        data: {
          videoId,
          title: file.name,
          isUploading: false,
          hasTranscription: false,
        },
      });

      onProgress?.(1.0);

      return { nodeId, videoId };
    } catch (error) {
      const serviceError = ErrorHandler.handle(error, "Video node creation");
      ErrorHandler.notify(serviceError);
      throw serviceError;
    }
  }

  /**
   * Create an agent node
   */
  async createAgentNode(
    projectId: Id<"projects">,
    options: AgentCreationOptions
  ): Promise<{ nodeId: string; agentId: Id<"agents"> }> {
    try {
      const { type, position, connectedVideoId } = options;

      // Create agent in database
      const agentId = await this.convex.mutation(api.agents.create, {
        projectId,
        type,
        videoId: connectedVideoId,
        canvasPosition: position,
      });

      // Create canvas node
      const nodeId = `agent-${agentId}`;
      await this.addNodeToCanvas(projectId, {
        id: nodeId,
        type: "agent",
        position,
        data: {
          agentId,
          agentType: type,
          status: "idle",
          draft: "",
        },
      });

      return { nodeId, agentId };
    } catch (error) {
      const serviceError = ErrorHandler.handle(error, "Agent node creation");
      ErrorHandler.notify(serviceError);
      throw serviceError;
    }
  }

  /**
   * Add a node to the canvas
   */
  async addNodeToCanvas(projectId: Id<"projects">, node: NodeData): Promise<void> {
    try {
      await this.convex.mutation(api.canvas.addNode, {
        projectId,
        node: {
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data,
        },
      });
    } catch (error) {
      const serviceError = ErrorHandler.handle(error, "Add node to canvas");
      throw serviceError;
    }
  }

  /**
   * Update a node on the canvas
   */
  async updateNodeOnCanvas(
    projectId: Id<"projects">,
    nodeId: string,
    updates: Partial<NodeData>
  ): Promise<void> {
    try {
      await this.convex.mutation(api.canvas.updateNode, {
        projectId,
        nodeId,
        updates,
      });
    } catch (error) {
      const serviceError = ErrorHandler.handle(error, "Update node on canvas");
      throw serviceError;
    }
  }

  /**
   * Remove a node from the canvas
   */
  async removeNodeFromCanvas(projectId: Id<"projects">, nodeId: string): Promise<void> {
    try {
      await this.convex.mutation(api.canvas.removeNode, {
        projectId,
        nodeId,
      });
    } catch (error) {
      const serviceError = ErrorHandler.handle(error, "Remove node from canvas");
      throw serviceError;
    }
  }

  /**
   * Connect two nodes with an edge
   */
  async connectNodes(
    projectId: Id<"projects">,
    sourceNodeId: string,
    targetNodeId: string,
    edgeType?: string
  ): Promise<void> {
    try {
      const edgeId = `${sourceNodeId}-${targetNodeId}`;
      await this.convex.mutation(api.canvas.addEdge, {
        projectId,
        edge: {
          id: edgeId,
          source: sourceNodeId,
          target: targetNodeId,
          type: edgeType,
        },
      });
    } catch (error) {
      const serviceError = ErrorHandler.handle(error, "Connect nodes");
      ErrorHandler.notify(serviceError);
      throw serviceError;
    }
  }

  /**
   * Disconnect nodes by removing edge
   */
  async disconnectNodes(projectId: Id<"projects">, edgeId: string): Promise<void> {
    try {
      await this.convex.mutation(api.canvas.removeEdge, {
        projectId,
        edgeId,
      });
    } catch (error) {
      const serviceError = ErrorHandler.handle(error, "Disconnect nodes");
      throw serviceError;
    }
  }

  /**
   * Auto-arrange nodes on the canvas
   */
  arrangeNodes(nodes: NodeData[]): NodeData[] {
    const arrangedNodes = [...nodes];
    const nodeSpacing = { x: 400, y: 300 };
    const startPosition = { x: 100, y: 100 };

    // Group nodes by type for better organization
    const nodesByType = arrangedNodes.reduce((acc, node) => {
      if (!acc[node.type]) acc[node.type] = [];
      acc[node.type].push(node);
      return acc;
    }, {} as Record<string, NodeData[]>);

    let currentY = startPosition.y;

    // Arrange each type in rows
    Object.entries(nodesByType).forEach(([type, typeNodes]) => {
      let currentX = startPosition.x;

      typeNodes.forEach((node, index) => {
        node.position = {
          x: currentX,
          y: currentY,
        };
        currentX += nodeSpacing.x;

        // Start new row after 3 nodes
        if ((index + 1) % 3 === 0) {
          currentX = startPosition.x;
          currentY += nodeSpacing.y / 2;
        }
      });

      currentY += nodeSpacing.y;
    });

    return arrangedNodes;
  }

  /**
   * Get connected nodes for a given node
   */
  getConnectedNodes(nodeId: string, edges: EdgeData[]): string[] {
    return edges
      .filter(edge => edge.source === nodeId || edge.target === nodeId)
      .map(edge => edge.source === nodeId ? edge.target : edge.source);
  }

  /**
   * Get all nodes that feed into a specific node
   */
  getInputNodes(nodeId: string, edges: EdgeData[]): string[] {
    return edges
      .filter(edge => edge.target === nodeId)
      .map(edge => edge.source);
  }

  /**
   * Get all nodes that receive from a specific node
   */
  getOutputNodes(nodeId: string, edges: EdgeData[]): string[] {
    return edges
      .filter(edge => edge.source === nodeId)
      .map(edge => edge.target);
  }

  /**
   * Validate canvas state for consistency
   */
  validateCanvasState(nodes: NodeData[], edges: EdgeData[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const nodeIds = new Set(nodes.map(node => node.id));

    // Check if all edges reference existing nodes
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
  }

  /**
   * Calculate optimal canvas viewport to fit all nodes
   */
  calculateFitViewport(nodes: NodeData[]): CanvasViewport {
    if (nodes.length === 0) {
      return { x: 0, y: 0, zoom: 1 };
    }

    // Calculate bounds
    const bounds = nodes.reduce(
      (acc, node) => ({
        minX: Math.min(acc.minX, node.position.x),
        maxX: Math.max(acc.maxX, node.position.x + 300), // Assuming node width ~300px
        minY: Math.min(acc.minY, node.position.y),
        maxY: Math.max(acc.maxY, node.position.y + 200), // Assuming node height ~200px
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );

    // Calculate center point
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    // Calculate zoom to fit with some padding
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const viewportWidth = 1200; // Typical canvas width
    const viewportHeight = 800; // Typical canvas height
    const padding = 100;

    const zoomX = (viewportWidth - padding * 2) / width;
    const zoomY = (viewportHeight - padding * 2) / height;
    const zoom = Math.min(zoomX, zoomY, 1); // Don't zoom in more than 100%

    return {
      x: -centerX * zoom + viewportWidth / 2,
      y: -centerY * zoom + viewportHeight / 2,
      zoom,
    };
  }

  /**
   * Generate a unique node ID
   */
  generateNodeId(type: string): string {
    return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if a file is a valid video file
   */
  private isValidVideoFile(file: File): boolean {
    const validTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/webm', 'video/quicktime'];
    return validTypes.includes(file.type.toLowerCase());
  }

  /**
   * Create progress tracker for canvas operations
   */
  createProgressTracker(onProgress?: (progress: number, stage: string) => void) {
    let currentProgress = 0;
    let currentStage = "Initializing";

    return {
      setStage: (stage: string, progress?: number) => {
        currentStage = stage;
        if (progress !== undefined) {
          currentProgress = Math.max(currentProgress, progress);
        }
        onProgress?.(currentProgress, stage);
      },
      setProgress: (progress: number) => {
        currentProgress = Math.max(currentProgress, progress);
        onProgress?.(currentProgress, currentStage);
      },
      complete: () => {
        currentProgress = 1;
        currentStage = "Complete";
        onProgress?.(1, "Complete");
      },
      getProgress: () => currentProgress,
      getStage: () => currentStage,
    };
  }
}