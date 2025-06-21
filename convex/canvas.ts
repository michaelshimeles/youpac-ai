import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const saveState = mutation({
  args: {
    projectId: v.id("projects"),
    nodes: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        position: v.object({
          x: v.number(),
          y: v.number(),
        }),
        data: v.any(),
      })
    ),
    edges: v.array(
      v.object({
        id: v.string(),
        source: v.string(),
        target: v.string(),
        sourceHandle: v.optional(v.string()),
        targetHandle: v.optional(v.string()),
      })
    ),
    viewport: v.object({
      x: v.number(),
      y: v.number(),
      zoom: v.number(),
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

    const existing = await ctx.db
      .query("projectCanvases")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        nodes: args.nodes,
        edges: args.edges,
        viewport: args.viewport,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("projectCanvases", {
        userId,
        projectId: args.projectId,
        nodes: args.nodes,
        edges: args.edges,
        viewport: args.viewport,
        updatedAt: Date.now(),
      });
    }
  },
});

export const getState = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    // Verify project ownership
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      return null;
    }

    return await ctx.db
      .query("projectCanvases")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();
  },
});

export const clearState = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    // Verify project ownership
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Project not found or unauthorized");
    }

    const state = await ctx.db
      .query("projectCanvases")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();

    if (state) {
      await ctx.db.delete(state._id);
    }
  },
});