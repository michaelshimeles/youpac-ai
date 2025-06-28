import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (existingUser !== null) {
      // User already exists, optionally update their info
      if (
        existingUser.name !== identity.name ||
        existingUser.email !== identity.email ||
        existingUser.image !== identity.pictureUrl
      ) {
        await ctx.db.patch(existingUser._id, {
          name: identity.name || existingUser.name,
          email: identity.email || existingUser.email,
          image: identity.pictureUrl || existingUser.image,
        });
      }
      return existingUser._id;
    }

    // Create new user
    return await ctx.db.insert("users", {
      name: identity.name,
      email: identity.email,
      image: identity.pictureUrl,
      tokenIdentifier: identity.subject,
    });
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();
  },
});