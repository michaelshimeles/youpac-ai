import { Id } from "~/convex/_generated/dataModel";
import { BaseEntity, Position, MediaMetadata, AudioMetadata, ProcessingStatus, ProgressInfo } from "./common";

// Video entity types
export interface Video extends BaseEntity {
  _id: Id<"videos">;
  projectId: Id<"projects">;
  title?: string;
  videoUrl?: string;
  fileId?: string;
  storageId?: Id<"_storage">;
  canvasPosition: Position;
  
  // Metadata
  duration?: number;
  fileSize?: number;
  resolution?: {
    width: number;
    height: number;
  };
  frameRate?: number;
  bitRate?: number;
  format?: string;
  codec?: string;
  audioInfo?: AudioMetadata;
  thumbnails?: string[];
  
  // Processing status
  transcriptionStatus: ProcessingStatus;
  transcription?: string;
  transcriptionError?: string;
  transcriptionProgress?: string;
  transcriptionService?: "openai" | "elevenlabs";
  
  // Timestamps
  createdAt: number;
  updatedAt?: number;
}

// Video processing types
export interface VideoUploadOptions {
  file: File;
  projectId: Id<"projects">;
  position: Position;
  title?: string;
  extractMetadata?: boolean;
  generateThumbnails?: boolean;
  onProgress?: (progress: ProgressInfo) => void;
}

export interface VideoUploadResult {
  video: Video;
  storageId: Id<"_storage">;
  metadata?: VideoMetadata;
}

export interface VideoMetadata extends MediaMetadata {
  duration: number;
  fileSize: number;
  resolution: {
    width: number;
    height: number;
  };
  frameRate: number;
  bitRate: number;
  format: string;
  codec: string;
  audioInfo?: AudioMetadata;
  thumbnails: string[];
}

export interface VideoProcessingOptions {
  extractMetadata?: boolean;
  generateThumbnails?: boolean;
  thumbnailCount?: number;
  useFFmpeg?: boolean;
  onProgress?: (progress: ProgressInfo) => void;
  onStatusChange?: (status: ProcessingStatus) => void;
}

// Transcription types
export interface TranscriptionOptions {
  videoId: Id<"videos">;
  storageId: Id<"_storage">;
  service?: "openai" | "elevenlabs";
  language?: string;
  fileType?: string;
  fileName?: string;
  onProgress?: (progress: ProgressInfo) => void;
  onStatusChange?: (status: ProcessingStatus) => void;
}

export interface TranscriptionResult {
  success: boolean;
  transcription: string;
  service: string;
  language?: string;
  confidence?: number;
  wordCount?: number;
  duration?: number;
  metadata?: {
    processingTime: number;
    model: string;
    version: string;
  };
}

export interface TranscriptionSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
  confidence?: number;
}

export interface ManualTranscription {
  fileName: string;
  text: string;
  format: "txt" | "srt" | "vtt" | "json";
  uploadedAt: number;
  fileSize: number;
}

// Video validation types
export interface VideoValidationRule {
  name: string;
  message: string;
  validator: (file: File) => boolean;
}

export interface VideoValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    name: string;
    size: number;
    type: string;
    sizeFormatted: string;
    isSupported: boolean;
  };
}

// Video player types
export interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  playbackRate: number;
  buffered: TimeRanges | null;
  seeking: boolean;
  error: string | null;
}

export interface VideoPlayerControls {
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleFullscreen: () => void;
  setPlaybackRate: (rate: number) => void;
}

export interface VideoPlayerOptions {
  autoplay?: boolean;
  controls?: boolean;
  muted?: boolean;
  loop?: boolean;
  preload?: "none" | "metadata" | "auto";
  poster?: string;
  crossOrigin?: "anonymous" | "use-credentials";
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onVolumeChange?: (volume: number) => void;
  onError?: (error: string) => void;
}

// Video compression and optimization
export interface VideoCompressionOptions {
  quality: "low" | "medium" | "high";
  maxFileSize?: number; // in bytes
  maxDuration?: number; // in seconds
  targetBitrate?: number;
  removeAudio?: boolean;
  extractAudioOnly?: boolean;
  onProgress?: (progress: ProgressInfo) => void;
}

export interface VideoCompressionResult {
  originalFile: File;
  compressedFile: File;
  compressionRatio: number;
  qualityLoss: number;
  processingTime: number;
  savings: {
    sizeReduction: number;
    percentageReduction: number;
  };
}

// Video export and sharing
export interface VideoExportOptions {
  format: "mp4" | "webm" | "avi" | "mov";
  quality: "source" | "high" | "medium" | "low";
  resolution?: {
    width: number;
    height: number;
  };
  includeAudio: boolean;
  watermark?: {
    text: string;
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
    opacity: number;
  };
}

export interface VideoShareOptions {
  platform: "youtube" | "vimeo" | "twitter" | "facebook" | "instagram" | "linkedin";
  title: string;
  description?: string;
  tags?: string[];
  privacy: "public" | "unlisted" | "private";
  thumbnail?: string;
  publishAt?: Date;
}

// Video analytics
export interface VideoAnalytics {
  videoId: Id<"videos">;
  views: number;
  uniqueViews: number;
  totalWatchTime: number;
  averageWatchTime: number;
  completionRate: number;
  engagementRate: number;
  retentionCurve: Array<{
    time: number;
    retention: number;
  }>;
  geographicData: Record<string, number>;
  deviceData: Record<string, number>;
  referralSources: Record<string, number>;
}

// Video search and filtering
export interface VideoSearchOptions {
  query?: string;
  projectId?: Id<"projects">;
  hasTranscription?: boolean;
  duration?: {
    min?: number;
    max?: number;
  };
  resolution?: {
    min?: { width: number; height: number };
    max?: { width: number; height: number };
  };
  fileSize?: {
    min?: number;
    max?: number;
  };
  createdAt?: {
    start?: Date;
    end?: Date;
  };
  sortBy?: "createdAt" | "title" | "duration" | "fileSize";
  sortOrder?: "asc" | "desc";
}

export interface VideoSearchResult {
  videos: Video[];
  total: number;
  facets: {
    hasTranscription: number;
    formats: Record<string, number>;
    resolutions: Record<string, number>;
    durations: Record<string, number>;
  };
}

export default {};