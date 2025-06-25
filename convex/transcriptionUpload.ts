import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const uploadManualTranscription = mutation({
  args: {
    videoId: v.id("videos"),
    transcription: v.string(),
    transcriptionSegments: v.optional(v.array(v.object({
      start: v.number(),
      end: v.number(),
      text: v.string(),
    }))),
    fileStorageId: v.optional(v.id("_storage")),
    format: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    // Verify ownership
    const video = await ctx.db.get(args.videoId);
    if (!video || video.userId !== userId) {
      throw new Error("Video not found or unauthorized");
    }

    // Update video with manual transcription
    await ctx.db.patch(args.videoId, {
      transcription: args.transcription,
      transcriptionStatus: "completed",
      transcriptionError: undefined,
      transcriptionProgress: undefined,
    });

    // Find all agents connected to this video
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();

    // Reset agent drafts to trigger regeneration
    for (const agent of agents) {
      await ctx.db.patch(agent._id, {
        draft: "",
        status: "idle",
      });
    }

    return {
      success: true,
      affectedAgents: agents.length,
    };
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    
    return await ctx.storage.generateUploadUrl();
  },
});