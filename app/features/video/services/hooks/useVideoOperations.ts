import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useVideoService } from "~/shared/services/ServiceProvider";
import { useCanvasStore } from "~/features/canvas/services/store/useCanvasStore";
import type { VideoUploadOptions } from "~/shared/types/video";
import { useState, useCallback } from "react";

/**
 * Hook for video upload operations with progress tracking
 */
export function useVideoUpload() {
  const videoService = useVideoService();
  const { addNode } = useCanvasStore();
  const [uploadProgress, setUploadProgress] = useState<{
    progress: number;
    stage: string;
    error?: string;
  } | null>(null);

  const uploadVideo = useCallback(async (
    file: File, 
    options: Omit<VideoUploadOptions, 'file'>
  ) => {
    setUploadProgress({ progress: 0, stage: "Starting upload..." });
    
    try {
      const result = await videoService.uploadVideo(file, {
        ...options,
        onProgress: (progress) => {
          setUploadProgress({
            progress: progress * 100,
            stage: progress < 0.5 ? "Uploading file..." : "Processing video...",
          });
        },
      });

      // Add to canvas
      const nodeId = `video-${result.videoId}`;
      addNode({
        id: nodeId,
        type: "video",
        position: options.position,
        data: {
          videoId: result.videoId,
          title: file.name,
          isUploading: false,
          hasTranscription: false,
          metadata: result.metadata,
        },
      });

      setUploadProgress({ progress: 100, stage: "Upload complete!" });
      return { nodeId, ...result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      setUploadProgress({ progress: 0, stage: "Upload failed", error: errorMessage });
      throw error;
    }
  }, [videoService, addNode]);

  const resetProgress = useCallback(() => {
    setUploadProgress(null);
  }, []);

  return {
    uploadVideo,
    uploadProgress,
    isUploading: uploadProgress !== null && uploadProgress.progress < 100 && !uploadProgress.error,
    resetProgress,
  };
}

/**
 * Hook for video CRUD operations
 */
export function useVideoOperations(projectId: Id<"projects">) {
  const videoService = useVideoService();
  
  // Queries
  const videos = useQuery(api.domains.videos.videos.getVideosByProject, { projectId });
  
  // Mutations
  const updateVideoMutation = useMutation(api.domains.videos.videos.updateVideo);
  const deleteVideoMutation = useMutation(api.domains.videos.videos.deleteVideo);

  const updateVideo = useCallback(async (
    videoId: Id<"videos">, 
    updates: { title?: string; transcription?: string; canvasPosition?: { x: number; y: number } }
  ) => {
    return await updateVideoMutation({ id: videoId, ...updates });
  }, [updateVideoMutation]);

  const deleteVideo = useCallback(async (videoId: Id<"videos">) => {
    return await deleteVideoMutation({ id: videoId });
  }, [deleteVideoMutation]);

  const getVideoById = useCallback((videoId: Id<"videos">) => {
    return videos?.find(video => video._id === videoId);
  }, [videos]);

  return {
    videos: videos || [],
    updateVideo,
    deleteVideo,
    getVideoById,
    isLoading: videos === undefined,
  };
}

/**
 * Hook for video metadata operations
 */
export function useVideoMetadata(videoId?: Id<"videos">) {
  const videoService = useVideoService();
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  const extractMetadata = useCallback(async (file: File) => {
    if (!file) return null;

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const metadata = await videoService.extractMetadata(file, {
        onProgress: (progress) => {
          console.log(`Extraction progress: ${(progress * 100).toFixed(1)}%`);
        },
      });
      return metadata;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Metadata extraction failed";
      setExtractionError(errorMessage);
      throw error;
    } finally {
      setIsExtracting(false);
    }
  }, [videoService]);

  const validateVideoFile = useCallback((file: File) => {
    return videoService.validateVideoFile(file);
  }, [videoService]);

  return {
    extractMetadata,
    validateVideoFile,
    isExtracting,
    extractionError,
  };
}

/**
 * Hook for video player state management
 */
export function useVideoPlayer(videoUrl?: string) {
  const [playerState, setPlayerState] = useState({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    isFullscreen: false,
    playbackRate: 1,
    seeking: false,
    error: null as string | null,
  });

  const play = useCallback(async () => {
    // Video player logic would go here
    setPlayerState(prev => ({ ...prev, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    setPlayerState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const seek = useCallback((time: number) => {
    setPlayerState(prev => ({ ...prev, currentTime: time, seeking: true }));
    // Seek logic would go here
    setTimeout(() => {
      setPlayerState(prev => ({ ...prev, seeking: false }));
    }, 100);
  }, []);

  const setVolume = useCallback((volume: number) => {
    setPlayerState(prev => ({ ...prev, volume: Math.max(0, Math.min(1, volume)) }));
  }, []);

  const toggleMute = useCallback(() => {
    setPlayerState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlayerState(prev => ({ ...prev, playbackRate: rate }));
  }, []);

  const reset = useCallback(() => {
    setPlayerState({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      isMuted: false,
      isFullscreen: false,
      playbackRate: 1,
      seeking: false,
      error: null,
    });
  }, []);

  return {
    playerState,
    controls: {
      play,
      pause,
      seek,
      setVolume,
      toggleMute,
      setPlaybackRate,
      reset,
    },
    // Derived state
    isPlaying: playerState.isPlaying,
    progress: playerState.duration > 0 ? (playerState.currentTime / playerState.duration) * 100 : 0,
    remainingTime: playerState.duration - playerState.currentTime,
  };
}

/**
 * Hook for video processing status
 */
export function useVideoProcessing(videoId?: Id<"videos">) {
  const video = useQuery(api.domains.videos.videos.getVideo, videoId ? { id: videoId } : "skip");
  
  return {
    video,
    isProcessing: video?.transcriptionStatus === "processing",
    hasTranscription: !!video?.transcription,
    transcriptionStatus: video?.transcriptionStatus || "idle",
    transcriptionProgress: video?.transcriptionProgress,
    transcriptionError: video?.transcriptionError,
    isLoading: video === undefined && videoId !== undefined,
  };
}