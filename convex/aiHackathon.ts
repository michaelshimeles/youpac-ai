import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

// Simplified AI generation for hackathon - no database dependencies
export const generateContentSimple = action({
  args: {
    agentType: v.union(
      v.literal("title"),
      v.literal("description"),
      v.literal("thumbnail"),
      v.literal("tweets")
    ),
    videoId: v.optional(v.id("videos")),
    videoData: v.object({
      title: v.optional(v.string()),
      transcription: v.optional(v.string()),
      duration: v.optional(v.number()),
      resolution: v.optional(v.object({
        width: v.number(),
        height: v.number(),
      })),
      format: v.optional(v.string()),
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
  },
  handler: async (ctx, args): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    try {
      // If we have a videoId, fetch the latest video data with transcription
      let videoData = args.videoData;
      if (args.videoId) {
        const freshVideoData = await ctx.runQuery(api.videos.getWithTranscription, {
          id: args.videoId,
        });
        if (freshVideoData && freshVideoData.transcription) {
          videoData = {
            title: freshVideoData.title || args.videoData.title,
            transcription: freshVideoData.transcription,
          };
          console.log(`Using transcription for ${args.agentType} generation (${freshVideoData.transcription.length} chars)`);
        }
      }
      const prompt = buildPrompt(
        args.agentType,
        videoData, // Use the fresh video data
        args.connectedAgentOutputs,
        args.profileData
      );

      // Log if generating without transcription
      if (!videoData.transcription) {
        console.log(`Generating ${args.agentType} without transcription - using title only`);
      }

      const { text: generatedContent } = await generateText({
        model: openai("gpt-4o-mini"),
        system: getSystemPrompt(args.agentType),
        prompt,
        temperature: 0.7,
        maxTokens: args.agentType === "description" ? 500 : 300,
      });

      return generatedContent;
    } catch (error) {
      console.error("Error generating content:", error);
      throw error;
    }
  },
});

function getSystemPrompt(agentType: string): string {
  const prompts = {
    title: "You are an expert YouTube title creator. Create ONE engaging, SEO-friendly title that DIRECTLY relates to the video transcription provided. The title must accurately represent what is discussed in the video. Keep it under 60 characters. Do NOT create generic titles - make it specific to the actual content.",
    description: "You are an expert YouTube description writer. Create a comprehensive, SEO-optimized description based on the actual video transcription. Include relevant keywords from the video content, provide value to viewers, and encourage engagement. Include timestamps if you can identify different sections from the transcription.",
    thumbnail: "You are an expert YouTube thumbnail designer. Based on the video transcription, describe a compelling thumbnail concept that accurately represents the video content. Focus on visual elements that relate to what's discussed in the video, suggest text overlays based on key points, and recommend color schemes that match the video's topic.",
    tweets: "You are an expert social media marketer. Create engaging Twitter/X posts that promote this specific YouTube video based on its transcription. Write concise tweets that highlight the actual key points discussed in the video to drive traffic while providing value.",
  };

  return prompts[agentType as keyof typeof prompts] || prompts.title;
}

function buildPrompt(
  agentType: string,
  videoData: { 
    title?: string; 
    transcription?: string;
    duration?: number;
    resolution?: { width: number; height: number };
    format?: string;
  },
  connectedOutputs: Array<{ type: string; content: string }>,
  profileData?: {
    channelName: string;
    contentType: string;
    niche: string;
    tone?: string;
    targetAudience?: string;
  }
): string {
  let prompt = "";

  // Add video metadata if available
  if (videoData.duration || videoData.resolution) {
    prompt += "Video Technical Details:\n";
    if (videoData.duration) {
      const minutes = Math.floor(videoData.duration / 60);
      const seconds = Math.floor(videoData.duration % 60);
      prompt += `- Duration: ${minutes}:${seconds.toString().padStart(2, '0')}\n`;
    }
    if (videoData.resolution) {
      prompt += `- Resolution: ${videoData.resolution.width}x${videoData.resolution.height}`;
      if (videoData.resolution.height >= 2160) prompt += " (4K)";
      else if (videoData.resolution.height >= 1080) prompt += " (HD)";
      prompt += "\n";
    }
    if (videoData.format) {
      prompt += `- Format: ${videoData.format}\n`;
    }
    prompt += "\n";
  }

  // Emphasize transcription-based generation
  if (videoData.transcription) {
    prompt += `IMPORTANT: Generate ${agentType} content based on this actual video transcription. Make sure your output directly relates to what's discussed in the video.\n\n`;
    
    // Include more of the transcription for better context (up to 3000 chars)
    const transcriptionPreview = videoData.transcription.length > 3000 
      ? videoData.transcription.slice(0, 3000) + "..."
      : videoData.transcription;
    prompt += `VIDEO TRANSCRIPTION:\n${transcriptionPreview}\n\n`;
    
    if (videoData.title) {
      prompt += `Current Video Title: ${videoData.title}\n\n`;
    }
  } else {
    prompt += `Generate ${agentType} content for a YouTube video.\n\n`;
    if (videoData.title) {
      prompt += `Video Title: ${videoData.title}\n`;
    }
    prompt += `Note: No transcription available. Please generate content based on the title and any connected content.\n\n`;
  }

  // Add connected agent outputs
  if (connectedOutputs.length > 0) {
    prompt += "Related content from other agents:\n";
    connectedOutputs.forEach(({ type, content }) => {
      prompt += `${type}: ${content}\n`;
    });
    prompt += "\n";
  }

  // Add profile data
  if (profileData) {
    prompt += "Channel Information:\n";
    prompt += `Channel Name: ${profileData.channelName}\n`;
    prompt += `Content Type: ${profileData.contentType}\n`;
    prompt += `Niche: ${profileData.niche}\n`;
    if (profileData.tone) {
      prompt += `Tone: ${profileData.tone}\n`;
    }
    if (profileData.targetAudience) {
      prompt += `Target Audience: ${profileData.targetAudience}\n`;
    }
  }

  return prompt;
}