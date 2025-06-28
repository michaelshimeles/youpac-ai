import { api } from "~/convex/_generated/api";
import { Id } from "~/convex/_generated/dataModel";
import { ConvexReactClient } from "convex/react";
import { VideoError, getErrorDetails, handleVideoError } from "~/services/video/utils/error-handler";

export interface TranscriptionOptions {
  videoId: Id<"videos">;
  storageId: Id<"_storage">;
  fileType?: string;
  fileName?: string;
  onProgress?: (status: TranscriptionStatus, progress?: string) => void;
}

export type TranscriptionStatus = "idle" | "processing" | "completed" | "failed";

export interface TranscriptionResult {
  success: boolean;
  transcription: string;
  service?: string;
  error?: string;
}

export interface TranscriptionProgress {
  status: TranscriptionStatus;
  progress?: string;
  error?: string;
}

/**
 * Service for handling all transcription-related operations
 * Manages video-to-text conversion using ElevenLabs and other providers
 */
export class TranscriptionService {
  constructor(private convex: ConvexReactClient) {}

  /**
   * Start transcription process for a video
   */
  async transcribeVideo(options: TranscriptionOptions): Promise<TranscriptionResult> {
    try {
      const { videoId, storageId, fileType, fileName, onProgress } = options;

      // Start the transcription process
      onProgress?.("processing", "Starting transcription...");

      const result = await this.convex.action(api.transcription.transcribeVideo, {
        videoId,
        storageId,
        fileType,
        fileName,
      });

      onProgress?.("completed");
      return result;
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      onProgress?.("failed", errorDetails.message);
      handleVideoError(error, "Transcription");
      throw new VideoError(errorDetails);
    }
  }

  /**
   * Use ElevenLabs specifically for transcription
   */
  async transcribeWithElevenLabs(options: TranscriptionOptions): Promise<TranscriptionResult> {
    try {
      const { videoId, storageId, fileType, fileName, onProgress } = options;

      onProgress?.("processing", "Starting ElevenLabs transcription...");

      const result = await this.convex.action(api.transcription.transcribeVideoElevenLabs, {
        videoId,
        storageId,
        fileType,
        fileName,
      });

      onProgress?.("completed");
      return result;
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      onProgress?.("failed", errorDetails.message);
      handleVideoError(error, "ElevenLabs transcription");
      throw new VideoError(errorDetails);
    }
  }

  /**
   * Update transcription status for a video
   */
  async updateTranscriptionStatus(
    videoId: Id<"videos">,
    status: TranscriptionStatus,
    error?: string,
    progress?: string
  ): Promise<void> {
    try {
      await this.convex.mutation(api.videos.updateTranscriptionStatus, {
        id: videoId,
        status,
        error,
        progress,
      });
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      throw new VideoError(errorDetails);
    }
  }

  /**
   * Update video transcription text
   */
  async updateVideoTranscription(videoId: Id<"videos">, transcription: string): Promise<void> {
    try {
      await this.convex.mutation(api.videos.updateVideoTranscription, {
        videoId,
        transcription,
      });
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      throw new VideoError(errorDetails);
    }
  }

  /**
   * Get video with transcription data
   */
  async getVideoWithTranscription(videoId: Id<"videos">) {
    try {
      return await this.convex.query(api.videos.getWithTranscription, { videoId });
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      throw new VideoError(errorDetails);
    }
  }

  /**
   * Clear transcription for a video
   */
  async clearTranscription(videoId: Id<"videos">): Promise<void> {
    try {
      await this.convex.mutation(api.videos.update, {
        id: videoId,
        clearTranscription: true,
      });
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      throw new VideoError(errorDetails);
    }
  }

  /**
   * Manually set transcription text (for user uploads)
   */
  async setManualTranscription(videoId: Id<"videos">, transcription: string): Promise<void> {
    try {
      await this.convex.mutation(api.videos.updateVideoTranscription, {
        videoId,
        transcription,
      });
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      throw new VideoError(errorDetails);
    }
  }

  /**
   * Validate transcription file before processing
   */
  validateTranscriptionFile(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxSize = 1024 * 1024 * 1024; // 1GB (ElevenLabs limit)
    const supportedTypes = [
      'video/mp4', 'video/mov', 'video/avi', 'video/webm', 'video/quicktime',
      'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/ogg'
    ];

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size (${(file.size / 1024 / 1024 / 1024).toFixed(1)}GB) exceeds maximum of 1GB`);
    }

    // Check file type
    if (!supportedTypes.includes(file.type.toLowerCase())) {
      errors.push(`File type ${file.type} is not supported for transcription`);
    }

    // Minimum size check (avoid empty files)
    if (file.size < 1024) {
      errors.push("File is too small to contain meaningful audio");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Estimate transcription time based on file size and duration
   */
  estimateTranscriptionTime(fileSizeBytes: number, durationSeconds?: number): string {
    // Rough estimates based on ElevenLabs performance
    const sizeMB = fileSizeBytes / (1024 * 1024);
    
    if (durationSeconds) {
      // For known duration, estimate 10-20% of duration for processing
      const estimatedMinutes = Math.ceil(durationSeconds * 0.15 / 60);
      return `~${estimatedMinutes} minute${estimatedMinutes !== 1 ? 's' : ''}`;
    }
    
    // For unknown duration, estimate based on file size
    if (sizeMB < 10) return "~1-2 minutes";
    if (sizeMB < 50) return "~2-5 minutes";
    if (sizeMB < 100) return "~5-10 minutes";
    return "~10-20 minutes";
  }

  /**
   * Create a progress tracker for transcription operations
   */
  createProgressTracker(onProgress?: (status: TranscriptionStatus, progress?: string) => void) {
    let currentStatus: TranscriptionStatus = "idle";
    let currentProgress: string | undefined;

    return {
      updateStatus: (status: TranscriptionStatus, progress?: string) => {
        currentStatus = status;
        currentProgress = progress;
        onProgress?.(status, progress);
      },
      getStatus: () => currentStatus,
      getProgress: () => currentProgress,
      isProcessing: () => currentStatus === "processing",
      isCompleted: () => currentStatus === "completed",
      isFailed: () => currentStatus === "failed",
    };
  }

  /**
   * Format transcription text for better readability
   */
  formatTranscription(text: string): string {
    if (!text) return "";

    return text
      // Clean up common transcription artifacts
      .replace(/\s+/g, " ") // Multiple spaces to single space
      .replace(/([.!?])\s*([a-z])/g, "$1 $2") // Ensure space after punctuation
      .trim();
  }

  /**
   * Split transcription into segments for easier processing
   */
  segmentTranscription(text: string, maxSegmentLength: number = 1000): string[] {
    if (!text || text.length <= maxSegmentLength) {
      return [text];
    }

    const segments: string[] = [];
    const sentences = text.split(/[.!?]+/);
    let currentSegment = "";

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      // If adding this sentence would exceed the limit, start a new segment
      if (currentSegment.length + trimmedSentence.length > maxSegmentLength && currentSegment) {
        segments.push(currentSegment.trim());
        currentSegment = trimmedSentence;
      } else {
        currentSegment += (currentSegment ? ". " : "") + trimmedSentence;
      }
    }

    // Add the last segment
    if (currentSegment.trim()) {
      segments.push(currentSegment.trim());
    }

    return segments.length > 0 ? segments : [text];
  }
}