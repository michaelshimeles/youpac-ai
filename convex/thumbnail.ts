import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
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
  handler: async (ctx, args): Promise<{ concept: string; imageUrl: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get OpenAI API key from Convex environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const openai = new OpenAI({ apiKey });

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
        }
      }

      // Step 1: Analyze video frames with GPT-4 Vision to understand visual content
      const frameAnalysisPrompt = buildFrameAnalysisPrompt(
        videoData,
        args.connectedAgentOutputs,
        args.profileData
      );

      const visionMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: "You are an expert YouTube thumbnail designer and video analyst. Analyze the provided video frames and context to create a compelling thumbnail concept.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: frameAnalysisPrompt },
            ...args.videoFrames.map((frame) => ({
              type: "image_url" as const,
              image_url: {
                url: frame.dataUrl,
                detail: "low" as const,
              },
            })),
          ],
        },
      ];

      const visionResponse = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: visionMessages,
        max_tokens: 500,
        temperature: 0.7,
      });

      const thumbnailConcept = visionResponse.choices[0].message.content || "";

      // Step 2: Generate thumbnail image with DALL-E 3
      const imagePrompt = buildDallePrompt(thumbnailConcept, args.profileData);

      const imageResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1792x1024", // 16:9 aspect ratio for YouTube
        quality: "hd",
        style: "vivid",
      });

      const imageUrl = imageResponse.data?.[0]?.url;
      if (!imageUrl) throw new Error("Failed to generate thumbnail image");

      return {
        concept: thumbnailConcept,
        imageUrl,
      };
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      throw error;
    }
  },
});

function buildFrameAnalysisPrompt(
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
  let prompt = "Analyze these video frames and create a YouTube thumbnail concept.\n\n";

  if (videoData.title) {
    prompt += `Video Title: ${videoData.title}\n`;
  }

  if (videoData.transcription) {
    const transcriptionPreview = videoData.transcription.length > 1000
      ? videoData.transcription.slice(0, 1000) + "..."
      : videoData.transcription;
    prompt += `\nVideo Content Summary (from transcription):\n${transcriptionPreview}\n`;
  }

  if (connectedOutputs.length > 0) {
    prompt += "\nRelated content:\n";
    connectedOutputs.forEach(({ type, content }) => {
      if (type === "title") {
        prompt += `Generated Title: ${content}\n`;
      }
    });
  }

  if (profileData) {
    prompt += "\nChannel Style:\n";
    prompt += `- ${profileData.channelName} (${profileData.niche})\n`;
    prompt += `- Content Type: ${profileData.contentType}\n`;
    if (profileData.tone) {
      prompt += `- Tone: ${profileData.tone}\n`;
    }
  }

  prompt += `
\nBased on the video frames and context, create a thumbnail concept that:
1. Accurately represents the video content
2. Uses visual elements from the frames
3. Suggests compelling text overlay (if needed)
4. Recommends color scheme and composition
5. Captures attention while staying true to the content

Provide a detailed description of the thumbnail design, including:
- Main visual elements to highlight
- Text overlay suggestions (keep it short and impactful)
- Color palette
- Composition and layout
- Any effects or styling recommendations`;

  return prompt;
}

function buildDallePrompt(concept: string, profileData?: any): string {
  let prompt = "Create a YouTube thumbnail image: ";
  
  // Add the concept from GPT-4 Vision analysis
  prompt += concept;
  
  // Add style guidelines
  prompt += "\n\nStyle requirements:";
  prompt += "\n- High contrast and vibrant colors";
  prompt += "\n- Professional YouTube thumbnail style";
  prompt += "\n- Clear, readable text if included";
  prompt += "\n- Eye-catching and clickable design";
  prompt += "\n- 16:9 aspect ratio optimized for YouTube";
  
  if (profileData?.tone) {
    prompt += `\n- Match the ${profileData.tone} tone of the channel`;
  }
  
  return prompt;
}