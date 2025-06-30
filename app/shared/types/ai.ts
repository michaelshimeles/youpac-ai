import { Id } from "~/convex/_generated/dataModel";
import { BaseEntity, Position, ProcessingStatus, ProgressInfo } from "./common";

// Agent types
export type AgentType = "title" | "description" | "thumbnail" | "tweets";
export type AgentStatus = "idle" | "generating" | "ready" | "error";

export interface Agent extends BaseEntity {
  _id: Id<"agents">;
  type: AgentType;
  status: AgentStatus;
  draft: string;
  projectId: Id<"projects">;
  videoId?: Id<"videos">;
  canvasPosition: Position;
  
  // Generation metadata
  generatedAt?: number;
  generationTime?: number;
  prompt?: string;
  model?: string;
  tokens?: number;
  
  // Chat history
  chatHistory?: ChatMessage[];
  
  // Settings
  settings?: AgentSettings;
}

export interface AgentSettings {
  temperature: number;
  maxTokens: number;
  model: string;
  useAdvancedPrompts: boolean;
  autoRefine: boolean;
  style?: string;
  tone?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai" | "system";
  content: string;
  timestamp: number;
  agentId?: Id<"agents">;
  metadata?: {
    tokens?: number;
    model?: string;
    processingTime?: number;
  };
}

// Content generation types
export interface ContentGenerationRequest {
  agentType: AgentType;
  videoId?: Id<"videos">;
  videoData: VideoContentData;
  connectedAgentOutputs?: ConnectedAgentOutput[];
  moodBoardReferences?: MoodBoardReference[];
  profileData?: ChannelProfile;
  additionalContext?: string;
  settings?: Partial<AgentSettings>;
}

export interface VideoContentData {
  title?: string;
  transcription?: string;
  manualTranscriptions?: ManualTranscriptionData[];
  duration?: number;
  resolution?: {
    width: number;
    height: number;
  };
  format?: string;
  metadata?: Record<string, any>;
}

export interface ManualTranscriptionData {
  fileName: string;
  text: string;
  format: string;
  uploadedAt: number;
}

export interface ConnectedAgentOutput {
  type: string;
  content: string;
  agentId?: Id<"agents">;
  confidence?: number;
  generatedAt: number;
}

export interface MoodBoardReference {
  id: string;
  url: string;
  type: "youtube" | "image" | "music" | "website" | "color" | "text";
  title?: string;
  description?: string;
  imageData?: string;
  metadata?: Record<string, any>;
}

export interface ChannelProfile {
  channelName: string;
  contentType: string;
  niche: string;
  tone?: string;
  targetAudience?: string;
  brandColors?: string[];
  brandKeywords?: string[];
  competitorChannels?: string[];
}

// Generation results
export interface ContentGenerationResult {
  content: string;
  prompt: string;
  metadata: {
    model: string;
    tokens: number;
    processingTime: number;
    temperature: number;
    generatedAt: number;
  };
  variations?: ContentVariation[];
  confidence?: number;
  suggestions?: string[];
}

export interface ContentVariation {
  id: string;
  content: string;
  style: string;
  confidence: number;
  rating?: number;
  isSelected?: boolean;
  metadata?: {
    temperature: number;
    model: string;
    tokens: number;
  };
}

export interface ThumbnailGenerationRequest extends ContentGenerationRequest {
  agentType: "thumbnail";
  videoFrames: VideoFrame[];
  stylePreferences?: ThumbnailStylePreferences;
}

export interface VideoFrame {
  dataUrl: string;
  timestamp: number;
  description?: string;
}

export interface ThumbnailStylePreferences {
  colorScheme?: "vibrant" | "muted" | "monochrome" | "brand";
  textStyle?: "bold" | "elegant" | "playful" | "minimal";
  composition?: "centered" | "rule-of-thirds" | "dynamic" | "split";
  emotionalTone?: "excited" | "serious" | "friendly" | "mysterious";
}

export interface ThumbnailGenerationResult extends ContentGenerationResult {
  imageUrl: string;
  storageId?: Id<"_storage">;
  concept: string;
  designElements: {
    colors: string[];
    textOverlay?: string;
    composition: string;
    style: string;
  };
  alternatives?: Array<{
    imageUrl: string;
    concept: string;
    confidence: number;
  }>;
}

// Content refinement
export interface ContentRefinementRequest {
  agentId: Id<"agents">;
  userMessage: string;
  currentDraft: string;
  refinementType?: "improve" | "shorten" | "expand" | "restyle" | "fix";
  targetLength?: number;
  targetStyle?: string;
  specificInstructions?: string[];
}

export interface ContentRefinementResult {
  refinedContent: string;
  changes: ContentChange[];
  explanation: string;
  confidence: number;
  suggestions?: string[];
}

export interface ContentChange {
  type: "addition" | "deletion" | "modification" | "reorder";
  originalText: string;
  newText: string;
  reason: string;
  confidence: number;
}

// Content analysis and optimization
export interface ContentAnalysisRequest {
  content: string;
  contentType: AgentType;
  targetAudience?: string;
  platform?: "youtube" | "twitter" | "linkedin" | "facebook" | "instagram";
  competitorContent?: string[];
}

export interface ContentAnalysisResult {
  scores: {
    engagement: number;
    clarity: number;
    seo: number;
    brandAlignment: number;
    overall: number;
  };
  insights: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  optimizationSuggestions: OptimizationSuggestion[];
  competitiveAnalysis?: {
    positioning: "above" | "below" | "similar";
    differentiators: string[];
    improvements: string[];
  };
}

export interface OptimizationSuggestion {
  type: "keyword" | "structure" | "tone" | "length" | "cta" | "emotion";
  suggestion: string;
  impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  priority: number;
}

// Batch operations
export interface BatchGenerationRequest {
  requests: ContentGenerationRequest[];
  parallelLimit?: number;
  failurePolicy?: "stop" | "continue";
  onProgress?: (completed: number, total: number, current?: string) => void;
}

export interface BatchGenerationResult {
  results: Array<{
    request: ContentGenerationRequest;
    result?: ContentGenerationResult;
    error?: string;
    status: "completed" | "failed" | "skipped";
  }>;
  summary: {
    total: number;
    completed: number;
    failed: number;
    skipped: number;
    totalTime: number;
    averageTime: number;
  };
}

// Content templates and presets
export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  agentType: AgentType;
  template: string;
  variables: TemplateVariable[];
  category: string;
  tags: string[];
  usageCount: number;
  rating: number;
  createdAt: number;
  updatedAt: number;
}

export interface TemplateVariable {
  name: string;
  type: "text" | "number" | "boolean" | "select" | "multiselect";
  description: string;
  required: boolean;
  defaultValue?: any;
  options?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface ContentPreset {
  id: string;
  name: string;
  description: string;
  agentType: AgentType;
  settings: AgentSettings;
  promptModifiers: string[];
  styleInstructions: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  createdBy: string;
  usageCount: number;
  rating: number;
}

// Performance tracking
export interface AIPerformanceMetrics {
  agentType: AgentType;
  totalGenerations: number;
  successRate: number;
  averageGenerationTime: number;
  averageTokenUsage: number;
  userSatisfactionScore: number;
  popularSettings: AgentSettings;
  commonFailures: Array<{
    error: string;
    frequency: number;
    lastOccurrence: number;
  }>;
  trendsOverTime: Array<{
    date: string;
    generations: number;
    successRate: number;
    averageTime: number;
  }>;
}

export interface ModelUsageStats {
  model: string;
  totalTokens: number;
  totalRequests: number;
  averageTokensPerRequest: number;
  cost: number;
  successRate: number;
  averageLatency: number;
  lastUsed: number;
}

// AI service configuration
export interface AIServiceConfig {
  openai: {
    apiKey: string;
    baseUrl?: string;
    organization?: string;
    models: {
      chat: string;
      completion: string;
      image: string;
    };
    rateLimits: {
      requestsPerMinute: number;
      tokensPerMinute: number;
    };
  };
  elevenlabs?: {
    apiKey: string;
    models: {
      speechToText: string;
    };
  };
  defaultSettings: AgentSettings;
  enabledFeatures: {
    contentVariations: boolean;
    batchGeneration: boolean;
    realTimeRefinement: boolean;
    performanceTracking: boolean;
  };
}

export default {};