import { api } from "~/convex/_generated/api";
import { Id } from "~/convex/_generated/dataModel";
import { ConvexReactClient } from "convex/react";
import { VideoMetadata, extractVideoMetadata, extractBasicVideoMetadata } from "~/features/video/services/utils/metadata";
import { VideoError, getErrorDetails, handleVideoError } from "~/features/video/services/utils/error-handler";

export interface VideoCreateOptions {
  projectId: Id<"projects">;
  title?: string;
  videoUrl?: string;
  file?: File;
  canvasPosition: { x: number; y: number };
  storageId?: Id<"_storage">;
}

export interface VideoUpdateOptions {
  id: Id<"videos">;
  title?: string;
  transcription?: string;
  canvasPosition?: { x: number; y: number };
  clearTranscription?: boolean;
}

export interface VideoProcessingOptions {
  onProgress?: (progress: number) => void;
  extractThumbnails?: boolean;
  useFFmpeg?: boolean;
}

export interface VideoUploadResult {
  videoId: Id<"videos">;
  storageId?: Id<"_storage">;
  metadata?: VideoMetadata;
}

/**
 * Service for handling all video-related operations
 * Consolidates video creation, updates, metadata extraction, and file handling
 */
export class VideoService {
  constructor(private convex: ConvexReactClient) {}

  /**
   * Create a new video record in the database
   */
  async createVideo(options: VideoCreateOptions): Promise<Id<"videos">> {
    try {
      const videoId = await this.convex.mutation(api.videos.create, {
        projectId: options.projectId,
        title: options.title,
        videoUrl: options.videoUrl,
        storageId: options.storageId,
        canvasPosition: options.canvasPosition,
      });

      return videoId;
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      throw new VideoError(errorDetails);
    }
  }

  /**
   * Update an existing video record
   */
  async updateVideo(options: VideoUpdateOptions): Promise<void> {
    try {
      await this.convex.mutation(api.videos.update, options);
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      throw new VideoError(errorDetails);
    }
  }

  /**
   * Update video metadata after processing
   */
  async updateVideoMetadata(videoId: Id<"videos">, metadata: Partial<VideoMetadata>): Promise<void> {
    try {
      await this.convex.mutation(api.videos.updateMetadata, {
        id: videoId,
        ...metadata,
      });
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      throw new VideoError(errorDetails);
    }
  }

  /**
   * Get a single video by ID
   */
  async getVideo(videoId: Id<"videos">) {
    try {
      return await this.convex.query(api.videos.get, { id: videoId });
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      throw new VideoError(errorDetails);
    }
  }

  /**
   * Get all videos for a project
   */
  async getProjectVideos(projectId: Id<"projects">) {
    try {
      return await this.convex.query(api.videos.listByProject, { projectId });
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      throw new VideoError(errorDetails);
    }
  }

  /**
   * Upload a video file to Convex storage and create database record
   */
  async uploadVideo(
    file: File,
    options: VideoCreateOptions & VideoProcessingOptions
  ): Promise<VideoUploadResult> {
    try {
      const { onProgress, extractThumbnails = true, useFFmpeg = true, ...createOptions } = options;

      // Step 1: Extract basic metadata immediately for quick feedback
      onProgress?.(0.1);
      const basicMetadata = await extractBasicVideoMetadata(file);
      
      // Step 2: Generate upload URL and upload file
      onProgress?.(0.2);
      const uploadUrl = await this.convex.mutation(api.files.generateUploadUrl);
      
      onProgress?.(0.3);
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResult.ok) {
        throw new Error(`Upload failed: ${uploadResult.statusText}`);
      }

      const { storageId } = await uploadResult.json();
      onProgress?.(0.5);

      // Step 3: Create video record with storage ID
      const videoId = await this.createVideo({
        ...createOptions,
        storageId,
        title: createOptions.title || file.name,
      });

      onProgress?.(0.6);

      // Step 4: Extract full metadata in background
      let fullMetadata: VideoMetadata | undefined;
      try {
        fullMetadata = await extractVideoMetadata(file, {
          onProgress: (metaProgress) => onProgress?.(0.6 + metaProgress * 0.4),
          extractThumbnails,
          useFFmpeg,
        });

        // Update video with extracted metadata
        await this.updateVideoMetadata(videoId, fullMetadata);
      } catch (metadataError) {
        console.warn("Failed to extract full metadata, using basic metadata:", metadataError);
        // Update with basic metadata as fallback
        if (basicMetadata.duration || basicMetadata.resolution) {
          await this.updateVideoMetadata(videoId, basicMetadata);
        }
      }

      onProgress?.(1.0);

      return {
        videoId,
        storageId,
        metadata: fullMetadata,
      };
    } catch (error) {
      handleVideoError(error, "Video upload");
      throw error;
    }
  }

  /**
   * Update video storage ID and URL
   */
  async updateVideoStorage(videoId: Id<"videos">, storageId: Id<"_storage">): Promise<void> {
    try {
      await this.convex.mutation(api.videos.updateStorageId, {
        id: videoId,
        storageId,
      });
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      throw new VideoError(errorDetails);
    }
  }

  /**
   * Delete a video and all associated data
   */
  async deleteVideo(videoId: Id<"videos">): Promise<void> {
    try {
      await this.convex.mutation(api.videos.remove, { id: videoId });
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      throw new VideoError(errorDetails);
    }
  }

  /**
   * Extract video metadata from a file
   * Useful for validation before upload
   */
  async extractMetadata(
    file: File,
    options: VideoProcessingOptions = {}
  ): Promise<VideoMetadata> {
    try {
      return await extractVideoMetadata(file, options);
    } catch (error) {
      handleVideoError(error, "Metadata extraction");
      throw error;
    }
  }

  /**
   * Validate video file before processing
   */
  validateVideoFile(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxSize = 100 * 1024 * 1024; // 100MB
    const supportedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/webm', 'video/quicktime'];

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum of 100MB`);
    }

    // Check file type
    if (!supportedTypes.includes(file.type.toLowerCase())) {
      errors.push(`File type ${file.type} is not supported. Use MP4, MOV, AVI, or WebM`);
    }

    // Check file name
    if (!file.name || file.name.length < 1) {
      errors.push("File must have a valid name");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get upload progress for better UX
   */
  createProgressTracker(onProgress?: (progress: number) => void) {
    let currentProgress = 0;
    
    return {
      setProgress: (progress: number) => {
        currentProgress = Math.max(currentProgress, progress);
        onProgress?.(currentProgress);
      },
      getProgress: () => currentProgress,
      increment: (amount: number) => {
        currentProgress = Math.min(1, currentProgress + amount);
        onProgress?.(currentProgress);
      },
    };
  }
}