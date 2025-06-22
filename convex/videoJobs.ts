import { v } from "convex/values";
import { action, internalAction, mutation, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";


// Schedule transcription job
export const scheduleTranscription = mutation({
  args: {
    videoId: v.id("videos"),
    storageId: v.id("_storage"),
    fileType: v.optional(v.string()),
    fileSize: v.optional(v.number()), // File size in bytes
    fileName: v.optional(v.string()), // File name for R2 upload
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
    
    // Schedule direct transcription with Convex storage
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
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; transcription: string; service?: string } | void> => {
    console.log("🎬 Background transcription started for video:", args.videoId);
    console.log("📋 Storage ID:", args.storageId);
    console.log("📋 File type:", args.fileType);
    console.log("📋 File name:", args.fileName);
    
    try {
      console.log("🚀 Calling ElevenLabs transcription action...");
      const result = await ctx.runAction(api.transcription.transcribeVideoElevenLabs, {
        videoId: args.videoId,
        storageId: args.storageId,
        fileType: args.fileType,
        fileName: args.fileName,
      });
      console.log("✅ ElevenLabs transcription completed successfully:", result);
      
      if (!result) {
        throw new Error("Transcription returned no result");
      }
      
      return result;
    } catch (error: any) {
      console.error("❌ Transcription failed:", error.message);
      console.error("Full error:", error);
      
      // Mark as failed
      await ctx.runMutation(internal.videoJobs.markTranscriptionFailed, {
        videoId: args.videoId,
        error: error.message || "Transcription failed",
      });
      
      throw error;
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