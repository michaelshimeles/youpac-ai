import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
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

export const update = mutation({
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

export const remove = mutation({
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

export const listByProject = query({
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

export const get = query({
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

export const updatePosition = mutation({
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