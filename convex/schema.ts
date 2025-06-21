import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),

  videos: defineTable({
    userId: v.string(),
    title: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    fileId: v.optional(v.string()),
    transcription: v.optional(v.string()),
    canvasPosition: v.object({
      x: v.number(),
      y: v.number(),
    }),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_created", ["createdAt"]),

  agents: defineTable({
    videoId: v.id("videos"),
    userId: v.string(),
    type: v.union(
      v.literal("title"),
      v.literal("description"),
      v.literal("thumbnail"),
      v.literal("tweets")
    ),
    draft: v.string(),
    connections: v.array(v.string()),
    chatHistory: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("ai")),
        message: v.string(),
        timestamp: v.number(),
      })
    ),
    canvasPosition: v.object({
      x: v.number(),
      y: v.number(),
    }),
    status: v.union(
      v.literal("idle"),
      v.literal("generating"),
      v.literal("ready"),
      v.literal("error")
    ),
    createdAt: v.number(),
  })
    .index("by_video", ["videoId"])
    .index("by_user", ["userId"])
    .index("by_type", ["type"]),

  profiles: defineTable({
    userId: v.string(),
    channelName: v.string(),
    contentType: v.string(),
    niche: v.string(),
    links: v.array(v.string()),
    tone: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  canvasStates: defineTable({
    userId: v.string(),
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
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),
});
