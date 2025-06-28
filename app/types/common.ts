import { Id } from "~/convex/_generated/dataModel";

// Common utility types
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredField<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Database entity base type
export interface BaseEntity {
  _id: Id<any>;
  _creationTime: number;
  userId: string;
}

// Position and dimension types
export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds extends Position, Size {}

export interface Viewport extends Position {
  zoom: number;
}

// File and media types
export interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface MediaMetadata {
  duration?: number;
  resolution?: Size;
  bitRate?: number;
  frameRate?: number;
  format?: string;
  codec?: string;
}

export interface AudioMetadata {
  codec: string;
  sampleRate: number;
  channels: number;
  bitRate: number;
}

// Progress and status types
export type ProcessingStatus = 
  | "idle" 
  | "pending" 
  | "processing" 
  | "completed" 
  | "failed"
  | "cancelled";

export interface ProgressInfo {
  current: number;
  total: number;
  percentage: number;
  stage?: string;
  message?: string;
  estimatedTimeRemaining?: number;
}

export interface ProcessingResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

// Error handling types
export type ErrorSeverity = "low" | "medium" | "high" | "critical";

export type ErrorCategory = 
  | "network"
  | "authentication" 
  | "validation"
  | "upload"
  | "transcription"
  | "ai_generation"
  | "storage"
  | "rate_limit"
  | "server"
  | "unknown";

export interface ErrorDetails {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoverable: boolean;
  context?: string;
  details?: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxRetryDelay: number;
}

// Validation types
export interface ValidationRule<T = any> {
  name: string;
  message: string;
  validator: (value: T) => boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Feature flags and settings
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage?: number;
  conditions?: Record<string, any>;
}

export interface UserSettings {
  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
  };
  privacy: {
    analyticsEnabled: boolean;
    crashReportingEnabled: boolean;
  };
}

// Search and filtering
export interface SearchOptions {
  query: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  facets?: Record<string, number>;
}

// Pagination
export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Date and time utilities
export type DateRange = {
  start: Date;
  end: Date;
};

export type TimeUnit = "second" | "minute" | "hour" | "day" | "week" | "month" | "year";

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: number;
    requestId: string;
    version: string;
  };
}

export interface ApiPaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Event and callback types
export type EventCallback<T = any> = (data: T) => void;
export type AsyncEventCallback<T = any> = (data: T) => Promise<void>;

export interface EventListener<T = any> {
  id: string;
  event: string;
  callback: EventCallback<T>;
  once?: boolean;
}

// Configuration types
export interface ServiceConfig {
  apiUrl: string;
  timeout: number;
  retryConfig: RetryConfig;
  rateLimits?: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };
}

export interface DatabaseConfig {
  name: string;
  version: number;
  stores: string[];
}

// Performance monitoring
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface PerformanceData {
  metrics: PerformanceMetric[];
  userAgent: string;
  url: string;
  sessionId: string;
}

// Browser and device info
export interface DeviceInfo {
  userAgent: string;
  platform: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
}

// Accessibility
export interface A11yOptions {
  reducedMotion: boolean;
  highContrast: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
}

// Internationalization
export interface LocalizedText {
  [locale: string]: string;
}

export interface LocalizationConfig {
  defaultLocale: string;
  supportedLocales: string[];
  fallbackLocale: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
}

export default {};