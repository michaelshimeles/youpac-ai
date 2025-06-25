import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI, { toFile } from "openai";

export const generateThumbnailWithGPTImage = action({
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
    additionalContext: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ concept: string; imageUrl: string; prompt?: string; storageId?: string }> => {
    console.log("[GPT-Image Thumbnail] Starting thumbnail generation process");
    
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const openai = new OpenAI({ apiKey });

    try {
      // Get fresh video data if videoId is provided
      let videoData = args.videoData;
      if (args.videoId) {
        const freshVideoData = await ctx.runQuery(api.videos.getWithTranscription, {
          videoId: args.videoId,
        });
        if (freshVideoData && freshVideoData.transcription) {
          videoData = {
            title: freshVideoData.title || args.videoData.title,
            transcription: freshVideoData.transcription,
          };
        }
      }

      if (!args.videoFrames || args.videoFrames.length === 0) {
        throw new Error("No video frames provided for thumbnail generation.");
      }

      // Build prompt for thumbnail generation
      let prompt = "Generate a photorealistic image of a YouTube thumbnail on a white background ";
      
      if (videoData.title) {
        prompt += `for a video titled '${videoData.title}' `;
      }
      
      // Add channel branding if available
      if (args.profileData) {
        prompt += `in the style of ${args.profileData.channelName} (${args.profileData.niche} channel) `;
      }
      
      // Add text overlay suggestions from connected agents
      let textOverlay = "";
      args.connectedAgentOutputs.forEach(({ type, content }) => {
        if (type === "title" && content.length < 30) {
          textOverlay = content;
        }
      });
      
      if (textOverlay) {
        prompt += `with bold text overlay saying '${textOverlay}' `;
      }
      
      prompt += "containing all the visual elements from the reference pictures. ";
      prompt += "Make it eye-catching with vibrant colors and high contrast.";
      
      // Limit prompt length
      if (prompt.length > 1000) {
        prompt = prompt.substring(0, 1000);
      }
      
      console.log("[GPT-Image Thumbnail] Generated prompt:", prompt);
      
      // Process all frames into files
      const imageFiles = await Promise.all(
        args.videoFrames.slice(0, 4).map(async (frame, index) => {
          const base64Data = frame.dataUrl.split(',')[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const imageBlob = new Blob([bytes], { type: 'image/png' });
          return toFile(imageBlob, `frame-${index}.png`, {
            type: 'image/png',
          });
        })
      );
      
      console.log(`[GPT-Image Thumbnail] Processing ${imageFiles.length} images`);
      
      // Use the first image as the base for editing
      const response = await openai.images.edit({
        model: "gpt-image-1",
        image: imageFiles[0],
        prompt,
        size: "1024x1024",
      });

      console.log("[GPT-Image Thumbnail] Response received");
      
      // Get the generated image data
      const imageData = response.data?.[0];
      if (!imageData) {
        throw new Error("No image data returned from generation");
      }
      
      console.log("imageData:", imageData);
      let permanentUrl: string;
      let storageId: string;
      
      if (imageData.b64_json) {
        // Handle base64 response
        console.log("[GPT-Image Thumbnail] Processing base64 image...");
        const base64Data = imageData.b64_json;
        
        // Convert base64 to blob
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const imageBlob = new Blob([bytes], { type: 'image/png' });
        
        // Store in Convex
        storageId = await ctx.storage.store(imageBlob);
        permanentUrl = await ctx.storage.getUrl(storageId) || "";
      } else if (imageData.url) {
        // Handle URL response
        console.log("[GPT-Image Thumbnail] Downloading image from URL...");
        const imageResponse = await fetch(imageData.url);
        if (!imageResponse.ok) {
          throw new Error("Failed to download generated image");
        }
        
        const imageBlob = await imageResponse.blob();
        storageId = await ctx.storage.store(imageBlob);
        permanentUrl = await ctx.storage.getUrl(storageId) || "";
      } else {
        throw new Error("No image URL or base64 data in response");
      }
      
      if (!permanentUrl) {
        throw new Error("Failed to get permanent URL for stored image");
      }
      
      console.log("[GPT-Image Thumbnail] Image stored successfully");
      
      const concept = `Generated YouTube thumbnail using gpt-image-1 model.\nText overlay: "${textOverlay || 'None'}"`;
      
      return {
        concept,
        imageUrl: permanentUrl,
        prompt,
        storageId,
      };
    } catch (error: any) {
      console.error("[GPT-Image Thumbnail] Error:", error);
      throw error;
    }
  },
});