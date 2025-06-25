import { query } from "./_generated/server";

export const getAllTranscriptions = query({
  handler: async (ctx) => {
    const transcriptions = await ctx.db.query("transcriptions").collect();
    return transcriptions;
  },
});

export const getTranscriptionsByUser = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;
    
    const transcriptions = await ctx.db
      .query("transcriptions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
      
    return {
      userId,
      count: transcriptions.length,
      transcriptions,
    };
  },
});