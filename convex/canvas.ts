import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const saveState = mutation({
  args: {
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

    const existing = await ctx.db
      .query("canvasStates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        nodes: args.nodes,
        edges: args.edges,
        viewport: args.viewport,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("canvasStates", {
        userId,
        nodes: args.nodes,
        edges: args.edges,
        viewport: args.viewport,
        updatedAt: Date.now(),
      });
    }
  },
});

export const getState = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    return await ctx.db
      .query("canvasStates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const clearState = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const state = await ctx.db
      .query("canvasStates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (state) {
      await ctx.db.delete(state._id);
    }
  },
});