import { Id } from "~/convex/_generated/dataModel";
import { Position, Viewport, BaseEntity } from "./common";
import { AgentType } from "./ai";

// Canvas node types
export type NodeType = "video" | "agent" | "transcription" | "moodboard" | "output";

export interface CanvasNode {
  id: string;
  type: NodeType;
  position: Position;
  data: NodeData;
  selected?: boolean;
  dragging?: boolean;
  hidden?: boolean;
  locked?: boolean;
  zIndex?: number;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: EdgeType;
  animated?: boolean;
  style?: React.CSSProperties;
  data?: EdgeData;
  hidden?: boolean;
  selected?: boolean;
}

export type EdgeType = "default" | "straight" | "smoothstep" | "step";

export interface EdgeData {
  label?: string;
  description?: string;
  dataFlow?: "unidirectional" | "bidirectional";
  connectionType?: "primary" | "secondary" | "weak";
}

// Node data types
export type NodeData = 
  | VideoNodeData 
  | AgentNodeData 
  | TranscriptionNodeData 
  | MoodBoardNodeData
  | OutputNodeData;

export interface VideoNodeData {
  videoId: Id<"videos">;
  title?: string;
  videoUrl?: string;
  thumbnail?: string;
  duration?: number;
  fileSize?: number;
  isUploading?: boolean;
  isTranscribing?: boolean;
  hasTranscription?: boolean;
  transcriptionStatus?: "idle" | "processing" | "completed" | "failed";
  transcriptionProgress?: string;
  transcriptionError?: string;
  metadata?: {
    resolution?: { width: number; height: number };
    format?: string;
    bitRate?: number;
    frameRate?: number;
  };
  // Event handlers
  onVideoClick?: () => void;
  onRetryTranscription?: () => void;
  onUploadTranscription?: () => void;
  onViewTranscription?: () => void;
}

export interface AgentNodeData {
  agentId: Id<"agents">;
  agentType: AgentType;
  status: "idle" | "generating" | "ready" | "error";
  draft: string;
  isGenerating?: boolean;
  generationProgress?: string;
  error?: string;
  lastGenerated?: number;
  
  // Content metadata
  wordCount?: number;
  characterCount?: number;
  rating?: number;
  
  // UI state
  isExpanded?: boolean;
  showPreview?: boolean;
  
  // Event handlers
  onGenerate?: () => void;
  onRegenerate?: () => void;
  onEdit?: () => void;
  onCopy?: () => void;
  onPreview?: () => void;
  onChat?: () => void;
}

export interface TranscriptionNodeData {
  transcriptionId?: string;
  videoId?: Id<"videos">;
  text: string;
  fileName?: string;
  format: "auto" | "manual" | "uploaded";
  source: "openai" | "elevenlabs" | "manual" | "file";
  language?: string;
  confidence?: number;
  wordCount?: number;
  segments?: TranscriptionSegment[];
  
  // Processing state
  isProcessing?: boolean;
  progress?: number;
  error?: string;
  
  // Event handlers
  onEdit?: () => void;
  onExport?: () => void;
  onView?: () => void;
}

export interface TranscriptionSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
  confidence?: number;
}

export interface MoodBoardNodeData {
  moodBoardId?: string;
  title: string;
  description?: string;
  references: MoodBoardReference[];
  category?: "visual" | "audio" | "text" | "color" | "style";
  tags?: string[];
  
  // Event handlers
  onAddReference?: () => void;
  onEditReference?: (referenceId: string) => void;
  onRemoveReference?: (referenceId: string) => void;
  onPreview?: () => void;
}

export interface MoodBoardReference {
  id: string;
  type: "youtube" | "image" | "music" | "website" | "color" | "text";
  url?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  color?: string;
  textContent?: string;
  metadata?: Record<string, any>;
}

export interface OutputNodeData {
  outputType: "export" | "share" | "publish" | "download";
  title: string;
  description?: string;
  format?: string;
  platform?: string;
  status: "idle" | "processing" | "completed" | "failed";
  progress?: number;
  result?: {
    url?: string;
    fileSize?: number;
    downloadUrl?: string;
    shareUrl?: string;
  };
  error?: string;
  
  // Event handlers
  onProcess?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onRetry?: () => void;
}

// Canvas state management
export interface CanvasState extends BaseEntity {
  _id: Id<"canvasStates">;
  projectId: Id<"projects">;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: Viewport;
  
  // Canvas settings
  settings: CanvasSettings;
  
  // Layout information
  layout?: {
    algorithm: "manual" | "auto" | "grid" | "tree";
    lastAutoLayout?: number;
    nodeSpacing: { x: number; y: number };
  };
  
  // Version control
  version: number;
  lastModified: number;
  modifiedBy: string;
}

export interface CanvasSettings {
  showMiniMap: boolean;
  showControls: boolean;
  enableZoom: boolean;
  enablePan: boolean;
  enableSelection: boolean;
  enableDragging: boolean;
  enableEdgeAnimation: boolean;
  snapToGrid: boolean;
  gridSize: number;
  theme: "light" | "dark" | "auto";
  nodeStyles: {
    cornerRadius: number;
    borderWidth: number;
    shadowEnabled: boolean;
  };
  edgeStyles: {
    strokeWidth: number;
    animationSpeed: number;
    connectionType: "bezier" | "straight" | "step";
  };
}

// Canvas operations
export interface CanvasOperation {
  type: "add-node" | "remove-node" | "update-node" | "add-edge" | "remove-edge" | "move-node" | "update-viewport";
  timestamp: number;
  userId: string;
  data: any;
  undoData?: any;
}

export interface CanvasHistory {
  operations: CanvasOperation[];
  currentIndex: number;
  maxHistory: number;
}

// Node creation and management
export interface NodeCreationOptions {
  type: NodeType;
  position: Position;
  data: Partial<NodeData>;
  connectTo?: string[];
  autoConnect?: boolean;
}

export interface NodeUpdateOptions {
  position?: Position;
  data?: Partial<NodeData>;
  selected?: boolean;
  hidden?: boolean;
  locked?: boolean;
}

export interface EdgeCreationOptions {
  source: string;
  target: string;
  type?: EdgeType;
  animated?: boolean;
  data?: EdgeData;
  sourceHandle?: string;
  targetHandle?: string;
}

// Canvas layout and arrangement
export interface LayoutOptions {
  algorithm: "auto" | "grid" | "tree" | "force" | "circular";
  direction?: "horizontal" | "vertical";
  spacing: { x: number; y: number };
  alignment?: "start" | "center" | "end";
  grouping?: "by-type" | "by-connection" | "none";
  animate?: boolean;
  animationDuration?: number;
}

export interface LayoutResult {
  nodes: Array<{
    id: string;
    position: Position;
  }>;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  viewport?: Viewport;
}

// Canvas interaction types
export interface CanvasInteraction {
  type: "node-click" | "node-drag" | "edge-click" | "canvas-click" | "selection-change";
  target?: string;
  data?: any;
  position?: Position;
  timestamp: number;
}

export interface SelectionState {
  selectedNodes: string[];
  selectedEdges: string[];
  selectionBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Canvas export and sharing
export interface CanvasExportOptions {
  format: "png" | "jpg" | "svg" | "pdf" | "json";
  quality?: number;
  resolution?: { width: number; height: number };
  includeBackground?: boolean;
  selectedOnly?: boolean;
  padding?: number;
}

export interface CanvasExportResult {
  format: string;
  dataUrl?: string;
  blob?: Blob;
  metadata: {
    dimensions: { width: number; height: number };
    nodeCount: number;
    edgeCount: number;
    exportedAt: number;
  };
}

export interface CanvasShareOptions {
  type: "view" | "edit" | "comment";
  expiresAt?: Date;
  password?: string;
  allowDownload?: boolean;
  watermark?: {
    text: string;
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  };
}

export interface CanvasShareResult {
  shareUrl: string;
  shareToken: string;
  qrCode?: string;
  expiresAt?: Date;
  permissions: string[];
}

// Canvas templates and presets
export interface CanvasTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  nodes: Omit<CanvasNode, "id">[];
  edges: Omit<CanvasEdge, "id" | "source" | "target">[];
  settings: Partial<CanvasSettings>;
  preview?: string;
  usageCount: number;
  rating: number;
  createdAt: number;
  createdBy: string;
}

// Canvas performance and optimization
export interface CanvasPerformanceMetrics {
  renderTime: number;
  nodeCount: number;
  edgeCount: number;
  viewportOperations: number;
  memoryUsage: number;
  fps: number;
  timestamp: number;
}

export interface CanvasOptimizationOptions {
  enableVirtualization?: boolean;
  maxVisibleNodes?: number;
  lodEnabled?: boolean;
  lodThreshold?: number;
  edgeSimplification?: boolean;
  batchUpdates?: boolean;
}

export default {};