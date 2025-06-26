import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    fileId: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    canvasPosition: v.object({
      x: v.number(),
      y: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    // If we have a storageId, get the URL from Convex storage
    let videoUrl = args.videoUrl;
    if (args.storageId) {
      const url = await ctx.storage.getUrl(args.storageId);
      if (url) {
        videoUrl = url;
      }
    }

    const videoId = await ctx.db.insert("videos", {
      userId,
      projectId: args.projectId,
      title: args.title,
      videoUrl,
      fileId: args.fileId || args.storageId,
      canvasPosition: args.canvasPosition,
      transcriptionStatus: "idle",
      createdAt: Date.now(),
    });
    
    // Return the created video with its URL
    const video = await ctx.db.get(videoId);
    return video;
  },
});

export const update = mutation({
  args: {
    id: v.id("videos"),
    title: v.optional(v.string()),
    transcription: v.optional(v.string()),
    canvasPosition: v.optional(v.object({
      x: v.number(),
      y: v.number(),
    })),
    clearTranscription: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const video = await ctx.db.get(args.id);
    if (!video || video.userId !== userId) {
      throw new Error("Video not found or unauthorized");
    }

    const { id, clearTranscription, ...updates } = args;
    
    // If clearTranscription is true, clear the transcription and reset status
    if (clearTranscription) {
      await ctx.db.patch(args.id, {
        transcription: undefined,
        transcriptionStatus: "idle",
        transcriptionError: undefined,
      });
    } else {
      await ctx.db.patch(args.id, updates);
    }
  },
});

// New mutation to update video metadata
export const updateMetadata = mutation({
  args: {
    id: v.id("videos"),
    duration: v.optional(v.number()),
    fileSize: v.optional(v.number()),
    resolution: v.optional(v.object({
      width: v.number(),
      height: v.number(),
    })),
    frameRate: v.optional(v.number()),
    bitRate: v.optional(v.number()),
    format: v.optional(v.string()),
    codec: v.optional(v.string()),
    audioInfo: v.optional(v.object({
      codec: v.string(),
      sampleRate: v.number(),
      channels: v.number(),
      bitRate: v.number(),
    })),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const video = await ctx.db.get(args.id);
    if (!video || video.userId !== userId) {
      throw new Error("Video not found or unauthorized");
    }

    const { id, ...metadata } = args;
    await ctx.db.patch(args.id, metadata);
    
    return await ctx.db.get(args.id);
  },
});

export const getByUser = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    return await ctx.db
      .query("videos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    // Verify project ownership
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      return [];
    }

    return await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("videos") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const video = await ctx.db.get(args.id);
    if (!video || video.userId !== userId) {
      throw new Error("Video not found or unauthorized");
    }

    return video;
  },
});

// New query to get video with transcription for AI generation
export const getWithTranscription = query({
  args: { id: v.id("videos") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    const video = await ctx.db.get(args.id);
    if (!video || video.userId !== userId) {
      return null;
    }

    return {
      title: video.title,
      transcription: video.transcription,
    };
  },
});

export const list = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    const videos = await ctx.db
      .query("videos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return videos.map(video => ({
      _id: video._id,
      title: video.title || "Untitled Video",
      transcript: video.transcription,
      duration: video.duration,
      createdAt: video._creationTime,
    }));
  },
});

export const remove = mutation({
  args: { id: v.id("videos") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const video = await ctx.db.get(args.id);
    if (!video || video.userId !== userId) {
      throw new Error("Video not found or unauthorized");
    }

    // Delete associated agents
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_video", (q) => q.eq("videoId", args.id))
      .collect();
    
    for (const agent of agents) {
      await ctx.db.delete(agent._id);
    }

    await ctx.db.delete(args.id);
  },
});

// Mutation to update video transcription (moved from transcription.ts)
export const updateVideoTranscription = mutation({
  args: {
    videoId: v.id("videos"),
    transcription: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      transcription: args.transcription,
      transcriptionStatus: "completed",
      transcriptionError: undefined,
    });
  },
});

// Mutation to update transcription status
export const updateTranscriptionStatus = mutation({
  args: {
    videoId: v.id("videos"),
    status: v.union(v.literal("idle"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
    error: v.optional(v.string()),
    progress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      transcriptionStatus: args.status,
    };
    
    if (args.error) {
      updates.transcriptionError = args.error;
    }
    
    if (args.progress) {
      updates.transcriptionProgress = args.progress;
    }
    
    await ctx.db.patch(args.videoId, updates);
  },
});

// Mutation to update video storage ID
export const updateVideoStorageId = mutation({
  args: {
    id: v.id("videos"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    // Get the URL from Convex storage
    const videoUrl = await ctx.storage.getUrl(args.storageId);
    
    await ctx.db.patch(args.id, {
      storageId: args.storageId,
      videoUrl: videoUrl || undefined,
      fileId: args.storageId, // Also update fileId to match storageId
    });
  },
});
