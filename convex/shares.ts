import { v } from "convex/values";
import { mutation, query, } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create a share link
export const createShareLink = mutation({
  args: {
    projectId: v.id("projects"),
    canvasState: v.object({
      nodes: v.array(v.any()),
      edges: v.array(v.any()),
      viewport: v.optional(v.object({
        x: v.number(),
        y: v.number(),
        zoom: v.number(),
      })),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    // Verify project ownership
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Project not found or unauthorized");
    }

    // Generate a unique share ID (8 characters)
    const shareId = Math.random().toString(36).substring(2, 10);

    // Check if share already exists for this project
    const existingShare = await ctx.db
      .query("shares")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();

    if (existingShare) {
      // Update existing share
      await ctx.db.patch(existingShare._id, {
        canvasState: args.canvasState,
        updatedAt: Date.now(),
      });
      return existingShare.shareId;
    }

    // Create new share
    await ctx.db.insert("shares", {
      shareId,
      projectId: args.projectId,
      userId,
      canvasState: args.canvasState,
      viewCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return shareId;
  },
});

// Get shared canvas by share ID
export const getSharedCanvas = query({
  args: {
    shareId: v.string(),
  },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("shares")
      .withIndex("by_shareId", (q) => q.eq("shareId", args.shareId))
      .first();

    if (!share) {
      return null;
    }

    // Get project details
    const project = await ctx.db.get(share.projectId);
    if (!project) {
      return null;
    }

    // Get video from the videos table
    const video = await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", share.projectId))
      .first();
    
    if (!video) {
      return null;
    }

    // Get agents
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_project", (q) => q.eq("projectId", share.projectId))
      .collect();

    return {
      share,
      project: {
        name: project.title, // projects have 'title' not 'name'
        thumbnail: project.thumbnail,
      },
      video: {
        _id: video._id,
        title: video.title || "",
        url: video.videoUrl || "",
        duration: video.duration,
        fileSize: video.fileSize,
        transcription: video.transcription,
      },
      agents: agents.map(agent => ({
        _id: agent._id,
        type: agent.type,
        draft: agent.draft,
        thumbnailUrl: agent.thumbnailUrl,
        status: agent.status,
      })),
    };
  },
});

// Get share link for a project
export const getShareLink = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      return null;
    }

    const share = await ctx.db
      .query("shares")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();

    return share?.shareId || null;
  },
});

// Increment view count for a share
export const incrementViewCount = mutation({
  args: {
    shareId: v.string(),
  },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("shares")
      .withIndex("by_shareId", (q) => q.eq("shareId", args.shareId))
      .first();

    if (share) {
      await ctx.db.patch(share._id, {
        viewCount: (share.viewCount || 0) + 1,
      });
    }
  },
});

// Delete share link
export const deleteShareLink = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Project not found or unauthorized");
    }

    const share = await ctx.db
      .query("shares")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();

    if (share) {
      await ctx.db.delete(share._id);
    }
  },
});