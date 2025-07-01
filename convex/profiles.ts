import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    return await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const upsert = mutation({
  args: {
    channelName: v.string(),
    contentType: v.string(),
    niche: v.string(),
    links: v.array(v.string()),
    tone: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("profiles", {
        userId,
        ...args,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const completeOnboarding = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, { onboardingCompleted: true });
      return { success: true, created: false };
    }

    // Create minimal profile if none exists
    // Ensure all required fields from the schema are provided.
    // From schema: userId, channelName, contentType, niche, links, createdAt, updatedAt are required.
    // onboardingCompleted, tone, targetAudience are optional.
    await ctx.db.insert("profiles", {
      userId: identity.subject,
      channelName: "", // Default empty string as per schema (cannot be undefined)
      contentType: "", // Default empty string
      niche: "",       // Default empty string
      links: [],       // Default empty array
      onboardingCompleted: true,
      // Optional fields can be omitted if not logically part of a minimal profile:
      // tone: undefined,
      // targetAudience: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true, created: true };
  },
});

export const remove = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (profile) {
      await ctx.db.delete(profile._id);
    }
  },
});