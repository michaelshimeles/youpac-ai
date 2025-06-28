import { v } from "convex/values";
import { mutation } from "../../_generated/server";

// Video metadata operations
export const updateVideoMetadata = mutation({
  args: {
    id: v.id("videos"),
    duration: v.optional(v.number()),
    fileSize: v.optional(v.number()),
    resolution: v.optional(v.object({
      width: v.number(),
      height: v.number(),
    })),
    frameRate: v.optional(v.number()),
    bitRate: v.optional(v.number()),
    format: v.optional(v.string()),
    codec: v.optional(v.string()),
    audioInfo: v.optional(v.object({
      codec: v.string(),
      sampleRate: v.number(),
      channels: v.number(),
      bitRate: v.number(),
    })),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const video = await ctx.db.get(args.id);
    if (!video || video.userId !== userId) {
      throw new Error("Video not found or unauthorized");
    }

    const { id, ...metadata } = args;
    await ctx.db.patch(args.id, metadata);
  },
});