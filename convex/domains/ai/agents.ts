import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";

export const createAgent = mutation({
  args: {
    videoId: v.id("videos"),
    type: v.union(
      v.literal("title"),
      v.literal("description"),
      v.literal("thumbnail"),
      v.literal("tweets")
    ),
    canvasPosition: v.object({
      x: v.number(),
      y: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    // Verify video exists and belongs to user
    const video = await ctx.db.get(args.videoId);
    if (!video || video.userId !== userId) {
      throw new Error("Video not found or unauthorized");
    }

    if (!video.projectId) {
      throw new Error("Video must belong to a project");
    }

    return await ctx.db.insert("agents", {
      videoId: args.videoId,
      userId,
      projectId: video.projectId,
      type: args.type,
      draft: "",
      connections: [],
      chatHistory: [],
      canvasPosition: args.canvasPosition,
      status: "idle",
      createdAt: Date.now(),
    });
  },
});

export const updateAgentDraft = mutation({
  args: {
    id: v.id("agents"),
    draft: v.string(),
    status: v.optional(v.union(
      v.literal("idle"),
      v.literal("generating"),
      v.literal("ready"),
      v.literal("error")
    )),
    thumbnailUrl: v.optional(v.string()),
    thumbnailStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const agent = await ctx.db.get(args.id);
    if (!agent || agent.userId !== userId) {
      throw new Error("Agent not found or unauthorized");
    }

    const updateData: any = {
      draft: args.draft,
      status: args.status || "ready",
    };
    
    if (args.thumbnailUrl !== undefined) {
      updateData.thumbnailUrl = args.thumbnailUrl;
    }
    
    if (args.thumbnailStorageId !== undefined) {
      updateData.thumbnailStorageId = args.thumbnailStorageId;
    }

    await ctx.db.patch(args.id, updateData);
  },
});

export const updateAgentConnections = mutation({
  args: {
    id: v.id("agents"),
    connections: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const agent = await ctx.db.get(args.id);
    if (!agent || agent.userId !== userId) {
      throw new Error("Agent not found or unauthorized");
    }

    await ctx.db.patch(args.id, { connections: args.connections });
  },
});

export const addAgentChatMessage = mutation({
  args: {
    id: v.id("agents"),
    role: v.union(v.literal("user"), v.literal("ai")),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const agent = await ctx.db.get(args.id);
    if (!agent || agent.userId !== userId) {
      throw new Error("Agent not found or unauthorized");
    }

    const chatHistory = [...agent.chatHistory, {
      role: args.role,
      message: args.message,
      timestamp: Date.now(),
    }];

    await ctx.db.patch(args.id, { chatHistory });
  },
});

export const updateAgentPosition = mutation({
  args: {
    id: v.id("agents"),
    canvasPosition: v.object({
      x: v.number(),
      y: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const agent = await ctx.db.get(args.id);
    if (!agent || agent.userId !== userId) {
      throw new Error("Agent not found or unauthorized");
    }

    await ctx.db.patch(args.id, { canvasPosition: args.canvasPosition });
  },
});

export const getAgentsByVideo = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    return await ctx.db
      .query("agents")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
  },
});

export const getAgentsByProject = query({
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
      .query("agents")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const getAgent = query({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const agent = await ctx.db.get(args.id);
    if (!agent || agent.userId !== userId) {
      throw new Error("Agent not found or unauthorized");
    }

    return agent;
  },
});

export const deleteAgent = mutation({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const agent = await ctx.db.get(args.id);
    if (!agent || agent.userId !== userId) {
      throw new Error("Agent not found or unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});