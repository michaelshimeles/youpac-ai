import { v } from "convex/values";
import { action } from "./_generated/server";
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
    videoData: v.object({
      title: v.optional(v.string()),
      transcription: v.optional(v.string()),
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
      const prompt = buildPrompt(
        args.agentType,
        args.videoData,
        args.connectedAgentOutputs,
        args.profileData
      );

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
    title: "You are an expert YouTube title creator. Create engaging, SEO-friendly titles that maximize click-through rates while accurately representing the video content. Keep titles under 60 characters when possible.",
    description: "You are an expert YouTube description writer. Create comprehensive, SEO-optimized descriptions that include relevant keywords, provide value to viewers, and encourage engagement. Include timestamps if applicable.",
    thumbnail: "You are an expert YouTube thumbnail designer. Describe compelling thumbnail concepts that grab attention, clearly communicate the video's value, and follow YouTube best practices. Focus on visual elements, text overlay suggestions, and color schemes.",
    tweets: "You are an expert social media marketer. Create engaging Twitter/X threads that promote YouTube videos. Write concise, engaging tweets that drive traffic to the video while providing value to the Twitter audience.",
  };

  return prompts[agentType as keyof typeof prompts] || prompts.title;
}

function buildPrompt(
  agentType: string,
  videoData: { title?: string; transcription?: string },
  connectedOutputs: Array<{ type: string; content: string }>,
  profileData?: {
    channelName: string;
    contentType: string;
    niche: string;
    tone?: string;
    targetAudience?: string;
  }
): string {
  let prompt = `Generate ${agentType} content for a YouTube video.\n\n`;

  // Add video data
  if (videoData.title) {
    prompt += `Video Title: ${videoData.title}\n`;
  }
  if (videoData.transcription) {
    prompt += `Video Transcription: ${videoData.transcription.slice(0, 1000)}...\n\n`;
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