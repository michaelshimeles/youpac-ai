import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const create = mutation({
  args: {
    videoId: v.optional(v.id("videos")),
    articleId: v.optional(v.id("articles")),
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

    // Must have either a video or article
    if (!args.videoId && !args.articleId) {
      throw new Error("Agent must be associated with either a video or article");
    }

    let projectId: string | undefined;

    // Verify video exists and belongs to user
    if (args.videoId) {
      const video = await ctx.db.get(args.videoId);
      if (!video || video.userId !== userId) {
        throw new Error("Video not found or unauthorized");
      }
      if (!video.projectId) {
        throw new Error("Video must belong to a project");
      }
      projectId = video.projectId;
    }

    // Verify article exists and belongs to user
    if (args.articleId) {
      const article = await ctx.db.get(args.articleId);
      if (!article || article.userId !== userId) {
        throw new Error("Article not found or unauthorized");
      }
      projectId = article.projectId;
    }

    if (!projectId) {
      throw new Error("Could not determine project ID");
    }

    return await ctx.db.insert("agents", {
      videoId: args.videoId,
      articleId: args.articleId,
      userId,
      projectId: projectId as Id<"projects">,
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

export const updateDraft = mutation({
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

export const updateConnections = mutation({
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

export const addChatMessage = mutation({
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

export const updatePosition = mutation({
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

export const getByVideo = query({
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
      .query("agents")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const getById = query({
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

export const remove = mutation({
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