import { Id } from "~/convex/_generated/dataModel";
import { BaseEntity, SearchOptions, PaginatedResult } from "./common";

// Project entity types
export interface Project extends BaseEntity {
  _id: Id<"projects">;
  title: string;
  description?: string;
  
  // Settings
  settings: ProjectSettings;
  
  // Statistics
  stats: ProjectStats;
  
  // Sharing and collaboration
  isShared: boolean;
  shareToken?: string;
  shareSettings?: ShareSettings;
  collaborators?: Collaborator[];
  
  // Organization
  tags: string[];
  category?: string;
  folder?: string;
  
  // Status
  status: "active" | "archived" | "deleted";
  lastActivity: number;
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
}

export interface ProjectSettings {
  // AI and generation settings
  aiSettings: {
    defaultModel: string;
    temperature: number;
    maxTokens: number;
    useAdvancedPrompts: boolean;
    autoGenerate: boolean;
  };
  
  // Canvas settings
  canvasSettings: {
    autoLayout: boolean;
    snapToGrid: boolean;
    showMiniMap: boolean;
    enableAnimations: boolean;
    theme: "light" | "dark" | "auto";
  };
  
  // Video processing settings
  videoSettings: {
    autoTranscribe: boolean;
    transcriptionService: "openai" | "elevenlabs";
    extractMetadata: boolean;
    generateThumbnails: boolean;
    maxFileSize: number;
  };
  
  // Export and sharing settings
  exportSettings: {
    defaultFormat: string;
    includeWatermark: boolean;
    watermarkText?: string;
    quality: "low" | "medium" | "high";
  };
  
  // Notification settings
  notifications: {
    emailUpdates: boolean;
    generationComplete: boolean;
    transcriptionComplete: boolean;
    errorAlerts: boolean;
  };
}

export interface ProjectStats {
  // Content counts
  videoCount: number;
  agentCount: number;
  transcriptionCount: number;
  moodBoardCount: number;
  
  // Agent type breakdown
  agentsByType: {
    title: number;
    description: number;
    thumbnail: number;
    tweets: number;
  };
  
  // Processing statistics
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  totalTranscriptions: number;
  
  // Usage statistics
  totalProcessingTime: number;
  totalTokensUsed: number;
  totalStorageUsed: number;
  
  // Time-based metrics
  createdThisWeek: number;
  createdThisMonth: number;
  lastActivity: number;
}

export interface ShareSettings {
  type: "view" | "edit" | "comment";
  expiresAt?: number;
  password?: string;
  allowDownload: boolean;
  allowCopy: boolean;
  requireAuth: boolean;
  
  // Access controls
  maxViews?: number;
  currentViews: number;
  allowedDomains?: string[];
  restrictToUsers?: string[];
  
  // Permissions
  permissions: {
    viewCanvas: boolean;
    editCanvas: boolean;
    addNodes: boolean;
    deleteNodes: boolean;
    generateContent: boolean;
    exportProject: boolean;
  };
}

export interface Collaborator {
  userId: string;
  email: string;
  name?: string;
  role: "owner" | "editor" | "viewer" | "commenter";
  permissions: string[];
  addedAt: number;
  lastActive?: number;
  inviteStatus: "pending" | "accepted" | "declined";
}

// Project creation and management
export interface ProjectCreationOptions {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  settings?: Partial<ProjectSettings>;
  template?: ProjectTemplate;
  importFrom?: {
    type: "file" | "url" | "project";
    source: string;
    options?: ImportOptions;
  };
}

export interface ProjectUpdateOptions {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  settings?: Partial<ProjectSettings>;
  status?: "active" | "archived" | "deleted";
}

export interface ImportOptions {
  includeVideos: boolean;
  includeAgents: boolean;
  includeTranscriptions: boolean;
  includeMoodBoards: boolean;
  preserveLayout: boolean;
  preserveSettings: boolean;
  overwriteExisting: boolean;
}

// Project templates
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  
  // Template content
  defaultSettings: Partial<ProjectSettings>;
  nodeTemplates: ProjectNodeTemplate[];
  canvasLayout?: {
    viewport: { x: number; y: number; zoom: number };
    nodePositions: Record<string, { x: number; y: number }>;
  };
  
  // Metadata
  isPublic: boolean;
  createdBy: string;
  usageCount: number;
  rating: number;
  version: string;
  
  // Preview
  thumbnail?: string;
  screenshots: string[];
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
}

export interface ProjectNodeTemplate {
  type: "video" | "agent" | "transcription" | "moodboard";
  position: { x: number; y: number };
  config: Record<string, any>;
  connections: string[];
}

// Project search and filtering
export interface ProjectSearchOptions extends SearchOptions {
  category?: string;
  tags?: string[];
  status?: "active" | "archived" | "deleted";
  hasContent?: {
    videos?: boolean;
    agents?: boolean;
    transcriptions?: boolean;
  };
  dateRange?: {
    start: Date;
    end: Date;
    field: "createdAt" | "updatedAt" | "lastActivity";
  };
  collaborator?: string;
  isShared?: boolean;
  minStats?: Partial<ProjectStats>;
}

export interface ProjectSearchResult extends PaginatedResult<Project> {
  facets: {
    categories: Record<string, number>;
    tags: Record<string, number>;
    status: Record<string, number>;
    collaboratorCount: Record<string, number>;
  };
  suggestions?: string[];
}

// Project export and backup
export interface ProjectExportOptions {
  format: "json" | "zip" | "pdf" | "html";
  includeContent: {
    videos: boolean;
    transcriptions: boolean;
    generatedContent: boolean;
    moodBoards: boolean;
    canvasLayout: boolean;
    settings: boolean;
    analytics: boolean;
  };
  compression?: "none" | "gzip" | "brotli";
  encryption?: {
    enabled: boolean;
    password?: string;
    algorithm?: "aes-256" | "chacha20";
  };
}

export interface ProjectExportResult {
  format: string;
  fileSize: number;
  downloadUrl: string;
  expiresAt: number;
  checksum: string;
  metadata: {
    projectId: Id<"projects">;
    exportedAt: number;
    exportedBy: string;
    version: string;
    contentSummary: {
      nodeCount: number;
      videoCount: number;
      agentCount: number;
      totalSize: number;
    };
  };
}

export interface ProjectBackupOptions {
  schedule?: "daily" | "weekly" | "monthly" | "manual";
  retention: number; // days
  destination: "cloud" | "local" | "both";
  encryption: boolean;
  compression: boolean;
  includeMedia: boolean;
}

export interface ProjectBackup {
  id: string;
  projectId: Id<"projects">;
  type: "scheduled" | "manual";
  status: "creating" | "completed" | "failed";
  size: number;
  location: string;
  checksum: string;
  createdAt: number;
  expiresAt?: number;
  restorePoint?: {
    version: number;
    nodeCount: number;
    contentHash: string;
  };
}

// Project analytics
export interface ProjectAnalytics {
  projectId: Id<"projects">;
  timeRange: {
    start: number;
    end: number;
  };
  
  // Usage metrics
  usage: {
    dailyActiveTime: number[];
    generationsPerDay: number[];
    transcriptionsPerDay: number[];
    collaboratorActivity: Record<string, number>;
  };
  
  // Performance metrics
  performance: {
    averageGenerationTime: number;
    averageTranscriptionTime: number;
    successRates: {
      generation: number;
      transcription: number;
      export: number;
    };
  };
  
  // Content metrics
  content: {
    mostUsedAgentTypes: Record<string, number>;
    averageContentLength: Record<string, number>;
    contentQualityScores: Record<string, number>;
    popularTemplates: Array<{
      templateId: string;
      usageCount: number;
    }>;
  };
  
  // Collaboration metrics
  collaboration: {
    totalCollaborators: number;
    activeCollaborators: number;
    commentsCount: number;
    changesCount: number;
    conflictCount: number;
  };
}

// Project organization
export interface ProjectFolder {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  color?: string;
  icon?: string;
  position: number;
  projectCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectTag {
  id: string;
  name: string;
  color?: string;
  description?: string;
  projectCount: number;
  isSystemTag: boolean;
  createdAt: number;
}

export interface ProjectCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  parentId?: string;
  projectCount: number;
  templates: string[];
  isDefault: boolean;
}

// Project permissions and access control
export interface ProjectPermission {
  action: string;
  resource: string;
  conditions?: Record<string, any>;
}

export interface ProjectRole {
  id: string;
  name: string;
  description?: string;
  permissions: ProjectPermission[];
  isSystemRole: boolean;
  canDelegate: boolean;
  maxCollaborators?: number;
}

export interface ProjectAccessRequest {
  id: string;
  projectId: Id<"projects">;
  requesterId: string;
  requesterEmail: string;
  requestedRole: string;
  message?: string;
  status: "pending" | "approved" | "denied";
  reviewedBy?: string;
  reviewedAt?: number;
  createdAt: number;
}

export default {};