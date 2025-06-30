import { ConvexReactClient } from "convex/react";
import { VideoService } from "~/features/video/services/VideoService";
import { TranscriptionService } from "~/features/video/services/TranscriptionService";
import { AIService } from "~/features/ai/services/AIService";
import { ContentGenerators } from "~/features/ai/services/ContentGenerators";

/**
 * Service provider for managing all service instances
 * Provides centralized access to all services with proper dependency injection
 */
export class ServiceProvider {
  private static instance: ServiceProvider;
  
  // Service instances
  public readonly video: VideoService;
  public readonly transcription: TranscriptionService;
  public readonly ai: AIService;
  public readonly contentGenerators: ContentGenerators;

  constructor(private convex: ConvexReactClient) {
    // Initialize all services with dependencies
    this.video = new VideoService(convex);
    this.transcription = new TranscriptionService(convex);
    this.ai = new AIService(convex);
    this.contentGenerators = new ContentGenerators(this.ai);
  }

  /**
   * Initialize the service provider (call once in your app root)
   */
  static initialize(convex: ConvexReactClient): ServiceProvider {
    if (!ServiceProvider.instance) {
      ServiceProvider.instance = new ServiceProvider(convex);
    }
    return ServiceProvider.instance;
  }

  /**
   * Get the current service provider instance
   */
  static getInstance(): ServiceProvider {
    if (!ServiceProvider.instance) {
      throw new Error('ServiceProvider not initialized. Call ServiceProvider.initialize() first.');
    }
    return ServiceProvider.instance;
  }

  /**
   * Check if services are properly initialized
   */
  static isInitialized(): boolean {
    return !!ServiceProvider.instance;
  }

  /**
   * Reset the service provider (useful for testing)
   */
  static reset(): void {
    ServiceProvider.instance = undefined as any;
  }
}

/**
 * Hook to get services in React components
 */
export function useServices(): ServiceProvider {
  return ServiceProvider.getInstance();
}

/**
 * Hook to get a specific service
 */
export function useVideoService(): VideoService {
  return ServiceProvider.getInstance().video;
}

export function useTranscriptionService(): TranscriptionService {
  return ServiceProvider.getInstance().transcription;
}

export function useAIService(): AIService {
  return ServiceProvider.getInstance().ai;
}

export function useContentGenerators(): ContentGenerators {
  return ServiceProvider.getInstance().contentGenerators;
}