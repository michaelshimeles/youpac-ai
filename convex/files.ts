import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// This mutation generates an upload URL for the client to upload files directly
export const generateUploadUrl = mutation(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  
  // This creates a temporary upload URL that the client can POST to
  return await ctx.storage.generateUploadUrl();
});

// This stores the file reference after upload
export const createVideoFile = mutation({
  args: {
    storageId: v.id("_storage"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    
    const url = await ctx.storage.getUrl(args.storageId);
    
    return {
      storageId: args.storageId,
      url,
    };
  },
});

// Query to get URL from storage ID
export const getUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});