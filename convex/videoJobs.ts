import { v } from "convex/values";
import { action, internalAction, mutation, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";
import OpenAI from "openai";

// Schedule transcription job
export const scheduleTranscription = mutation({
  args: {
    videoId: v.id("videos"),
    storageId: v.id("_storage"),
    fileType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    
    console.log("Scheduling transcription for video:", args.videoId);
    
    // Update video status to processing
    await ctx.db.patch(args.videoId, {
      transcriptionStatus: "processing",
    });
    
    console.log("Updated video status to processing");
    
    // Schedule the transcription to run immediately
    await ctx.scheduler.runAfter(0, internal.videoJobs.transcribeInBackground, args);
    
    console.log("Scheduled background transcription job");
    
    return { scheduled: true };
  },
});

// Internal action that runs in the background
export const transcribeInBackground = internalAction({
  args: {
    videoId: v.id("videos"),
    storageId: v.id("_storage"),
    fileType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("Background transcription started for video:", args.videoId);
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OpenAI API key not configured");
      throw new Error("OpenAI API key not configured");
    }

    const openai = new OpenAI({ apiKey });
    
    try {
      // Get the file URL from storage
      const fileUrl = await ctx.storage.getUrl(args.storageId);
      if (!fileUrl) throw new Error("Could not get file URL");

      // Download the file
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error("Failed to fetch file");
      
      const blob = await response.blob();
      
      // Check file size
      const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
      if (blob.size > MAX_FILE_SIZE) {
        throw new Error(`File is too large (${(blob.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 25MB.`);
      }
      
      // Convert blob to File object
      const fileName = args.fileType === 'audio' ? 'audio.mp3' : 'video.mp4';
      const fileType = args.fileType === 'audio' ? 'audio/mp3' : 'video/mp4';
      const file = new File([blob], fileName, { type: blob.type || fileType });

      // Transcribe using Whisper API
      console.log(`Transcribing ${args.fileType || 'video'} file (${(blob.size / 1024 / 1024).toFixed(1)}MB)...`);
      const transcriptionResponse = await openai.audio.transcriptions.create({
        file,
        model: "whisper-1",
        response_format: "text",
      });

      // Update the video with transcription
      await ctx.runMutation(internal.videoJobs.updateTranscription, {
        videoId: args.videoId,
        transcription: transcriptionResponse,
      });
      
      console.log("Transcription completed successfully");
    } catch (error: any) {
      console.error("Transcription error:", error);
      
      // Update video to mark transcription as failed
      await ctx.runMutation(internal.videoJobs.markTranscriptionFailed, {
        videoId: args.videoId,
        error: error.message,
      });
    }
  },
});

// Internal mutation to update transcription
export const updateTranscription = internalMutation({
  args: {
    videoId: v.id("videos"),
    transcription: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      transcription: args.transcription,
      transcriptionStatus: "completed",
    });
  },
});

// Internal mutation to mark transcription as failed
export const markTranscriptionFailed = internalMutation({
  args: {
    videoId: v.id("videos"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      transcriptionStatus: "failed",
      transcriptionError: args.error,
    });
    console.error(`Transcription failed for video ${args.videoId}: ${args.error}`);
  },
});

// Schedule thumbnail generation
export const scheduleThumbnailGeneration = mutation({
  args: {
    videoId: v.id("videos"),
    videoTitle: v.string(),
    frames: v.array(v.object({
      dataUrl: v.string(),
      timestamp: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    
    // Get video metadata and profile for context
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");
    
    // Schedule thumbnail generation to run in background
    await ctx.scheduler.runAfter(0, internal.videoJobs.generateThumbnailInBackground, {
      videoId: args.videoId,
      videoTitle: args.videoTitle,
      frames: args.frames,
      videoData: {
        title: video.title,
        transcription: video.transcription,
        duration: video.duration,
      },
    });
    
    return { scheduled: true };
  },
});

// Internal action for thumbnail generation
export const generateThumbnailInBackground = internalAction({
  args: {
    videoId: v.id("videos"),
    videoTitle: v.string(),
    frames: v.array(v.object({
      dataUrl: v.string(),
      timestamp: v.number(),
    })),
    videoData: v.object({
      title: v.optional(v.string()),
      transcription: v.optional(v.string()),
      duration: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    // Call the existing thumbnail generation action with correct args
    await ctx.runAction(api.thumbnail.generateThumbnail, {
      agentType: "thumbnail" as const,
      videoId: args.videoId,
      videoFrames: args.frames,
      videoData: args.videoData,
      connectedAgentOutputs: [],
      profileData: undefined,
    });
  },
});