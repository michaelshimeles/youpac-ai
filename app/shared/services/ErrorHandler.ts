import { toast } from "sonner";

export interface ServiceError {
  code: string;
  message: string;
  details?: string;
  recoverable: boolean;
  context?: string;
  originalError?: any;
  action?: {
    label: string;
    handler: () => void;
  };
}

export type ErrorCategory = 
  | 'network'
  | 'authentication'
  | 'validation' 
  | 'upload'
  | 'transcription'
  | 'ai_generation'
  | 'storage'
  | 'rate_limit'
  | 'server'
  | 'unknown';

export class ServiceError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly recoverable: boolean;
  public readonly context?: string;
  public readonly details?: string;
  public readonly originalError?: any;
  public readonly action?: {
    label: string;
    handler: () => void;
  };

  constructor(
    message: string,
    category: ErrorCategory,
    options: {
      code?: string;
      recoverable?: boolean;
      context?: string;
      details?: string;
      originalError?: any;
      action?: { label: string; handler: () => void };
    } = {}
  ) {
    super(message);
    this.name = 'ServiceError';
    this.code = options.code || `${category.toUpperCase()}_ERROR`;
    this.category = category;
    this.recoverable = options.recoverable ?? true;
    this.context = options.context;
    this.details = options.details;
    this.originalError = options.originalError;
    this.action = options.action;
  }
}

/**
 * Centralized error handling service for all application errors
 * Provides consistent error processing, user notifications, and recovery options
 */
export class ErrorHandler {
  private static errorCounts = new Map<string, number>();
  private static lastErrorTime = new Map<string, number>();

  /**
   * Handle any error and convert to ServiceError
   */
  static handle(error: any, context?: string): ServiceError {
    // If already a ServiceError, just update context
    if (error instanceof ServiceError) {
      return new ServiceError(error.message, error.category, {
        code: error.code,
        recoverable: error.recoverable,
        context: context || error.context,
        details: error.details,
        originalError: error.originalError,
        action: error.action,
      });
    }

    // Convert various error types to ServiceError
    return this.categorizeError(error, context);
  }

  /**
   * Categorize and convert unknown errors to ServiceError
   */
  private static categorizeError(error: any, context?: string): ServiceError {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    
    // Network errors
    if (this.isNetworkError(error)) {
      return new ServiceError('Network connection failed', 'network', {
        code: 'NETWORK_ERROR',
        recoverable: true,
        context,
        details: 'Please check your internet connection and try again.',
        originalError: error,
      });
    }

    // Authentication errors
    if (this.isAuthError(error)) {
      return new ServiceError('Authentication required', 'authentication', {
        code: 'AUTH_ERROR',
        recoverable: false,
        context,
        details: 'Please sign in to continue.',
        originalError: error,
      });
    }

    // Validation errors
    if (this.isValidationError(error)) {
      return new ServiceError('Invalid input provided', 'validation', {
        code: 'VALIDATION_ERROR',
        recoverable: true,
        context,
        details: errorMessage,
        originalError: error,
      });
    }

    // Upload errors
    if (this.isUploadError(error)) {
      return new ServiceError('File upload failed', 'upload', {
        code: 'UPLOAD_ERROR',
        recoverable: true,
        context,
        details: this.getUploadErrorDetails(error),
        originalError: error,
      });
    }

    // Transcription errors
    if (this.isTranscriptionError(error)) {
      return new ServiceError('Transcription failed', 'transcription', {
        code: 'TRANSCRIPTION_ERROR',
        recoverable: true,
        context,
        details: this.getTranscriptionErrorDetails(error),
        originalError: error,
      });
    }

    // AI generation errors
    if (this.isAIError(error)) {
      return new ServiceError('AI generation failed', 'ai_generation', {
        code: 'AI_ERROR',
        recoverable: true,
        context,
        details: this.getAIErrorDetails(error),
        originalError: error,
      });
    }

    // Rate limit errors
    if (this.isRateLimitError(error)) {
      return new ServiceError('Rate limit exceeded', 'rate_limit', {
        code: 'RATE_LIMIT_ERROR',
        recoverable: true,
        context,
        details: 'Please wait a moment before trying again.',
        originalError: error,
      });
    }

    // Server errors
    if (this.isServerError(error)) {
      return new ServiceError('Server error occurred', 'server', {
        code: 'SERVER_ERROR',
        recoverable: true,
        context,
        details: 'Our servers are experiencing issues. Please try again later.',
        originalError: error,
      });
    }

    // Unknown errors
    return new ServiceError(errorMessage, 'unknown', {
      code: 'UNKNOWN_ERROR',
      recoverable: true,
      context,
      details: 'An unexpected error occurred. Please try again.',
      originalError: error,
    });
  }

  /**
   * Show user-friendly error notification
   */
  static notify(error: ServiceError, options: { 
    showToast?: boolean; 
    duration?: number;
    onRetry?: () => void;
  } = {}): void {
    const { showToast = true, duration, onRetry } = options;

    // Track error frequency
    this.trackError(error);

    // Log error for debugging
    this.logError(error);

    // Show user notification
    if (showToast) {
      this.showErrorToast(error, duration, onRetry);
    }
  }

  /**
   * Check if error is recoverable and suggest retry
   */
  static isRecoverable(error: ServiceError): boolean {
    return error.recoverable;
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: ServiceError): string {
    return error.details || error.message;
  }

  /**
   * Create retry action for recoverable errors
   */
  static createRetryAction(retryFn: () => void, label: string = 'Retry'): { label: string; handler: () => void } {
    return {
      label,
      handler: retryFn,
    };
  }

  // Error type detection methods
  private static isNetworkError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    return message.includes('fetch') || 
           message.includes('network') || 
           message.includes('connection') ||
           error?.code === 'NETWORK_ERROR';
  }

  private static isAuthError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    return message.includes('unauthorized') || 
           message.includes('authentication') ||
           message.includes('auth') ||
           error?.status === 401;
  }

  private static isValidationError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    return message.includes('validation') || 
           message.includes('invalid') ||
           message.includes('required') ||
           error?.status === 400;
  }

  private static isUploadError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    return message.includes('upload') || 
           message.includes('file') ||
           message.includes('storage') ||
           message.includes('too large');
  }

  private static isTranscriptionError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    return message.includes('transcrib') || 
           message.includes('whisper') ||
           message.includes('elevenlabs') ||
           message.includes('speech');
  }

  private static isAIError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    return message.includes('openai') || 
           message.includes('gpt') ||
           message.includes('generation') ||
           message.includes('model');
  }

  private static isRateLimitError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    return message.includes('rate limit') || 
           message.includes('too many requests') ||
           error?.status === 429;
  }

  private static isServerError(error: any): boolean {
    return error?.status >= 500 || 
           error?.message?.includes('Internal Server Error');
  }

  // Error detail extraction methods
  private static getUploadErrorDetails(error: any): string {
    const message = error?.message || '';
    
    if (message.includes('too large')) {
      const sizeMatch = message.match(/(\d+\.?\d*)MB/);
      const size = sizeMatch ? sizeMatch[1] : 'unknown';
      return `File size (${size}MB) exceeds the maximum limit. Try a smaller file or compress it.`;
    }
    
    if (message.includes('format') || message.includes('type')) {
      return 'File format not supported. Please use MP4, MOV, AVI, or WebM format.';
    }
    
    return 'Upload failed. Please check your file and try again.';
  }

  private static getTranscriptionErrorDetails(error: any): string {
    const message = error?.message || '';
    
    if (message.includes('timeout')) {
      return 'Transcription took too long. Try with a shorter video or audio file.';
    }
    
    if (message.includes('no speech') || message.includes('silent')) {
      return 'No speech detected in the file. Please ensure your audio contains clear speech.';
    }
    
    if (message.includes('language')) {
      return 'Language detection failed. The audio might be in an unsupported language.';
    }
    
    return 'Transcription failed. Please ensure your audio is clear and try again.';
  }

  private static getAIErrorDetails(error: any): string {
    const message = error?.message || '';
    
    if (message.includes('safety') || message.includes('content policy')) {
      return 'Content blocked by AI safety system. Please try different content or prompts.';
    }
    
    if (message.includes('quota') || message.includes('limit')) {
      return 'AI service limit reached. Please try again later.';
    }
    
    if (message.includes('model')) {
      return 'AI model temporarily unavailable. Please try again in a few moments.';
    }
    
    return 'AI generation failed. Please try again with different content.';
  }

  // Utility methods
  private static trackError(error: ServiceError): void {
    const key = `${error.category}:${error.code}`;
    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);
    this.lastErrorTime.set(key, Date.now());
  }

  private static logError(error: ServiceError): void {
    const errorInfo = {
      message: error.message,
      category: error.category,
      code: error.code,
      context: error.context,
      recoverable: error.recoverable,
      timestamp: new Date().toISOString(),
      originalError: error.originalError?.message,
    };

    console.group(`🚨 ServiceError: ${error.category.toUpperCase()}`);
    console.error(errorInfo);
    if (error.originalError) {
      console.error('Original error:', error.originalError);
    }
    console.groupEnd();
  }

  private static showErrorToast(error: ServiceError, duration?: number, onRetry?: () => void): void {
    const toastDuration = duration || (error.recoverable ? 6000 : 8000);
    
    if (error.recoverable && onRetry) {
      toast.error(error.message, {
        description: error.details,
        duration: toastDuration,
        action: {
          label: 'Retry',
          onClick: onRetry,
        },
      });
    } else {
      toast.error(error.message, {
        description: error.details,
        duration: toastDuration,
      });
    }
  }

  /**
   * Get error statistics for monitoring
   */
  static getErrorStats(): { category: ErrorCategory; count: number; lastOccurred: Date }[] {
    const stats: { category: ErrorCategory; count: number; lastOccurred: Date }[] = [];
    
    this.errorCounts.forEach((count, key) => {
      const [category] = key.split(':') as [ErrorCategory];
      const lastTime = this.lastErrorTime.get(key);
      
      stats.push({
        category,
        count,
        lastOccurred: new Date(lastTime || 0),
      });
    });
    
    return stats.sort((a, b) => b.count - a.count);
  }

  /**
   * Reset error tracking
   */
  static resetStats(): void {
    this.errorCounts.clear();
    this.lastErrorTime.clear();
  }
}