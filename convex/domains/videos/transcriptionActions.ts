"use node"
import { v } from "convex/values";
import { action } from "../../_generated/server";
import { api } from "../../_generated/api";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

// Transcription Actions that require Node.js runtime
export const transcribeWithElevenLabs = action({
  args: {
    videoId: v.id("videos"),
    storageId: v.id("_storage"),
    fileType: v.optional(v.string()),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; transcription: string; service?: string }> => {
    console.log("🎙️ ElevenLabs transcription started", {
      videoId: args.videoId,
      storageId: args.storageId,
      fileType: args.fileType,
      fileName: args.fileName
    });

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.log("⚠️ No user identity - running from internal action (this is ok)");
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    console.log("🔑 ElevenLabs API key status:", apiKey ? "Found" : "Not found");

    if (!apiKey) {
      throw new Error("ElevenLabs API key not configured. Please add ELEVENLABS_API_KEY to your Convex environment variables.");
    }

    try {
      // Update status to show we're starting
      await ctx.runMutation(api.domains.videos.transcriptionMutations.updateTranscriptionStatus, {
        id: args.videoId,
        status: "processing",
        progress: "Starting transcription...",
      });

      const fileUrl = await ctx.storage.getUrl(args.storageId);
      console.log("📁 Storage URL retrieved:", fileUrl ? "Success" : "Failed");

      if (!fileUrl) {
        throw new Error("Could not retrieve file URL from storage. The file may have been deleted.");
      }

      // Validate file accessibility
      try {
        const fetch = (await import('node-fetch')).default;
        const headResponse = await fetch(fileUrl, { method: 'HEAD' });
        if (!headResponse.ok) {
          console.error("❌ File URL not accessible:", headResponse.status);
          throw new Error(`File URL is not accessible (${headResponse.status}). The file may have been deleted.`);
        }
        const contentLength = headResponse.headers.get('content-length');
        if (contentLength) {
          const sizeMB = parseInt(contentLength) / (1024 * 1024);
          console.log(`✅ File URL is accessible. Size: ${sizeMB.toFixed(2)}MB`);
        }
      } catch (error: any) {
        console.error("❌ Failed to validate file URL:", error);
        throw new Error("Could not validate file accessibility. " + error.message);
      }
      
      await ctx.runMutation(api.domains.videos.transcriptionMutations.updateTranscriptionStatus, {
        id: args.videoId,
        status: "processing",
        progress: "Sending file URL to ElevenLabs...",
      });

      console.log("🚀 Calling ElevenLabs API with cloud URL...");

      const requestBody = {
        cloud_storage_url: fileUrl,
        model_id: 'scribe_v1',
      };
      
      console.log(`📎 Request details:`, {
        cloud_storage_url: fileUrl,
        model_id: 'scribe_v1',
        fileName: args.fileName,
        fileType: args.fileType,
      });

      const fetch = (await import('node-fetch')).default;
      const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'Xi-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `ElevenLabs API error (${response.status})`;
        
        console.error("❌ ElevenLabs API error response:", {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText,
        });
        
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail) {
            errorMessage = errorJson.detail;
          } else if (typeof errorJson === 'object' && errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch (parseError) {
          errorMessage = errorText || errorMessage;
        }
        
        // Provide user-friendly error messages
        if (response.status === 400) {
          if (errorMessage.includes("parsing the body") || errorMessage.includes("Invalid file format")) {
            errorMessage = "File format not supported. Please ensure your file is a valid video or audio file.";
          } else if (errorMessage.includes("cloud_storage_url")) {
            errorMessage = "Could not access the file URL. The file may not be publicly accessible.";
          }
        } else if (response.status === 401) {
          errorMessage = "ElevenLabs API authentication failed. Please check your API key.";
        } else if (response.status === 413) {
          errorMessage = "File is too large. ElevenLabs supports files up to 1GB.";
        } else if (response.status === 429) {
          errorMessage = "Rate limit exceeded. Please try again in a few moments.";
        } else if (response.status === 500) {
          errorMessage = "ElevenLabs service error. Please try again later.";
        }
        
        throw new Error(errorMessage);
      }

      const elevenLabsResponse = await response.json() as {
        text: string;
        language_code: string;
        language_probability: number;
        words: { type: string }[];
      };

      console.log("✅ ElevenLabs response received");

      const transcriptionText = elevenLabsResponse.text || "";
      
      if (elevenLabsResponse.language_code) {
        console.log(`🌐 Detected language: ${elevenLabsResponse.language_code} (confidence: ${elevenLabsResponse.language_probability || 'N/A'})`);
      }

      console.log(`📝 Transcription text found. Length: ${transcriptionText.length} characters`);

      if (!transcriptionText || transcriptionText.length === 0) {
        console.error("⚠️ No transcription text found in response!");
        throw new Error("No speech detected in the file. Please ensure your video/audio contains clear speech.");
      }

      if (transcriptionText.length < 50) {
        console.warn("Transcription seems too short, might be an issue with audio quality");
      }

      // Update the video with transcription
      await ctx.runMutation(api.domains.videos.transcriptionMutations.updateVideoTranscription, {
        videoId: args.videoId,
        transcription: transcriptionText,
      });

      return { success: true, transcription: transcriptionText, service: 'elevenlabs' };
    } catch (error: any) {
      console.error("❌ ElevenLabs transcription error:", error);
      
      await ctx.runMutation(api.domains.videos.transcriptionMutations.updateTranscriptionStatus, {
        id: args.videoId,
        status: "failed",
        error: error.message || "Transcription failed. Please try again.",
      });
      
      throw error;
    }
  },
});

// Main transcription action
export const transcribeVideo = action({
  args: {
    videoId: v.id("videos"),
    storageId: v.id("_storage"),
    fileType: v.optional(v.string()),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; transcription: string; service?: string }> => {
    return ctx.runAction(api.domains.videos.transcriptionActions.transcribeWithElevenLabs, args);
  },
});