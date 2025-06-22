import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI, { toFile } from "openai";

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
      throw new Error("Thumbnail generation service is not configured. Please contact support.");
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

      // Validate inputs
      if (!args.videoFrames || args.videoFrames.length === 0) {
        throw new Error("No video frames provided for thumbnail generation.");
      }
      
      // Validate that we have at least one image
      if (!args.videoFrames || args.videoFrames.length === 0) {
        throw new Error("No images provided for thumbnail generation.");
      }

      // Build a comprehensive prompt for thumbnail generation
      console.log("[Thumbnail] Building thumbnail generation prompt");
      
      let thumbnailPrompt = "Create an eye-catching YouTube thumbnail with the following requirements:\n\n";
      
      if (videoData.title) {
        thumbnailPrompt += `Video Title: ${videoData.title}\n`;
      }
      
      if (videoData.transcription) {
        const summary = videoData.transcription.slice(0, 500);
        thumbnailPrompt += `\nVideo Content Summary: ${summary}...\n`;
      }
      
      if (args.connectedAgentOutputs.length > 0) {
        thumbnailPrompt += "\nRelated content:\n";
        args.connectedAgentOutputs.forEach(({ type, content }) => {
          if (type === "title") {
            thumbnailPrompt += `- Title suggestion: ${content}\n`;
          }
        });
      }
      
      if (args.profileData) {
        thumbnailPrompt += `\nChannel Style:\n`;
        thumbnailPrompt += `- ${args.profileData.channelName} (${args.profileData.niche})\n`;
        thumbnailPrompt += `- Content Type: ${args.profileData.contentType}\n`;
        if (args.profileData.tone) {
          thumbnailPrompt += `- Tone: ${args.profileData.tone}\n`;
        }
      }
      
      if (args.additionalContext) {
        thumbnailPrompt += `\nSpecific requirements: ${args.additionalContext}\n`;
      }
      
      thumbnailPrompt += `\nDesign Requirements:\n`;
      thumbnailPrompt += `1. High contrast and vibrant colors\n`;
      thumbnailPrompt += `2. Clear, readable text overlay (3-5 words max)\n`;
      thumbnailPrompt += `3. Emotional facial expressions if applicable\n`;
      thumbnailPrompt += `4. 16:9 aspect ratio optimized for YouTube\n`;
      thumbnailPrompt += `5. Professional quality that stands out in search results\n`;
      
      console.log("[Thumbnail] Prompt created, length:", thumbnailPrompt.length);
      
      // First, analyze the uploaded images with GPT-4 Vision
      console.log("[Thumbnail] Analyzing uploaded images with GPT-4 Vision...");
      console.log("[Thumbnail] Number of input images:", args.videoFrames.length);
      
      const analysisMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: "You are an expert YouTube thumbnail designer. Analyze the provided images and create a detailed thumbnail concept that will maximize click-through rates.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: thumbnailPrompt + "\n\nAnalyze these images and describe the perfect YouTube thumbnail based on them. Be specific about visual elements, colors, composition, and text overlay suggestions." },
            ...args.videoFrames.map((frame) => ({
              type: "image_url" as const,
              image_url: {
                url: frame.dataUrl,
                detail: "high" as const,
              },
            })),
          ],
        },
      ];
      
      const analysisResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: analysisMessages,
        max_tokens: 800,
        temperature: 0.7,
      });
      
      const thumbnailConcept = analysisResponse.choices[0].message.content || "";
      console.log("[Thumbnail] Analysis complete. Concept:", thumbnailConcept.substring(0, 200) + "...");
      
      // Now ask GPT-4 to create a very detailed description of what it sees in the images
      console.log("[Thumbnail] Getting detailed visual description...");
      
      const descriptionMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: "You are a visual description expert. Describe EXACTLY what you see in these images in extreme detail, including: people's appearance, facial expressions, clothing, poses, backgrounds, objects, colors, lighting, and composition. Be as specific as possible.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Describe these images in extreme detail. I need to recreate them as a YouTube thumbnail." },
            ...args.videoFrames.map((frame) => ({
              type: "image_url" as const,
              image_url: {
                url: frame.dataUrl,
                detail: "high" as const,
              },
            })),
          ],
        },
      ];
      
      const descriptionResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: descriptionMessages,
        max_tokens: 1000,
        temperature: 0.3, // Lower temperature for accurate descriptions
      });
      
      const visualDescription = descriptionResponse.choices[0].message.content || "";
      console.log("[Thumbnail] Visual description obtained");
      
      // Extract key elements from the concept - better regex for text overlay
      const textOverlayMatch = thumbnailConcept.match(/text[:\s]*["']([^"']+)["']/i) ||
                             thumbnailConcept.match(/suggested text[:\s]*["']([^"']+)["']/i) ||
                             thumbnailConcept.match(/text overlay[:\s]*["']([^"']+)["']/i) ||
                             thumbnailConcept.match(/["']([^"']{5,40})["'][^"']*(?:text|overlay)/i);
      const textOverlay = textOverlayMatch ? textOverlayMatch[1].trim() : "AMAZING TIPS";
      
      console.log("[Thumbnail] Extracted text overlay:", textOverlay);
      
      // Build a comprehensive prompt for gpt-image-1 that includes video context
      let gptImagePrompt = "Create a YouTube thumbnail based on this video content:\n\n";
      
      // Debug: Log connected agent outputs
      console.log("[Thumbnail] Connected agent outputs:", args.connectedAgentOutputs);
      
      // Add AI-generated video title from connected agents
      const titleFromAgent = args.connectedAgentOutputs.find(output => output.type === "title");
      if (titleFromAgent && titleFromAgent.content && titleFromAgent.content.trim() !== "") {
        console.log("[Thumbnail] Using AI-generated title:", titleFromAgent.content);
        gptImagePrompt += `VIDEO TITLE: ${titleFromAgent.content}\n\n`;
      } else {
        console.log("[Thumbnail] No AI title found in connected agents");
        // Don't include filename as it's not useful for thumbnail generation
      }
      
      // Add transcription summary if available
      if (videoData.transcription) {
        const transcriptSummary = videoData.transcription.slice(0, 300);
        gptImagePrompt += `VIDEO CONTENT: ${transcriptSummary}...\n\n`;
      }
      
      // Add visual description from the uploaded frames
      const shortDescription = visualDescription.length > 400 ? 
        visualDescription.substring(0, 400) + "..." : 
        visualDescription;
      gptImagePrompt += `VISUAL ELEMENTS: ${shortDescription}\n\n`;
      
      // Add design requirements with the extracted text overlay
      gptImagePrompt += "DESIGN REQUIREMENTS:\n";
      gptImagePrompt += `- Main text overlay should say: "${textOverlay}"\n`;
      gptImagePrompt += "- Make the text LARGE and BOLD\n";
      gptImagePrompt += "- Use eye-catching YouTube thumbnail style\n";
      gptImagePrompt += "- High contrast and vibrant colors\n";
      gptImagePrompt += "- Professional quality\n";
      gptImagePrompt += "- 16:9 aspect ratio\n";
      
      // Add channel style if available - ensure it's not cut off
      if (args.profileData) {
        const channelInfo = `${args.profileData.channelName} - ${args.profileData.niche}`;
        gptImagePrompt += `\nCHANNEL STYLE: ${channelInfo}\n`;
        if (args.profileData.contentType) {
          gptImagePrompt += `Content type: ${args.profileData.contentType}\n`;
        }
        if (args.profileData.tone) {
          gptImagePrompt += `Tone: ${args.profileData.tone}\n`;
        }
        if (args.profileData.targetAudience) {
          gptImagePrompt += `Target audience: ${args.profileData.targetAudience}\n`;
        }
      }
      
      // Add any specific context from the user
      if (args.additionalContext) {
        gptImagePrompt += `\nSPECIFIC REQUIREMENTS: ${args.additionalContext}\n`;
      }
      
      // Add other connected agent outputs (descriptions, etc)
      const otherAgentOutputs = args.connectedAgentOutputs
        .filter(output => output.type !== "title" && output.type !== "thumbnail");
      if (otherAgentOutputs.length > 0) {
        gptImagePrompt += "\nOTHER CONTEXT:\n";
        otherAgentOutputs.forEach(output => {
          if (output.type === "description" && output.content) {
            gptImagePrompt += `- Video Description: ${output.content.slice(0, 200)}...\n`;
          }
        });
      }
      
      // Ensure prompt doesn't exceed limit
      if (gptImagePrompt.length > 1000) {
        gptImagePrompt = gptImagePrompt.substring(0, 1000) + "...";
      }
      
      console.log("[Thumbnail] Generating thumbnail with gpt-image-1...");
      console.log("[Thumbnail] Prompt:", gptImagePrompt.substring(0, 200) + "...");
      
      // Convert the first frame to use with image editing
      const firstFrame = args.videoFrames[0];
      if (!firstFrame) {
        throw new Error("No frames available for thumbnail generation");
      }

      // Process all frames as reference images
      const imageFiles = await Promise.all(
        args.videoFrames.slice(0, 3).map(async (frame, index) => {
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

      // Use images.edit with the first image as base
      console.log("[Thumbnail] Using images.edit API...");
      const imageResponse = await openai.images.edit({
        model: "gpt-image-1",
        image: imageFiles[0],
        prompt: gptImagePrompt,
        size: "1536x1024",
      });
      
      
      console.log("[Thumbnail] Image generation completed");
      
      // Get the generated image - handle both URL and base64 formats
      const imageData = imageResponse.data?.[0];
      if (!imageData) {
        throw new Error("No image data returned from generation");
      }
      
      let generatedImageUrl: string;
      let storageId: string;
      
      if (imageData.b64_json) {
        // Handle base64 response
        console.log("[Thumbnail] Received base64 image data");
        const base64Data = imageData.b64_json;
        
        // Convert base64 to blob
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const imageBlob = new Blob([bytes], { type: 'image/png' });
        
        // Store in Convex storage
        console.log("[Thumbnail] Storing base64 image in Convex storage...");
        storageId = await ctx.storage.store(imageBlob);
        const url = await ctx.storage.getUrl(storageId);
        
        if (!url) {
          throw new Error("Failed to get URL for stored image");
        }
        generatedImageUrl = url;
        console.log("[Thumbnail] Image stored successfully");
      } else if (imageData.url) {
        // Handle URL response (fallback)
        generatedImageUrl = imageData.url;
        
        // Download and store URL-based image
        console.log("[Thumbnail] Downloading image from URL...");
        const imageResponse2 = await fetch(generatedImageUrl);
        if (!imageResponse2.ok) {
          throw new Error("Failed to download generated image");
        }
        
        const downloadedImageBlob = await imageResponse2.blob();
        console.log("[Thumbnail] Storing URL image in Convex storage...");
        storageId = await ctx.storage.store(downloadedImageBlob);
        const permanentUrl = await ctx.storage.getUrl(storageId);
        
        if (!permanentUrl) {
          throw new Error("Failed to get permanent URL for stored image");
        }
        generatedImageUrl = permanentUrl;
      } else {
        throw new Error("No image URL or base64 data in response");
      }
      
      console.log("[Thumbnail] Final image URL:", generatedImageUrl.substring(0, 100) + "...");
      
      // Combine the concept with generation details
      const fullConcept = `${thumbnailConcept}\n\n=== Generated Thumbnail ===\nText Overlay: "${textOverlay}"\nGeneration Prompt: ${gptImagePrompt}`;
      
      // Return the result with permanent URL
      return {
        concept: fullConcept,
        imageUrl: generatedImageUrl,
        prompt: `=== Original Requirements ===\n${thumbnailPrompt}\n\n=== AI Analysis ===\n${thumbnailConcept}\n\n=== Generation Prompt ===\n${gptImagePrompt}`,
        storageId,
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


