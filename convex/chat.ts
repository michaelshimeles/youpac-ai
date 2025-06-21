import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export const refineContent = action({
  args: {
    agentId: v.id("agents"),
    userMessage: v.string(),
    currentDraft: v.string(),
    agentType: v.union(
      v.literal("title"),
      v.literal("description"),
      v.literal("thumbnail"),
      v.literal("tweets")
    ),
    chatHistory: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("ai")),
        content: v.string(),
      })
    ),
    videoData: v.optional(
      v.object({
        title: v.optional(v.string()),
        transcription: v.optional(v.string()),
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
  handler: async (ctx, args): Promise<{ response: string; updatedDraft: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    try {
      // Build the system prompt based on agent type
      const systemPrompt = getRefineSystemPrompt(args.agentType);
      
      // Build the conversation context with proper types
      let prompt = systemPrompt + "\n\n";
      prompt += `Current ${args.agentType}: ${args.currentDraft}\n\n`;
      
      // Add chat history
      if (args.chatHistory.length > 0) {
        prompt += "Previous conversation:\n";
        args.chatHistory.forEach((msg) => {
          prompt += `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}\n`;
        });
        prompt += "\n";
      }
      
      // Add context about the video if available
      if (args.videoData?.transcription) {
        prompt += `Video context: ${args.videoData.transcription.slice(0, 1000)}...\n\n`;
      }
      
      // Add the current user message
      prompt += `User: ${args.userMessage}\n\nPlease provide your response following the format specified in the system prompt.`;

      // Generate refined content
      const { text: response } = await generateText({
        model: openai("gpt-4o-mini"),
        system: systemPrompt,
        prompt,
        temperature: 0.7,
        maxTokens: 500,
      });

      // Extract the updated draft from the response
      // The AI should return both a conversational response and the updated content
      const updatedDraft = extractUpdatedDraft(response, args.agentType, args.currentDraft);

      // Save the chat messages to the agent
      await ctx.runMutation(api.agents.addChatMessage, {
        id: args.agentId,
        role: "user",
        message: args.userMessage,
      });
      
      await ctx.runMutation(api.agents.addChatMessage, {
        id: args.agentId,
        role: "ai",
        message: response,
      });
      
      // Update the agent's draft if it changed
      if (updatedDraft !== args.currentDraft) {
        await ctx.runMutation(api.agents.updateDraft, {
          id: args.agentId,
          draft: updatedDraft,
          status: "ready",
        });
      }

      return { response, updatedDraft };
    } catch (error) {
      console.error("Error refining content:", error);
      throw error;
    }
  },
});

function getRefineSystemPrompt(agentType: string): string {
  const basePrompt = `You are an AI assistant helping to refine ${agentType} content for YouTube videos. 
When the user asks for changes, provide:
1. A friendly response acknowledging their request
2. The updated ${agentType} that incorporates their feedback

Format your response as:
[Your conversational response]

UPDATED ${agentType.toUpperCase()}:
[The refined content]

Important guidelines:`;

  const typeSpecificGuidelines = {
    title: `
- Keep titles under 60 characters
- Make them engaging and clickable
- Include relevant keywords
- Avoid clickbait but create curiosity`,
    
    description: `
- Include relevant keywords naturally
- Structure with clear sections
- Add timestamps if mentioned
- Include calls-to-action
- Optimize for SEO`,
    
    thumbnail: `
- Describe visual elements clearly
- Suggest compelling text overlays
- Recommend color schemes
- Focus on eye-catching composition
- Consider mobile visibility`,
    
    tweets: `
- Keep within Twitter/X character limits
- Make each tweet valuable standalone
- Include relevant hashtags
- Create engaging hooks
- Encourage retweets and engagement`,
  };

  return basePrompt + (typeSpecificGuidelines[agentType as keyof typeof typeSpecificGuidelines] || "");
}

function extractUpdatedDraft(response: string, agentType: string, currentDraft: string): string {
  // Look for the updated content section in the response
  const marker = `UPDATED ${agentType.toUpperCase()}:`;
  const markerIndex = response.indexOf(marker);
  
  if (markerIndex !== -1) {
    const updatedContent = response.substring(markerIndex + marker.length).trim();
    return updatedContent;
  }
  
  // If no explicit update marker, return the current draft
  return currentDraft;
}