import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    content: v.string(),
    format: v.optional(v.string()),
    wordCount: v.number(),
    fileName: v.optional(v.string()),
    fileStorageId: v.optional(v.id("_storage")),
    canvasPosition: v.object({
      x: v.number(),
      y: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const now = Date.now();
    const articleId = await ctx.db.insert("articles", {
      userId,
      projectId: args.projectId,
      title: args.title,
      content: args.content,
      format: args.format,
      wordCount: args.wordCount,
      fileName: args.fileName,
      fileStorageId: args.fileStorageId,
      canvasPosition: args.canvasPosition,
      createdAt: now,
      updatedAt: now,
    });

    return articleId;
  },
});

export const update = mutation({
  args: {
    id: v.id("articles"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    wordCount: v.optional(v.number()),
    canvasPosition: v.optional(v.object({
      x: v.number(),
      y: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const article = await ctx.db.get(args.id);
    if (!article || article.userId !== userId) {
      throw new Error("Article not found or unauthorized");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(args.id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("articles"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const article = await ctx.db.get(args.id);
    if (!article || article.userId !== userId) {
      throw new Error("Article not found or unauthorized");
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

    const articles = await ctx.db
      .query("articles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    return articles;
  },
});

export const get = query({
  args: {
    id: v.id("articles"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const article = await ctx.db.get(args.id);
    if (!article || article.userId !== userId) {
      throw new Error("Article not found or unauthorized");
    }

    return article;
  },
});

export const updatePosition = mutation({
  args: {
    id: v.id("articles"),
    position: v.object({
      x: v.number(),
      y: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const article = await ctx.db.get(args.id);
    if (!article || article.userId !== userId) {
      throw new Error("Article not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      canvasPosition: args.position,
      updatedAt: Date.now(),
    });
  },
});