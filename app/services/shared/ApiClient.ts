import { ConvexReactClient } from "convex/react";
import { ErrorHandler, ServiceError } from "~/services/common/ErrorHandler";
import type { ConvexActionOptions, ConvexMutationOptions, ConvexQueryOptions } from "~/types/api";

/**
 * Enhanced API client for Convex operations with error handling and retries
 */
export class ApiClient {
  private convex: ConvexReactClient;
  private defaultTimeout = 30000; // 30 seconds
  private maxRetries = 3;

  constructor(convex: ConvexReactClient) {
    this.convex = convex;
  }

  /**
   * Execute a Convex query with enhanced error handling
   */
  async query<T>(
    queryFunction: any,
    args: any = {},
    options: ConvexQueryOptions = {}
  ): Promise<T> {
    try {
      const result = await this.convex.query(queryFunction, args);
      return result;
    } catch (error) {
      const serviceError = ErrorHandler.handle(error, "Query operation");
      throw serviceError;
    }
  }

  /**
   * Execute a Convex mutation with retry logic
   */
  async mutation<T>(
    mutationFunction: any,
    args: any = {},
    options: ConvexMutationOptions = {}
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.convex.mutation(mutationFunction, args);
        
        if (options.onSuccess) {
          options.onSuccess(result);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (options.onError) {
          options.onError(error as Error);
        }

        // Don't retry certain types of errors
        if (this.shouldNotRetry(error)) {
          break;
        }

        if (attempt < this.maxRetries) {
          await this.delay(this.getRetryDelay(attempt));
        }
      }
    }

    if (options.onSettled) {
      options.onSettled();
    }

    const serviceError = ErrorHandler.handle(lastError, "Mutation operation");
    throw serviceError;
  }

  /**
   * Execute a Convex action with progress tracking and cancellation
   */
  async action<T>(
    actionFunction: any,
    args: any = {},
    options: ConvexActionOptions = {}
  ): Promise<T> {
    const { onProgress, signal, timeout = this.defaultTimeout } = options;

    try {
      // Set up timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new ServiceError("Request timeout", "network", {
            details: `Operation timed out after ${timeout}ms`,
          }));
        }, timeout);

        // Clear timeout if signal is aborted
        signal?.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new ServiceError("Request cancelled", "network", {
            details: "Operation was cancelled by user",
          }));
        });
      });

      // Set up action promise
      const actionPromise = this.convex.action(actionFunction, args);

      // Race between action and timeout/cancellation
      const result = await Promise.race([actionPromise, timeoutPromise]);
      
      return result as T;
    } catch (error) {
      const serviceError = ErrorHandler.handle(error, "Action operation");
      throw serviceError;
    }
  }

  /**
   * Execute multiple operations in parallel with error aggregation
   */
  async parallel<T>(
    operations: Array<() => Promise<T>>,
    options: {
      maxConcurrency?: number;
      failFast?: boolean;
      onProgress?: (completed: number, total: number) => void;
    } = {}
  ): Promise<Array<{ success: boolean; data?: T; error?: string }>> {
    const { maxConcurrency = 5, failFast = false, onProgress } = options;
    const results: Array<{ success: boolean; data?: T; error?: string }> = [];
    
    for (let i = 0; i < operations.length; i += maxConcurrency) {
      const batch = operations.slice(i, i + maxConcurrency);
      
      const batchResults = await Promise.allSettled(
        batch.map(operation => operation())
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push({ success: true, data: result.value });
        } else {
          const error = result.reason?.message || "Unknown error";
          results.push({ success: false, error });

          if (failFast) {
            throw new ServiceError("Parallel operation failed", "unknown", {
              details: error,
            });
          }
        }
      }

      onProgress?.(results.length, operations.length);
    }

    return results;
  }

  /**
   * Create a request wrapper with automatic retries and error handling
   */
  createRequest<T>(
    operation: () => Promise<T>,
    context: string = "API request"
  ) {
    return async (): Promise<T> => {
      let lastError: any;
      
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error;

          if (this.shouldNotRetry(error) || attempt === this.maxRetries) {
            break;
          }

          await this.delay(this.getRetryDelay(attempt));
        }
      }

      const serviceError = ErrorHandler.handle(lastError, context);
      throw serviceError;
    };
  }

  /**
   * Check if an error should not be retried
   */
  private shouldNotRetry(error: any): boolean {
    // Don't retry authentication errors
    if (error?.message?.includes("Unauthorized") || error?.status === 401) {
      return true;
    }

    // Don't retry validation errors
    if (error?.status === 400) {
      return true;
    }

    // Don't retry "not found" errors
    if (error?.status === 404) {
      return true;
    }

    // Don't retry if explicitly marked as non-retryable
    if (error?.retryable === false) {
      return true;
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay
   */
  private getRetryDelay(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 10000; // 10 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return delay + jitter;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create an abort controller for cancellable requests
   */
  createAbortController(): AbortController {
    return new AbortController();
  }

  /**
   * Batch multiple queries for efficiency
   */
  async batchQueries<T>(
    queries: Array<{ function: any; args: any; key: string }>,
    options: { maxBatchSize?: number } = {}
  ): Promise<Record<string, T>> {
    const { maxBatchSize = 10 } = options;
    const results: Record<string, T> = {};

    for (let i = 0; i < queries.length; i += maxBatchSize) {
      const batch = queries.slice(i, i + maxBatchSize);
      
      const batchPromises = batch.map(async ({ function: queryFn, args, key }) => {
        try {
          const result = await this.query<T>(queryFn, args);
          return { key, result, success: true };
        } catch (error) {
          console.error(`Batch query failed for key ${key}:`, error);
          return { key, result: null, success: false };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      for (const { key, result, success } of batchResults) {
        if (success && result !== null) {
          results[key] = result;
        }
      }
    }

    return results;
  }

  /**
   * Create a cached query function
   */
  createCachedQuery<T>(
    queryFunction: any,
    cacheKey: string,
    ttl: number = 5 * 60 * 1000 // 5 minutes default
  ) {
    const cache = new Map<string, { data: T; timestamp: number }>();

    return async (args: any = {}): Promise<T> => {
      const key = `${cacheKey}:${JSON.stringify(args)}`;
      const cached = cache.get(key);
      
      if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.data;
      }

      const result = await this.query<T>(queryFunction, args);
      cache.set(key, { data: result, timestamp: Date.now() });

      // Clean up old cache entries
      for (const [cacheKey, entry] of cache.entries()) {
        if (Date.now() - entry.timestamp > ttl) {
          cache.delete(cacheKey);
        }
      }

      return result;
    };
  }

  /**
   * Health check for the API connection
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latency: number;
    timestamp: number;
  }> {
    const start = Date.now();
    
    try {
      // Use a simple query to test connectivity
      await this.convex.query(undefined as any, {}); // This would be a real health check query
      
      return {
        healthy: true,
        latency: Date.now() - start,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - start,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageLatency: number;
  } {
    // This would be implemented with actual tracking
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
    };
  }
}

/**
 * Factory function to create API client instance
 */
export function createApiClient(convex: ConvexReactClient): ApiClient {
  return new ApiClient(convex);
}

export default ApiClient;