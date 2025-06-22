import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI, { toFile } from "openai";

export const refineThumbnail = action({
  args: {
    agentId: v.id("agents"),
    currentThumbnailUrl: v.string(),
    userMessage: v.string(),
    videoId: v.optional(v.id("videos")),
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
  handler: async (ctx, args): Promise<{ 
    concept: string; 
    imageUrl: string; 
    prompt?: string;
    storageId?: string;
  }> => {
    console.log("[Thumbnail Refine] Starting thumbnail refinement");
    console.log("[Thumbnail Refine] User message:", args.userMessage);
    console.log("[Thumbnail Refine] Current thumbnail URL:", args.currentThumbnailUrl);
    
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const openai = new OpenAI({ apiKey });

    try {
      // Get video data if available
      let videoData: any = {};
      if (args.videoId) {
        const freshVideoData = await ctx.runQuery(api.videos.getWithTranscription, {
          id: args.videoId,
        });
        if (freshVideoData) {
          videoData = freshVideoData;
        }
      }

      // First, analyze the current thumbnail with GPT-4 Vision
      console.log("[Thumbnail Refine] Analyzing current thumbnail...");
      
      const analysisMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: "You are an expert YouTube thumbnail designer. Analyze the current thumbnail and understand what needs to be changed based on the user's feedback.",
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: `Current thumbnail analysis needed. User feedback: "${args.userMessage}"\n\nAnalyze this thumbnail and describe:\n1. What text overlay is currently shown\n2. The main visual elements\n3. The color scheme and style\n4. What specific changes are needed based on the user's feedback` 
            },
            {
              type: "image_url" as const,
              image_url: {
                url: args.currentThumbnailUrl,
                detail: "high" as const,
              },
            },
          ],
        },
      ];
      
      const analysisResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: analysisMessages,
        max_tokens: 500,
      });
      
      const currentAnalysis = analysisResponse.choices[0].message.content || "";
      console.log("[Thumbnail Refine] Current thumbnail analysis:", currentAnalysis);

      // Download the current thumbnail to use as base
      console.log("[Thumbnail Refine] Downloading current thumbnail...");
      let imageFile;
      
      try {
        const imageResponse = await fetch(args.currentThumbnailUrl);
        if (!imageResponse.ok) {
          throw new Error("Failed to download current thumbnail");
        }
        
        const imageBlob = await imageResponse.blob();
        console.log("[Thumbnail Refine] Image blob size:", imageBlob.size);
        
        // If image is too large, we might need to resize it
        if (imageBlob.size > 4 * 1024 * 1024) { // 4MB limit
          console.warn("[Thumbnail Refine] Image is large, may cause issues");
        }
        
        // Create file directly from blob
        imageFile = await toFile(imageBlob, 'current-thumbnail.png', {
          type: imageBlob.type || 'image/png',
        });
      } catch (downloadError) {
        console.error("[Thumbnail Refine] Error downloading image:", downloadError);
        throw new Error("Failed to process current thumbnail. Please try generating a new thumbnail instead.");
      }

      // Build refinement prompt
      let refinementPrompt = "Edit this YouTube thumbnail based on user feedback:\n\n";
      
      refinementPrompt += `USER FEEDBACK: ${args.userMessage}\n\n`;
      refinementPrompt += `CURRENT THUMBNAIL ANALYSIS:\n${currentAnalysis}\n\n`;
      
      if (videoData.title) {
        refinementPrompt += `VIDEO TITLE: ${videoData.title}\n\n`;
      }
      
      refinementPrompt += "REQUIREMENTS:\n";
      refinementPrompt += "- Apply the user's requested changes while keeping what works\n";
      refinementPrompt += "- Maintain YouTube thumbnail best practices\n";
      refinementPrompt += "- Keep text large, bold, and readable\n";
      refinementPrompt += "- Ensure high contrast and vibrant colors\n";
      
      if (args.profileData) {
        refinementPrompt += `\nCHANNEL STYLE: ${args.profileData.channelName} - ${args.profileData.niche}\n`;
      }

      console.log("[Thumbnail Refine] Refinement prompt:", refinementPrompt.substring(0, 200) + "...");

      // Use images.edit to refine the thumbnail
      console.log("[Thumbnail Refine] Generating refined thumbnail...");
      let imageEditResponse;
      
      try {
        imageEditResponse = await openai.images.edit({
          model: "gpt-image-1",
          image: imageFile,
          prompt: refinementPrompt,
          size: "1536x1024",
        });
      } catch (apiError: any) {
        console.error("[Thumbnail Refine] OpenAI API error:", apiError);
        console.log("[Thumbnail Refine] Falling back to generation instead of edit");
        
        // Fallback: Generate a new image based on the analysis and user feedback
        const fallbackPrompt = `Create a YouTube thumbnail that incorporates these changes:\n\n${refinementPrompt}\n\nBased on analysis of previous thumbnail:\n${currentAnalysis}`;
        
        imageEditResponse = await openai.images.generate({
          model: "dall-e-3",
          prompt: fallbackPrompt,
          size: "1792x1024",
          quality: "hd",
          n: 1,
          style: "vivid",
        });
      }

      // Handle the response
      const imageData = imageEditResponse.data?.[0];
      if (!imageData) {
        throw new Error("No image data returned from refinement");
      }

      let finalImageUrl: string;
      let storageId: string;

      if (imageData.b64_json) {
        // Handle base64 response
        console.log("[Thumbnail Refine] Processing base64 image...");
        const base64Data = imageData.b64_json;
        
        // Convert base64 to blob
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const refinedImageBlob = new Blob([bytes], { type: 'image/png' });
        
        // Store in Convex
        storageId = await ctx.storage.store(refinedImageBlob);
        const url = await ctx.storage.getUrl(storageId);
        if (!url) {
          throw new Error("Failed to get URL for stored refined image");
        }
        finalImageUrl = url;
      } else if (imageData.url) {
        // Handle URL response
        console.log("[Thumbnail Refine] Downloading refined image from URL...");
        const downloadResponse = await fetch(imageData.url);
        if (!downloadResponse.ok) {
          throw new Error("Failed to download refined image");
        }
        
        const refinedBlob = await downloadResponse.blob();
        storageId = await ctx.storage.store(refinedBlob);
        const url = await ctx.storage.getUrl(storageId);
        if (!url) {
          throw new Error("Failed to get URL for stored refined image");
        }
        finalImageUrl = url;
      } else {
        throw new Error("No image URL or base64 data in refinement response");
      }

      console.log("[Thumbnail Refine] Refinement completed successfully");

      // Create concept description
      const concept = `Refined thumbnail based on user feedback: "${args.userMessage}"\n\nChanges applied:\n${currentAnalysis}`;

      return {
        concept,
        imageUrl: finalImageUrl,
        prompt: refinementPrompt,
        storageId,
      };
    } catch (error: any) {
      console.error("[Thumbnail Refine] Error:", error);
      throw error;
    }
  },
});