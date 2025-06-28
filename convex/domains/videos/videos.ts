import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";

// Video CRUD operations
export const createVideo = mutation({
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

export const updateVideo = mutation({
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

export const getVideo = query({
  args: {
    id: v.id("videos"),
  },
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

export const getVideosByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const videos = await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    return videos;
  },
});

export const updateVideoStorage = mutation({
  args: {
    id: v.id("videos"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const video = await ctx.db.get(args.id);
    if (!video || video.userId !== userId) {
      throw new Error("Video not found or unauthorized");
    }

    // Get the URL from Convex storage
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new Error("Failed to get storage URL");
    }

    await ctx.db.patch(args.id, {
      storageId: args.storageId,
      fileId: args.storageId,
      videoUrl: url,
    });
  },
});

export const deleteVideo = mutation({
  args: {
    id: v.id("videos"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const video = await ctx.db.get(args.id);
    if (!video || video.userId !== userId) {
      throw new Error("Video not found or unauthorized");
    }

    // Delete all agents associated with this video
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_video", (q) => q.eq("videoId", args.id))
      .collect();

    for (const agent of agents) {
      await ctx.db.delete(agent._id);
    }

    // Delete the video
    await ctx.db.delete(args.id);
  },
});