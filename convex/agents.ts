import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel"; // Added Id import

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
    projectId: v.optional(v.id("projects")), // Added projectId as an optional arg
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    let finalProjectId: Id<"projects"> | undefined = undefined;

    if (args.videoId) {
      const video = await ctx.db.get(args.videoId);
      if (!video || video.userId !== userId) {
        throw new Error("Video not found or unauthorized");
      }
      if (!video.projectId) {
        throw new Error("Video is not associated with a project.");
      }
      finalProjectId = video.projectId;
    } else if (args.projectId) {
      // Verify project exists and belongs to user if projectId is passed directly
      const project = await ctx.db.get(args.projectId);
      if (!project || project.userId !== userId) {
        throw new Error("Project not found or unauthorized");
      }
      finalProjectId = args.projectId;
    } else {
      // Neither videoId nor projectId was provided
      throw new Error(
        "Agent creation requires either a videoId or a projectId."
      );
    }

    // At this point, finalProjectId should be defined.
    // If it's still undefined, something is wrong with the logic above or assumptions.
    if (!finalProjectId) {
        // This should ideally be caught by the logic above, but as a safeguard:
        throw new Error("Failed to determine projectId for the agent.");
    }

    return await ctx.db.insert("agents", {
      videoId: args.videoId,
      userId,
      projectId: finalProjectId, // Use the determined projectId
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
  args: { videoId: v.id("videos") }, // This arg should remain required for a "getByVideo" query
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    // Although videoId is required in args for this query,
    // the by_video index could technically include documents where videoId is null
    // if they were inserted before schema enforcement or if schema was relaxed.
    // However, given videoId is optional in schema, this query is specific to agents *with* a videoId.
    // No change needed here if args.videoId is guaranteed by the caller to be a valid ID.
    // The Coderabbit suggestion is more about preventing `q.eq("videoId", undefined)`
    // if `args.videoId` itself could be optional in this query's args.
    // Since `args.videoId: v.id("videos")` makes it required, no guard is strictly needed here
    // *unless* we change this query's args to `v.optional(v.id("videos"))`.
    // For safety and explicitness as per Coderabbit's spirit, adding a check for null/undefined
    // (even if type system says it's an ID) can prevent runtime issues if `null` is passed.
    if (args.videoId == null) {
      return []; // Or handle as an error, depending on desired behavior
    }

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