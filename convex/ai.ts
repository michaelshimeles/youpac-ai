import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export const generateContent = action({
  args: {
    agentId: v.id("agents"),
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

    // Get agent details
    const agent = await ctx.runQuery(api.agents.getById, { id: args.agentId });
    if (!agent) throw new Error("Agent not found");

    // Update status to generating
    await ctx.runMutation(api.agents.updateDraft, {
      id: args.agentId,
      draft: agent.draft,
      status: "generating",
    });

    try {
      const prompt = buildPrompt(
        agent.type,
        args.videoData,
        args.connectedAgentOutputs,
        args.profileData
      );

      const { text: generatedContent } = await generateText({
        model: openai("gpt-4o-mini"),
        system: getSystemPrompt(agent.type),
        prompt,
        temperature: 0.7,
        maxTokens: agent.type === "description" ? 500 : 300,
      });

      // Update agent with generated content
      await ctx.runMutation(api.agents.updateDraft, {
        id: args.agentId,
        draft: generatedContent,
        status: "ready",
      });

      return generatedContent;
    } catch (error) {
      // Update status to error
      await ctx.runMutation(api.agents.updateDraft, {
        id: args.agentId,
        draft: agent.draft,
        status: "error",
      });
      throw error;
    }
  },
});

export const refineContent = action({
  args: {
    agentId: v.id("agents"),
    userMessage: v.string(),
    currentDraft: v.string(),
    videoData: v.optional(v.object({
      title: v.optional(v.string()),
      transcription: v.optional(v.string()),
    })),
    connectedAgentOutputs: v.optional(v.array(
      v.object({
        type: v.string(),
        content: v.string(),
      })
    )),
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

    const agent = await ctx.runQuery(api.agents.getById, { id: args.agentId });
    if (!agent) throw new Error("Agent not found");

    // Add user message to chat history
    await ctx.runMutation(api.agents.addChatMessage, {
      id: args.agentId,
      role: "user",
      message: args.userMessage,
    });

    try {
      // Build context with all available information
      let contextMessage = `Current draft: ${args.currentDraft}\n\n`;
      
      if (args.videoData) {
        contextMessage += "Video Context:\n";
        if (args.videoData.title) {
          contextMessage += `Title: ${args.videoData.title}\n`;
        }
        if (args.videoData.transcription) {
          contextMessage += `Transcription: ${args.videoData.transcription.slice(0, 1000)}...\n`;
        }
        contextMessage += "\n";
      }
      
      if (args.connectedAgentOutputs && args.connectedAgentOutputs.length > 0) {
        contextMessage += "Connected Agent Outputs:\n";
        args.connectedAgentOutputs.forEach(({ type, content }) => {
          contextMessage += `${type}: ${content}\n`;
        });
        contextMessage += "\n";
      }
      
      if (args.profileData) {
        contextMessage += "Channel Profile:\n";
        contextMessage += `Channel: ${args.profileData.channelName} (${args.profileData.niche})\n`;
        contextMessage += `Content Type: ${args.profileData.contentType}\n`;
        if (args.profileData.tone) {
          contextMessage += `Tone: ${args.profileData.tone}\n`;
        }
        if (args.profileData.targetAudience) {
          contextMessage += `Target Audience: ${args.profileData.targetAudience}\n`;
        }
      }

      const { text: refinedContent } = await generateText({
        model: openai("gpt-4o-mini"),
        system: getSystemPrompt(agent.type),
        messages: [
          {
            role: "assistant",
            content: contextMessage,
          },
          {
            role: "user",
            content: args.userMessage,
          },
        ],
        temperature: 0.7,
        maxTokens: agent.type === "description" ? 500 : 300,
      });

      // Update agent with refined content
      await ctx.runMutation(api.agents.updateDraft, {
        id: args.agentId,
        draft: refinedContent,
        status: "ready",
      });

      // Add AI response to chat history
      await ctx.runMutation(api.agents.addChatMessage, {
        id: args.agentId,
        role: "ai",
        message: refinedContent,
      });

      return refinedContent;
    } catch (error) {
      console.error("Error refining content:", error);
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