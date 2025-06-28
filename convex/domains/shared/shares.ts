import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

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

    // Generate a unique share ID
    const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const shareRecord = await ctx.db.insert("shares", {
      shareId,
      projectId: args.projectId,
      userId,
      canvasState: args.canvasState,
      viewCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { shareId, recordId: shareRecord };
  },
});

// Get shared canvas by share ID (read-only)
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

    // Get project details for context
    const project = await ctx.db.get(share.projectId);

    return {
      canvasState: share.canvasState,
      projectTitle: project?.title || "Untitled Project",
      shareId: share.shareId,
      viewCount: share.viewCount,
      createdAt: share.createdAt,
    };
  },
});

// Increment view count for shared canvas
export const incrementShareViewCount = mutation({
  args: {
    shareId: v.string(),
  },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("shares")
      .withIndex("by_shareId", (q) => q.eq("shareId", args.shareId))
      .first();

    if (!share) {
      throw new Error("Share not found");
    }

    await ctx.db.patch(share._id, {
      viewCount: share.viewCount + 1,
      updatedAt: Date.now(),
    });

    return share.viewCount + 1;
  },
});

// Get user's shares
export const getUserShares = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    const shares = await ctx.db
      .query("shares")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Get project details for each share
    const sharesWithProjects = await Promise.all(
      shares.map(async (share) => {
        const project = await ctx.db.get(share.projectId);
        return {
          ...share,
          projectTitle: project?.title || "Untitled Project",
        };
      })
    );

    return sharesWithProjects;
  },
});

// Delete a share
export const deleteShare = mutation({
  args: {
    shareId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const share = await ctx.db
      .query("shares")
      .withIndex("by_shareId", (q) => q.eq("shareId", args.shareId))
      .first();

    if (!share || share.userId !== userId) {
      throw new Error("Share not found or unauthorized");
    }

    await ctx.db.delete(share._id);
  },
});

// Update share canvas state
export const updateShare = mutation({
  args: {
    shareId: v.string(),
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

    const share = await ctx.db
      .query("shares")
      .withIndex("by_shareId", (q) => q.eq("shareId", args.shareId))
      .first();

    if (!share || share.userId !== userId) {
      throw new Error("Share not found or unauthorized");
    }

    await ctx.db.patch(share._id, {
      canvasState: args.canvasState,
      updatedAt: Date.now(),
    });
  },
});