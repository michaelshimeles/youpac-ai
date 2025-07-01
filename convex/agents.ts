import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    videoId: v.optional(v.id("videos")), // Made videoId optional
    type: v.union(
      v.literal("title"),
      v.literal("description"),
      v.literal("thumbnail"),
      v.literal("tweets"),
      v.literal("linkedin"), // Added linkedin
      v.literal("blog")      // Added blog
    ),
    canvasPosition: v.object({
      x: v.number(),
      y: v.number(),
    }),
    // It might be necessary to pass projectId directly if videoId is not present
    // For now, projectId will be derived if videoId exists, otherwise it will be undefined.
    // Consider adding: projectId: v.optional(v.id("projects")) if agents can be created without a video
    // but must still belong to a project.
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    let projectId: typeof v.id("projects") | undefined = undefined;

    if (args.videoId) {
      // Verify video exists and belongs to user
      const video = await ctx.db.get(args.videoId);
      if (!video || video.userId !== userId) {
        throw new Error("Video not found or unauthorized");
      }
      if (!video.projectId) {
        // This case should ideally not happen if videos are always linked to projects
        throw new Error("Video must belong to a project, but projectId is missing.");
      }
      projectId = video.projectId;
    } else {
      // If no videoId, we need a way to determine the projectId.
      // For now, we'll allow agents to be created without a projectId if no video is linked.
      // This implies that agents might not be directly queryable by project unless a video is linked,
      // or if projectId is passed directly in args (which is not the case currently).
      // A more robust solution would be to require projectId in args if videoId is absent.
      // For the scope of this change, we proceed with projectId being potentially undefined.
      // The frontend logic attempts to connect to *any* source, which might or might not have a projectId.
      // If the source is a 'source' node, its projectId isn't inherently passed here.
      console.warn("Creating agent without a videoId. ProjectId will be undefined unless explicitly passed or handled differently.");
    }

    // If projectId is still undefined here and agents MUST belong to a project,
    // this would be the place to throw an error or fetch it through another relation (e.g. a default project for the user).
    // For now, we allow it to be undefined if no video is linked.
    // This means agents created without a video might not show up in "by_project" queries unless projectId is set later.

    return await ctx.db.insert("agents", {
      videoId: args.videoId, // This will be undefined if not provided
      userId,
      projectId: projectId, // This will be undefined if not derived from a video
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