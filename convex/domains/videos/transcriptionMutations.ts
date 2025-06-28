import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";

// Transcription Mutations and Queries (standard Convex runtime)
export const updateTranscriptionStatus = mutation({
  args: {
    id: v.id("videos"),
    status: v.union(
      v.literal("idle"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
    progress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const video = await ctx.db.get(args.id);
    if (!video || video.userId !== userId) {
      throw new Error("Video not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      transcriptionStatus: args.status,
      ...(args.error !== undefined && { transcriptionError: args.error }),
      ...(args.progress !== undefined && { transcriptionProgress: args.progress }),
    });
  },
});

export const updateVideoTranscription = mutation({
  args: {
    videoId: v.id("videos"),
    transcription: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const video = await ctx.db.get(args.videoId);
    if (!video || video.userId !== userId) {
      throw new Error("Video not found or unauthorized");
    }

    await ctx.db.patch(args.videoId, {
      transcription: args.transcription,
      transcriptionStatus: "completed",
    });
  },
});

export const getVideoWithTranscription = query({
  args: {
    videoId: v.id("videos"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const video = await ctx.db.get(args.videoId);
    if (!video || video.userId !== userId) {
      throw new Error("Video not found or unauthorized");
    }

    return video;
  },
});

// Standalone Transcriptions
export const createTranscription = mutation({
  args: {
    projectId: v.id("projects"),
    videoId: v.optional(v.id("videos")),
    fileName: v.string(),
    format: v.string(),
    fullText: v.string(),
    segments: v.optional(v.array(v.object({
      start: v.number(),
      end: v.number(),
      text: v.string(),
    }))),
    wordCount: v.number(),
    duration: v.optional(v.number()),
    fileStorageId: v.optional(v.id("_storage")),
    canvasPosition: v.object({
      x: v.number(),
      y: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    console.log("[Convex] transcriptions.create called with args:", args);
    
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;
    
    console.log("[Convex] User ID:", userId);

    const transcriptionId = await ctx.db.insert("transcriptions", {
      userId,
      projectId: args.projectId,
      videoId: args.videoId,
      fileName: args.fileName,
      format: args.format,
      fullText: args.fullText,
      segments: args.segments,
      wordCount: args.wordCount,
      duration: args.duration,
      fileStorageId: args.fileStorageId,
      canvasPosition: args.canvasPosition,
      createdAt: Date.now(),
    });
    
    console.log("[Convex] Transcription created with ID:", transcriptionId);
    
    return transcriptionId;
  },
});

export const updateTranscription = mutation({
  args: {
    id: v.id("transcriptions"),
    canvasPosition: v.optional(v.object({
      x: v.number(),
      y: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const transcription = await ctx.db.get(args.id);
    if (!transcription || transcription.userId !== userId) {
      throw new Error("Transcription not found or unauthorized");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(args.id, updates);
  },
});

export const deleteTranscription = mutation({
  args: {
    id: v.id("transcriptions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const transcription = await ctx.db.get(args.id);
    if (!transcription || transcription.userId !== userId) {
      throw new Error("Transcription not found or unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});

export const getTranscriptionsByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const transcriptions = await ctx.db
      .query("transcriptions")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    return transcriptions;
  },
});

export const getTranscription = query({
  args: {
    id: v.id("transcriptions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const transcription = await ctx.db.get(args.id);
    if (!transcription || transcription.userId !== userId) {
      throw new Error("Transcription not found or unauthorized");
    }

    return transcription;
  },
});

export const updateTranscriptionPosition = mutation({
  args: {
    id: v.id("transcriptions"),
    position: v.object({
      x: v.number(),
      y: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const transcription = await ctx.db.get(args.id);
    if (!transcription || transcription.userId !== userId) {
      throw new Error("Transcription not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      canvasPosition: args.position,
    });
  },
});

// Manual transcription upload functionality
export const uploadManualTranscription = mutation({
  args: {
    videoId: v.id("videos"),
    transcription: v.string(),
    transcriptionSegments: v.optional(v.array(v.object({
      start: v.number(),
      end: v.number(),
      text: v.string(),
    }))),
    fileStorageId: v.optional(v.id("_storage")),
    format: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    // Verify ownership
    const video = await ctx.db.get(args.videoId);
    if (!video || video.userId !== userId) {
      throw new Error("Video not found or unauthorized");
    }

    // Update video with manual transcription
    await ctx.db.patch(args.videoId, {
      transcription: args.transcription,
      transcriptionStatus: "completed",
      transcriptionError: undefined,
      transcriptionProgress: undefined,
    });

    // Find all agents connected to this video
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();

    // Reset agent drafts to trigger regeneration
    for (const agent of agents) {
      await ctx.db.patch(agent._id, {
        draft: "",
        status: "idle",
      });
    }

    return {
      success: true,
      affectedAgents: agents.length,
    };
  },
});