"use node"
import { v } from "convex/values";
import { action } from "../../_generated/server";
import { api } from "../../_generated/api";
import OpenAI from "openai";

export const generateThumbnail = action({
  args: {
    agentType: v.literal("thumbnail"),
    videoId: v.optional(v.id("videos")),
    videoFrames: v.array(
      v.object({
        dataUrl: v.string(),
        timestamp: v.number(),
      })
    ),
    videoData: v.object({
      title: v.optional(v.string()),
      transcription: v.optional(v.string()),
      manualTranscriptions: v.optional(v.array(v.object({
        fileName: v.string(),
        text: v.string(),
        format: v.string(),
      }))),
    }),
    connectedAgentOutputs: v.array(
      v.object({
        type: v.string(),
        content: v.string(),
      })
    ),
    profileData: v.optional(
      v.object({
        channelName: v.string(),
        contentType: v.string(),
        niche: v.string(),
        tone: v.optional(v.string()),
        targetAudience: v.optional(v.string()),
      })
    ),
    additionalContext: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    try {
      console.log("[Thumbnail] Starting thumbnail generation");

      // Get OpenAI API key
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        throw new Error("OpenAI API key not configured");
      }

      const openai = new OpenAI({ apiKey: openaiApiKey });

      // Build the thumbnail prompt
      let thumbnailPrompt = "Create a compelling YouTube thumbnail description that will attract viewers and increase click-through rates.\n\n";

      // If we have a videoId, fetch the latest video data with transcription
      let videoData = args.videoData;
      if (args.videoId) {
        console.log("[Thumbnail] Fetching fresh video data for ID:", args.videoId);
        const freshVideoData = await ctx.runQuery(api.domains.videos.transcriptionMutations.getVideoWithTranscription, {
          videoId: args.videoId,
        });
        if (freshVideoData && freshVideoData.transcription) {
          videoData = {
            ...videoData,
            title: freshVideoData.title || videoData.title,
            transcription: freshVideoData.transcription,
          };
        }
      }

      // Add video context
      if (videoData.title) {
        thumbnailPrompt += `Video Title: ${videoData.title}\n`;
      }

      if (videoData.transcription) {
        thumbnailPrompt += `Video Content Summary: ${videoData.transcription.slice(0, 1000)}...\n`;
      }

      // Add manual transcriptions if available
      if (videoData.manualTranscriptions && videoData.manualTranscriptions.length > 0) {
        thumbnailPrompt += "\nManual Transcriptions:\n";
        videoData.manualTranscriptions.forEach((transcript, index) => {
          thumbnailPrompt += `${index + 1}. ${transcript.fileName} (${transcript.format}): ${transcript.text.slice(0, 500)}...\n`;
        });
      }

      // Add connected agent outputs
      if (args.connectedAgentOutputs.length > 0) {
        thumbnailPrompt += "\nRelated Content:\n";
        args.connectedAgentOutputs.forEach(({ type, content }) => {
          thumbnailPrompt += `${type}: ${content}\n`;
        });
      }

      // Add profile context
      if (args.profileData) {
        thumbnailPrompt += `\nChannel: ${args.profileData.channelName} (${args.profileData.niche})\n`;
        thumbnailPrompt += `Content Type: ${args.profileData.contentType}\n`;
        if (args.profileData.tone) {
          thumbnailPrompt += `Tone: ${args.profileData.tone}\n`;
        }
        if (args.profileData.targetAudience) {
          thumbnailPrompt += `Target Audience: ${args.profileData.targetAudience}\n`;
        }
      }

      // Add additional context
      if (args.additionalContext) {
        thumbnailPrompt += `\nSpecific requirements: ${args.additionalContext}\n`;
      }

      thumbnailPrompt += `
Please create a detailed thumbnail concept that includes:
1. Main visual elements and composition
2. Text overlay suggestions (short, impactful phrases)
3. Color scheme and visual style
4. Key focal points that will grab attention
5. How to make it stand out in YouTube search results

The thumbnail should be eye-catching, clearly communicate the video's value, and follow YouTube best practices for mobile visibility.`;

      console.log("[Thumbnail] Generating thumbnail concept with OpenAI...");

      // Generate thumbnail concept using GPT-4
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert YouTube thumbnail designer. Create detailed, actionable thumbnail concepts that maximize click-through rates while accurately representing the video content."
          },
          {
            role: "user",
            content: thumbnailPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const thumbnailConcept = response.choices[0]?.message?.content;
      if (!thumbnailConcept) {
        throw new Error("Failed to generate thumbnail concept");
      }

      console.log("[Thumbnail] Generated thumbnail concept successfully");
      return thumbnailConcept;

    } catch (error: any) {
      console.error("[Thumbnail] Generation failed:", error);
      throw error;
    }
  },
});