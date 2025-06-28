import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";

export const createProject = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const projectId = await ctx.db.insert("projects", {
      userId,
      title: args.title,
      description: args.description,
      thumbnail: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isArchived: false,
    });

    return projectId;
  },
});

export const getProjects = query({
  args: {
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    let projects;
    if (args.includeArchived) {
      projects = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .collect();
    } else {
      projects = await ctx.db
        .query("projects")
        .withIndex("by_user_archived", (q) => 
          q.eq("userId", userId).eq("isArchived", false)
        )
        .order("desc")
        .collect();
    }

    // Get first video for each project to use as thumbnail
    const projectsWithThumbnails = await Promise.all(
      projects.map(async (project) => {
        const firstVideo = await ctx.db
          .query("videos")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .first();
        
        return {
          ...project,
          thumbnail: firstVideo?.videoUrl || project.thumbnail,
        };
      })
    );

    return projectsWithThumbnails;
  },
});

export const getProject = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== userId) {
      throw new Error("Project not found or unauthorized");
    }

    return project;
  },
});

export const updateProject = mutation({
  args: {
    id: v.id("projects"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    isArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== userId) {
      throw new Error("Project not found or unauthorized");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };
    
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.isArchived !== undefined) updates.isArchived = args.isArchived;

    await ctx.db.patch(args.id, updates);
  },
});

export const deleteProject = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== userId) {
      throw new Error("Project not found or unauthorized");
    }

    // Delete all related data
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    
    for (const video of videos) {
      await ctx.db.delete(video._id);
    }

    const agents = await ctx.db
      .query("agents")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    
    for (const agent of agents) {
      await ctx.db.delete(agent._id);
    }

    const canvas = await ctx.db
      .query("projectCanvases")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .first();
    
    if (canvas) {
      await ctx.db.delete(canvas._id);
    }

    await ctx.db.delete(args.id);
  },
});