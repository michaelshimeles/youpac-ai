import type { Id } from "../../convex/_generated/dataModel";
import type { ProcessingStatus, ProgressInfo, RetryConfig } from "./common";

// Base API types
export interface ApiRequest<T = any> {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  data?: T;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
  retryConfig?: RetryConfig;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ApiMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
  retryable: boolean;
  retryAfter?: number;
}

export interface ApiMetadata {
  requestId: string;
  timestamp: number;
  duration: number;
  version: string;
  rateLimit?: {
    remaining: number;
    reset: number;
    limit: number;
  };
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Convex API abstractions
export interface ConvexQueryOptions {
  staleTime?: number;
  refetchInterval?: number;
  enabled?: boolean;
  suspense?: boolean;
}

export interface ConvexMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
}

export interface ConvexActionOptions {
  onProgress?: (progress: ProgressInfo) => void;
  signal?: AbortSignal;
  timeout?: number;
}

// Service API interfaces
export interface VideoServiceAPI {
  // Video management
  createVideo: (options: CreateVideoRequest) => Promise<CreateVideoResponse>;
  updateVideo: (id: Id<"videos">, updates: UpdateVideoRequest) => Promise<void>;
  deleteVideo: (id: Id<"videos">) => Promise<void>;
  getVideo: (id: Id<"videos">) => Promise<GetVideoResponse>;
  listVideos: (projectId: Id<"projects">, options?: ListVideosOptions) => Promise<ListVideosResponse>;
  
  // Video processing
  uploadVideo: (file: File, options: UploadVideoRequest) => Promise<UploadVideoResponse>;
  processVideo: (id: Id<"videos">, options: ProcessVideoRequest) => Promise<ProcessVideoResponse>;
  extractMetadata: (id: Id<"videos">) => Promise<ExtractMetadataResponse>;
  generateThumbnails: (id: Id<"videos">, count?: number) => Promise<GenerateThumbnailsResponse>;
  
  // Transcription
  transcribeVideo: (id: Id<"videos">, options: TranscribeVideoRequest) => Promise<TranscribeVideoResponse>;
  getTranscription: (id: Id<"videos">) => Promise<GetTranscriptionResponse>;
  updateTranscription: (id: Id<"videos">, transcription: string) => Promise<void>;
  clearTranscription: (id: Id<"videos">) => Promise<void>;
}

export interface AIServiceAPI {
  // Content generation
  generateContent: (request: GenerateContentRequest) => Promise<GenerateContentResponse>;
  refineContent: (request: RefineContentRequest) => Promise<RefineContentResponse>;
  generateThumbnail: (request: GenerateThumbnailRequest) => Promise<GenerateThumbnailResponse>;
  
  // Batch operations
  generateBatch: (requests: BatchGenerateRequest) => Promise<BatchGenerateResponse>;
  
  // Analysis
  analyzeContent: (request: AnalyzeContentRequest) => Promise<AnalyzeContentResponse>;
  getOptimizationSuggestions: (content: string, type: string) => Promise<OptimizationSuggestionsResponse>;
  // Templates and presets
  listTemplates: (type?: string) => Promise<any>;
  createTemplate: (template: any) => Promise<any>;
  applyTemplate: (templateId: string, data: any) => Promise<any>;
}

export interface CanvasServiceAPI {
  // Canvas state
  getCanvasState: (projectId: Id<"projects">) => Promise<GetCanvasStateResponse>;
  saveCanvasState: (projectId: Id<"projects">, state: SaveCanvasStateRequest) => Promise<void>;
  resetCanvas: (projectId: Id<"projects">) => Promise<void>;
  
  // Node management
  addNode: (projectId: Id<"projects">, node: AddNodeRequest) => Promise<AddNodeResponse>;
  updateNode: (projectId: Id<"projects">, nodeId: string, updates: UpdateNodeRequest) => Promise<void>;
  removeNode: (projectId: Id<"projects">, nodeId: string) => Promise<void>;
  duplicateNode: (projectId: Id<"projects">, nodeId: string) => Promise<DuplicateNodeResponse>;
  
  // Edge management
  addEdge: (projectId: Id<"projects">, edge: AddEdgeRequest) => Promise<void>;
  removeEdge: (projectId: Id<"projects">, edgeId: string) => Promise<void>;
  
  // Layout and arrangement
  arrangeNodes: (projectId: Id<"projects">, algorithm?: string) => Promise<ArrangeNodesResponse>;
  fitView: (projectId: Id<"projects">) => Promise<FitViewResponse>;
}

export interface ProjectServiceAPI {
  // Project management
  createProject: (request: CreateProjectRequest) => Promise<CreateProjectResponse>;
  updateProject: (id: Id<"projects">, updates: UpdateProjectRequest) => Promise<void>;
  deleteProject: (id: Id<"projects">) => Promise<void>;
  getProject: (id: Id<"projects">) => Promise<GetProjectResponse>;
  listProjects: (options?: ListProjectsOptions) => Promise<ListProjectsResponse>;
  
  // Sharing and collaboration
  shareProject: (id: Id<"projects">, options: ShareProjectRequest) => Promise<ShareProjectResponse>;
  addCollaborator: (id: Id<"projects">, collaborator: AddCollaboratorRequest) => Promise<void>;
  removeCollaborator: (id: Id<"projects">, userId: string) => Promise<void>;
  updatePermissions: (id: Id<"projects">, userId: string, permissions: string[]) => Promise<void>;
  
  // Import/export
  exportProject: (id: Id<"projects">, options: ExportProjectRequest) => Promise<ExportProjectResponse>;
  importProject: (data: ImportProjectRequest) => Promise<ImportProjectResponse>;
  
  // Analytics
  getProjectAnalytics: (id: Id<"projects">, options?: AnalyticsOptions) => Promise<ProjectAnalyticsResponse>;
}

// Request/Response types
export interface CreateVideoRequest {
  projectId: Id<"projects">;
  title?: string;
  videoUrl?: string;
  storageId?: Id<"_storage">;
  canvasPosition: { x: number; y: number };
}

export interface CreateVideoResponse {
  videoId: Id<"videos">;
  video: any; // Video entity
}

export interface UpdateVideoRequest {
  title?: string;
  transcription?: string;
  canvasPosition?: { x: number; y: number };
}

export interface GetVideoResponse {
  video: any; // Video entity
}

export interface ListVideosOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: Record<string, any>;
}

export interface ListVideosResponse {
  videos: any[]; // Video entities
  total: number;
  hasMore: boolean;
}

export interface UploadVideoRequest {
  projectId: Id<"projects">;
  canvasPosition: { x: number; y: number };
  extractMetadata?: boolean;
  generateThumbnails?: boolean;
}

export interface UploadVideoResponse {
  videoId: Id<"videos">;
  storageId: Id<"_storage">;
  metadata?: any;
}

export interface ProcessVideoRequest {
  extractMetadata?: boolean;
  generateThumbnails?: boolean;
  transcribe?: boolean;
  transcriptionService?: "openai" | "elevenlabs";
}

export interface ProcessVideoResponse {
  status: ProcessingStatus;
  metadata?: any;
  thumbnails?: string[];
  transcription?: string;
}

export interface TranscribeVideoRequest {
  service?: "openai" | "elevenlabs";
  language?: string;
  options?: Record<string, any>;
}

export interface TranscribeVideoResponse {
  transcription: string;
  language?: string;
  confidence?: number;
  service: string;
  metadata?: any;
}

export interface GenerateContentRequest {
  agentType: "title" | "description" | "thumbnail" | "tweets";
  videoId?: Id<"videos">;
  videoData: any;
  connectedOutputs?: any[];
  profileData?: any;
  settings?: any;
}

export interface GenerateContentResponse {
  content: string;
  prompt: string;
  metadata: {
    model: string;
    tokens: number;
    processingTime: number;
    confidence?: number;
  };
  variations?: any[];
}

export interface RefineContentRequest {
  agentId: Id<"agents">;
  userMessage: string;
  currentDraft: string;
  refinementType?: string;
  options?: any;
}

export interface RefineContentResponse {
  refinedContent: string;
  changes: any[];
  explanation: string;
  confidence: number;
}

export interface GenerateThumbnailRequest extends GenerateContentRequest {
  agentType: "thumbnail";
  videoFrames: Array<{
    dataUrl: string;
    timestamp: number;
  }>;
  stylePreferences?: any;
}

export interface GenerateThumbnailResponse extends GenerateContentResponse {
  imageUrl: string;
  storageId?: Id<"_storage">;
  concept: string;
  designElements: any;
}

export interface BatchGenerateRequest {
  requests: GenerateContentRequest[];
  options?: {
    parallelLimit?: number;
    failurePolicy?: "stop" | "continue";
  };
}

export interface BatchGenerateResponse {
  results: Array<{
    request: GenerateContentRequest;
    result?: GenerateContentResponse;
    error?: string;
    status: "completed" | "failed" | "skipped";
  }>;
  summary: {
    total: number;
    completed: number;
    failed: number;
    totalTime: number;
  };
}

// Canvas API types
export interface SaveCanvasStateRequest {
  nodes: any[];
  edges: any[];
  viewport: { x: number; y: number; zoom: number };
}

export interface GetCanvasStateResponse {
  state: any; // Canvas state entity
}

export interface AddNodeRequest {
  type: string;
  position: { x: number; y: number };
  data: any;
}

export interface AddNodeResponse {
  nodeId: string;
  node: any;
}

export interface UpdateNodeRequest {
  position?: { x: number; y: number };
  data?: any;
}

export interface AddEdgeRequest {
  source: string;
  target: string;
  type?: string;
  data?: any;
}

export interface ArrangeNodesResponse {
  nodes: Array<{
    id: string;
    position: { x: number; y: number };
  }>;
}

export interface FitViewResponse {
  viewport: { x: number; y: number; zoom: number };
}

// Project API types
export interface CreateProjectRequest {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  settings?: any;
  template?: string;
}

export interface CreateProjectResponse {
  projectId: Id<"projects">;
  project: any;
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  settings?: any;
}

export interface GetProjectResponse {
  project: any;
  stats: any;
  permissions: string[];
}

export interface ListProjectsOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  category?: string;
  tags?: string[];
  status?: string;
  search?: string;
}

export interface ListProjectsResponse {
  projects: any[];
  total: number;
  facets: any;
}

export interface ShareProjectRequest {
  type: "view" | "edit" | "comment";
  expiresAt?: Date;
  password?: string;
  permissions?: string[];
}

export interface ShareProjectResponse {
  shareUrl: string;
  shareToken: string;
  expiresAt?: Date;
}

export interface AddCollaboratorRequest {
  email: string;
  role: string;
  permissions?: string[];
  message?: string;
}

export interface ExportProjectRequest {
  format: "json" | "zip" | "pdf";
  includeContent: {
    videos: boolean;
    transcriptions: boolean;
    generatedContent: boolean;
  };
  options?: any;
}

export interface ExportProjectResponse {
  downloadUrl: string;
  fileSize: number;
  expiresAt: number;
  checksum: string;
}

export interface ImportProjectRequest {
  data: any;
  options: {
    preserveIds?: boolean;
    overwriteExisting?: boolean;
    includeSettings?: boolean;
  };
}

export interface ImportProjectResponse {
  projectId: Id<"projects">;
  imported: {
    nodeCount: number;
    videoCount: number;
    agentCount: number;
  };
  warnings: string[];
}

export interface AnalyticsOptions {
  timeRange?: {
    start: Date;
    end: Date;
  };
  metrics?: string[];
  granularity?: "day" | "week" | "month";
}

export interface ProjectAnalyticsResponse {
  analytics: any; // Project analytics data
  trends: any[];
  insights: string[];
}

// API client configuration
export interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  retryConfig: RetryConfig;
  headers: Record<string, string>;
  interceptors: {
    request?: Array<(config: ApiRequest) => ApiRequest>;
    response?: Array<(response: ApiResponse) => ApiResponse>;
    error?: Array<(error: ApiError) => ApiError>;
  };
}

export interface ExtractMetadataResponse {
  metadata: {
    duration: number;
    dimensions: { width: number; height: number };
    fileSize: number;
    format: string;
    bitrate?: number;
    frameRate?: number;
  };
}

export interface GenerateThumbnailsResponse {
  thumbnails: Array<{
    url: string;
    timestamp: number;
    storageId?: Id<"_storage">;
  }>;
}

export interface GetTranscriptionResponse {
  transcription: string;
  language?: string;
  confidence?: number;
  service?: string;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
}

export interface AnalyzeContentRequest {
  content: string;
  type: "title" | "description" | "video" | "thumbnail";
  context?: {
    videoData?: any;
    targetAudience?: string;
    platform?: string;
  };
}

export interface AnalyzeContentResponse {
  analysis: {
    sentiment: string;
    readability: number;
    keyTopics: string[];
    suggestions: string[];
  };
  score: number;
  recommendations: Array<{
    type: string;
    message: string;
    priority: "low" | "medium" | "high";
  }>;
}

export interface OptimizationSuggestionsResponse {
  suggestions: Array<{
    type: string;
    current: string;
    suggested: string;
    reason: string;
    impact: "low" | "medium" | "high";
  }>;
  overallScore: number;
  priorities: string[];
}

export interface DuplicateNodeResponse {
  nodeId: string;
  node: any;
}

export default {};