import { api } from "~/convex/_generated/api";
import { Id } from "~/convex/_generated/dataModel";
import { ConvexReactClient } from "convex/react";

export type AgentType = "title" | "description" | "thumbnail" | "tweets";

export interface ContentGenerationOptions {
  agentType: AgentType;
  videoId?: Id<"videos">;
  videoData: {
    title?: string;
    transcription?: string;
    manualTranscriptions?: Array<{
      fileName: string;
      text: string;
      format: string;
    }>;
    duration?: number;
    resolution?: { width: number; height: number };
    format?: string;
  };
  connectedAgentOutputs?: Array<{
    type: string;
    content: string;
  }>;
  moodBoardReferences?: Array<{
    url: string;
    type: string;
    title?: string;
  }>;
  profileData?: {
    channelName: string;
    contentType: string;
    niche: string;
    tone?: string;
    targetAudience?: string;
  };
}

export interface ThumbnailGenerationOptions extends ContentGenerationOptions {
  agentType: "thumbnail";
  videoFrames: Array<{
    dataUrl: string;
    timestamp: number;
  }>;
  additionalContext?: string;
}

export interface ContentRefinementOptions {
  agentId: Id<"agents">;
  userMessage: string;
  currentDraft: string;
  videoData?: {
    title?: string;
    transcription?: string;
    manualTranscriptions?: Array<{
      fileName: string;
      text: string;
      format: string;
    }>;
  };
  connectedAgentOutputs?: Array<{
    type: string;
    content: string;
  }>;
  profileData?: {
    channelName: string;
    contentType: string;
    niche: string;
    tone?: string;
    targetAudience?: string;
  };
}

export interface GenerationResult {
  content: string;
  prompt: string;
}

export interface ThumbnailResult {
  concept: string;
  imageUrl: string;
  prompt?: string;
  storageId?: string;
}

/**
 * Service for handling all AI-powered content generation
 * Manages titles, descriptions, thumbnails, and social media content
 */
export class AIService {
  constructor(private convex: ConvexReactClient) {}

  /**
   * Generate content using the simplified AI system (recommended for new content)
   */
  async generateContent(options: ContentGenerationOptions): Promise<GenerationResult> {
    try {
      const result = await this.convex.action(api.aiHackathon.generateContentSimple, {
        agentType: options.agentType,
        videoId: options.videoId,
        videoData: options.videoData,
        connectedAgentOutputs: options.connectedAgentOutputs || [],
        moodBoardReferences: options.moodBoardReferences,
        profileData: options.profileData,
      });

      return result;
    } catch (error) {
      console.error(`AI generation error for ${options.agentType}:`, error);
      throw new Error(`Failed to generate ${options.agentType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate content for an existing agent (with database tracking)
   */
  async generateContentForAgent(
    agentId: Id<"agents">,
    videoData: ContentGenerationOptions["videoData"],
    connectedAgentOutputs: Array<{ type: string; content: string }> = [],
    profileData?: ContentGenerationOptions["profileData"]
  ): Promise<string> {
    try {
      const content = await this.convex.action(api.ai.generateContent, {
        agentId,
        videoData,
        connectedAgentOutputs,
        profileData,
      });

      return content;
    } catch (error) {
      console.error("AI agent generation error:", error);
      throw new Error(`Failed to generate content for agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refine existing content based on user feedback
   */
  async refineContent(options: ContentRefinementOptions): Promise<string> {
    try {
      const refinedContent = await this.convex.action(api.ai.refineContent, {
        agentId: options.agentId,
        userMessage: options.userMessage,
        currentDraft: options.currentDraft,
        videoData: options.videoData,
        connectedAgentOutputs: options.connectedAgentOutputs,
        profileData: options.profileData,
      });

      return refinedContent;
    } catch (error) {
      console.error("AI refinement error:", error);
      throw new Error(`Failed to refine content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate thumbnail using AI image generation
   */
  async generateThumbnail(options: ThumbnailGenerationOptions): Promise<ThumbnailResult> {
    try {
      const result = await this.convex.action(api.thumbnail.generateThumbnail, {
        agentType: options.agentType,
        videoId: options.videoId,
        videoFrames: options.videoFrames,
        videoData: options.videoData,
        connectedAgentOutputs: options.connectedAgentOutputs || [],
        profileData: options.profileData,
        additionalContext: options.additionalContext,
        moodBoardReferences: options.moodBoardReferences,
      });

      return result;
    } catch (error) {
      console.error("AI thumbnail generation error:", error);
      throw new Error(`Failed to generate thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate multiple content types in parallel for efficiency
   */
  async generateMultipleContent(
    requests: Array<ContentGenerationOptions>
  ): Promise<Array<{ type: AgentType; result: GenerationResult; error?: string }>> {
    const results = await Promise.allSettled(
      requests.map(async (request) => ({
        type: request.agentType,
        result: await this.generateContent(request),
      }))
    );

    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        return {
          type: requests[index].agentType,
          result: { content: "", prompt: "" },
          error: result.reason?.message || "Generation failed",
        };
      }
    });
  }

  /**
   * Get optimized generation parameters for different content types
   */
  getOptimizedParams(agentType: AgentType) {
    const params = {
      title: {
        temperature: 0.8,
        maxTokens: 100,
        systemHint: "Focus on click-through optimization and accuracy",
      },
      description: {
        temperature: 0.7,
        maxTokens: 150,
        systemHint: "Prioritize viewer benefits and concise value",
      },
      thumbnail: {
        temperature: 0.9,
        maxTokens: 400,
        systemHint: "Maximize visual creativity and contrast",
      },
      tweets: {
        temperature: 0.8,
        maxTokens: 200,
        systemHint: "Keep it simple and conversational",
      },
    };

    return params[agentType];
  }

  /**
   * Validate content generation inputs
   */
  validateGenerationInputs(options: ContentGenerationOptions): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if we have sufficient content to work with
    if (!options.videoData.title && !options.videoData.transcription && 
        (!options.videoData.manualTranscriptions || options.videoData.manualTranscriptions.length === 0)) {
      errors.push("At least a title, transcription, or manual transcription is required for content generation");
    }

    // Validate agent type
    const validTypes: AgentType[] = ["title", "description", "thumbnail", "tweets"];
    if (!validTypes.includes(options.agentType)) {
      errors.push(`Invalid agent type: ${options.agentType}`);
    }

    // Validate thumbnail-specific requirements
    if (options.agentType === "thumbnail") {
      const thumbnailOptions = options as ThumbnailGenerationOptions;
      if (!thumbnailOptions.videoFrames || thumbnailOptions.videoFrames.length === 0) {
        errors.push("Video frames are required for thumbnail generation");
      }
    }

    // Validate profile data structure if provided
    if (options.profileData) {
      if (!options.profileData.channelName || !options.profileData.contentType || !options.profileData.niche) {
        errors.push("Incomplete profile data: channelName, contentType, and niche are required");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract key insights from video content for better generation
   */
  analyzeVideoContent(videoData: ContentGenerationOptions["videoData"]) {
    const analysis = {
      hasTranscription: !!videoData.transcription,
      hasManualTranscription: !!(videoData.manualTranscriptions && videoData.manualTranscriptions.length > 0),
      estimatedLength: "unknown" as "short" | "medium" | "long" | "unknown",
      contentComplexity: "unknown" as "simple" | "moderate" | "complex" | "unknown",
      keyTopics: [] as string[],
    };

    // Analyze transcription if available
    if (videoData.transcription) {
      const wordCount = videoData.transcription.split(/\s+/).length;
      const duration = videoData.duration || (wordCount / 150) * 60; // Estimate from speaking rate

      // Categorize length
      if (duration < 180) analysis.estimatedLength = "short"; // < 3 minutes
      else if (duration < 600) analysis.estimatedLength = "medium"; // 3-10 minutes
      else analysis.estimatedLength = "long"; // > 10 minutes

      // Estimate complexity
      if (wordCount < 500) analysis.contentComplexity = "simple";
      else if (wordCount < 1500) analysis.contentComplexity = "moderate";
      else analysis.contentComplexity = "complex";

      // Extract potential key topics (simple keyword extraction)
      const text = videoData.transcription.toLowerCase();
      const commonTopics = [
        "tutorial", "review", "tips", "guide", "how to", "workflow", "productivity",
        "coding", "design", "business", "marketing", "education", "entertainment"
      ];
      
      analysis.keyTopics = commonTopics.filter(topic => 
        text.includes(topic) || text.includes(topic.replace(/\s/g, ""))
      );
    }

    return analysis;
  }

  /**
   * Create a progress tracker for AI generation operations
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

  /**
   * Format generated content for display
   */
  formatContentForDisplay(content: string, type: AgentType): string {
    if (!content) return "";

    switch (type) {
      case "title":
        // Clean up title formatting
        return content
          .replace(/^["']|["']$/g, "") // Remove quotes
          .replace(/^Title:\s*/i, "") // Remove "Title:" prefix
          .trim();

      case "description":
        // Clean up description formatting
        return content
          .replace(/^Description:\s*/i, "") // Remove "Description:" prefix
          .trim();

      case "tweets":
        // Clean up tweet formatting
        return content
          .replace(/^Tweets?:\s*/i, "") // Remove "Tweet:" prefix
          .replace(/^Thread:\s*/i, "") // Remove "Thread:" prefix
          .trim();

      case "thumbnail":
        // Thumbnail concept is usually fine as-is
        return content.trim();

      default:
        return content.trim();
    }
  }

  /**
   * Get content generation tips for users
   */
  getGenerationTips(agentType: AgentType): string[] {
    const tips = {
      title: [
        "Keep it under 60 characters for full visibility",
        "Use specific numbers and results when available",
        "Create curiosity without giving everything away",
        "Match your channel's typical style and tone",
      ],
      description: [
        "Focus on viewer benefits, not just features",
        "Use clear, scannable formatting",
        "Include relevant keywords naturally",
        "End with a clear call-to-action",
      ],
      thumbnail: [
        "Use high contrast and vibrant colors",
        "Keep text overlay to 3-5 words maximum",
        "Ensure it's readable at small sizes",
        "Include emotional facial expressions when relevant",
      ],
      tweets: [
        "Keep it conversational and natural",
        "Create curiosity to drive clicks",
        "Use simple language your audience understands",
        "Focus on the main benefit or insight",
      ],
    };

    return tips[agentType];
  }
}