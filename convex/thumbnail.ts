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
    console.log("[Thumbnail] Starting thumbnail generation process");
    console.log("[Thumbnail] Args received:", {
      agentType: args.agentType,
      videoId: args.videoId,
      frameCount: args.videoFrames.length,
      hasTranscription: !!args.videoData.transcription,
      hasProfile: !!args.profileData,
      connectedAgentsCount: args.connectedAgentOutputs.length
    });
    
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get OpenAI API key from Convex environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[Thumbnail] OpenAI API key not configured");
      throw new Error("OpenAI API key not configured");
    }

    const openai = new OpenAI({ apiKey });

    try {
      // If we have a videoId, fetch the latest video data with transcription
      let videoData = args.videoData;
      if (args.videoId) {
        console.log("[Thumbnail] Fetching fresh video data for ID:", args.videoId);
        const freshVideoData = await ctx.runQuery(api.videos.getWithTranscription, {
          id: args.videoId,
        });
        console.log("[Thumbnail] Fresh video data fetched:", {
          hasTitle: !!freshVideoData?.title,
          hasTranscription: !!freshVideoData?.transcription,
          transcriptionLength: freshVideoData?.transcription?.length || 0
        });
        if (freshVideoData && freshVideoData.transcription) {
          videoData = {
            title: freshVideoData.title || args.videoData.title,
            transcription: freshVideoData.transcription,
          };
        }
      }

      // Step 1: Analyze video frames with GPT-4 Vision to understand visual content
      console.log("[Thumbnail] Step 1: Building frame analysis prompt");
      const frameAnalysisPrompt = buildFrameAnalysisPrompt(
        videoData,
        args.connectedAgentOutputs,
        args.profileData
      );
      console.log("[Thumbnail] Frame analysis prompt length:", frameAnalysisPrompt.length);

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

      console.log("[Thumbnail] Calling GPT-4o to analyze frames...");
      console.log("[Thumbnail] Vision messages count:", visionMessages.length);
      console.log("[Thumbnail] Number of frames being analyzed:", args.videoFrames.length);
      
      const visionResponse = await openai.chat.completions.create({
        model: "gpt-4o", // Updated model that supports vision
        messages: visionMessages,
        max_tokens: 500,
        temperature: 0.7,
      });

      const thumbnailConcept = visionResponse.choices[0].message.content || "";
      console.log("[Thumbnail] GPT-4o response received");
      console.log("[Thumbnail] Thumbnail concept:", thumbnailConcept.substring(0, 200) + "...");

      // Step 2: Generate thumbnail image with DALL-E 3
      console.log("[Thumbnail] Step 2: Building DALL-E prompt");
      const imagePrompt = buildDallePrompt(thumbnailConcept, args.profileData);
      console.log("[Thumbnail] DALL-E prompt:", imagePrompt.substring(0, 300) + "...");
      console.log("[Thumbnail] DALL-E prompt length:", imagePrompt.length);

      console.log("[Thumbnail] Calling gpt-image-1 to generate image...");
      const imageResponse = await openai.images.generate({
        model: "gpt-image-1",
        prompt: imagePrompt,
      });

      console.log("[Thumbnail] gpt-image-1 response:", imageResponse);

      console.log("[Thumbnail] gpt-image-1 response received");
      
      // Handle both URL and base64 responses
      let imageUrl: string;
      const imageData = imageResponse.data?.[0];
      
      if (imageData?.url) {
        imageUrl = imageData.url;
        console.log("[Thumbnail] Got image URL from response");
      } else if (imageData?.b64_json) {
        console.log("[Thumbnail] Got base64 image, uploading to storage...");
        
        // Convert base64 to blob
        const base64Data = imageData.b64_json;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });
        
        // Upload to Convex storage
        const uploadUrl = await ctx.runMutation(api.files.generateUploadUrl);
        console.log("[Thumbnail] Got upload URL, uploading image...");
        
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "image/png" },
          body: blob,
        });
        
        if (!uploadResponse.ok) {
          throw new Error("Failed to upload thumbnail image to storage");
        }
        
        const { storageId } = await uploadResponse.json();
        console.log("[Thumbnail] Image uploaded to storage:", storageId);
        
        // Get the URL from storage
        const storageUrl = await ctx.runQuery(api.files.getUrl, { storageId });
        if (!storageUrl) {
          throw new Error("Failed to get storage URL for thumbnail");
        }
        
        imageUrl = storageUrl;
        console.log("[Thumbnail] Got storage URL for thumbnail");
      } else {
        console.error("[Thumbnail] No image URL or base64 in response:", imageResponse);
        throw new Error("Failed to generate thumbnail image - no URL or base64 data");
      }
      
      console.log("[Thumbnail] Image generated successfully");
      console.log("[Thumbnail] Final image URL:", imageUrl.substring(0, 100) + "...");

      return {
        concept: thumbnailConcept,
        imageUrl,
      };
    } catch (error: any) {
      console.error("[Thumbnail] Error generating thumbnail:", error);
      console.error("[Thumbnail] Error type:", error.constructor.name);
      console.error("[Thumbnail] Error message:", error.message);
      console.error("[Thumbnail] Error stack:", error.stack);
      
      if (error.response) {
        console.error("[Thumbnail] API response error:", error.response.data);
      }
      
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