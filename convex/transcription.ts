"use node"
import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

// Action to transcribe video/audio using ElevenLabs (supports up to 1GB files!)
export const transcribeVideoElevenLabs = action({
  args: {
    videoId: v.id("videos"),
    storageId: v.id("_storage"),
    fileType: v.optional(v.string()), // 'video' or 'audio'
    fileName: v.optional(v.string()), // Original file name for content type detection
  },
  handler: async (ctx, args): Promise<{ success: boolean; transcription: string; service?: string }> => {
    console.log("🎙️ ElevenLabs transcription started", {
      videoId: args.videoId,
      storageId: args.storageId,
      fileType: args.fileType
    });

    // Skip auth check for internal actions (background jobs)
    // The auth was already checked when scheduling the job
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.log("⚠️ No user identity - running from internal action (this is ok)");
    }

    // Get ElevenLabs API key from Convex environment
    const apiKey = process.env.ELEVENLABS_API_KEY;
    console.log("🔑 ElevenLabs API key status:", apiKey ? "Found" : "Not found");

    if (!apiKey) {
      throw new Error("ElevenLabs API key not configured. Please add ELEVENLABS_API_KEY to your Convex environment variables.");
    }

    try {
      // Update status to show we're starting
      await ctx.runMutation(api.videos.updateTranscriptionStatus, {
        videoId: args.videoId,
        status: "processing",
        progress: "Starting transcription...",
      });


      // For smaller files, continue with direct download approach
      const fileUrl = await ctx.storage.getUrl(args.storageId);
      console.log("📁 Storage URL retrieved:", fileUrl ? "Success" : "Failed");

      if (!fileUrl) {
        throw new Error("Could not retrieve file URL from storage. The file may have been deleted.");
      }

      // For large files, we need to download from URL
      console.log("🌐 Starting ElevenLabs transcription");
      console.log("📍 File URL:", fileUrl);
      
      // Note: We can't check file size without downloading, but ElevenLabs will reject if > 1GB
      
      // Update progress
      await ctx.runMutation(api.videos.updateTranscriptionStatus, {
        videoId: args.videoId,
        status: "processing",
        progress: "Downloading file for transcription...",
      });

      // Download the file from URL
      console.log("📥 Downloading file from URL...");
      
      // For very large files, this might fail due to memory constraints
      let buffer: Buffer;
      try {
        const fetch = (await import('node-fetch')).default;
        const downloadResponse = await fetch(fileUrl);
        
        if (!downloadResponse.ok) {
          throw new Error(`Failed to download file: ${downloadResponse.status} ${downloadResponse.statusText}`);
        }
        
        // Check Content-Length header if available
        const contentLength = downloadResponse.headers.get('content-length');
        if (contentLength) {
          const sizeMB = parseInt(contentLength) / (1024 * 1024);
          console.log(`📏 File size from header: ${sizeMB.toFixed(2)}MB`);
          
          if (sizeMB > 1024) {
            throw new Error(`File is too large for processing (${sizeMB.toFixed(1)}MB). Maximum file size is 1GB.`);
          }
        }
        
        const arrayBuffer = await downloadResponse.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } catch (error: any) {
        if (error.message.includes('too large')) {
          throw error;
        }
        throw new Error(`Failed to download file for transcription. The file may be too large. ${error.message}`);
      }
      
      const fileSizeMB = (buffer.length / 1024 / 1024).toFixed(2);
      console.log("📤 File downloaded successfully");
      console.log("📏 File size:", fileSizeMB, "MB");
      
      // Check file size limit after download
      // Note: Convex actions have memory limits, so very large files may fail
      if (buffer.length > 1024 * 1024 * 1024) {
        throw new Error(`File is too large (${fileSizeMB}MB). ElevenLabs supports files up to 1GB.`);
      }

      // Call ElevenLabs Speech-to-Text API with raw form data
      console.log("🚀 Calling ElevenLabs API...");
      console.log("🔐 Using API key:", apiKey.substring(0, 10) + "...");

      // Update progress
      await ctx.runMutation(api.videos.updateTranscriptionStatus, {
        videoId: args.videoId,
        status: "processing",
        progress: "Uploading to ElevenLabs Speech-to-Text API...",
      });

      // Create form data manually for Node.js
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      
      // Determine content type and filename based on original file or file type
      let filename = 'video.mp4';
      let contentType = 'video/mp4';
      
      if (args.fileName) {
        filename = args.fileName;
        // Detect content type from filename extension
        const ext = filename.toLowerCase().split('.').pop();
        switch (ext) {
          case 'mp4':
            contentType = 'video/mp4';
            break;
          case 'webm':
            contentType = 'video/webm';
            break;
          case 'mov':
            contentType = 'video/quicktime';
            break;
          case 'avi':
            contentType = 'video/x-msvideo';
            break;
          case 'mp3':
            contentType = 'audio/mpeg';
            break;
          case 'wav':
            contentType = 'audio/wav';
            break;
          case 'ogg':
            contentType = 'audio/ogg';
            break;
          default:
            // Fallback to generic types
            contentType = args.fileType === 'audio' ? 'audio/mpeg' : 'video/mp4';
        }
      } else {
        // Fallback if no filename provided
        filename = args.fileType === 'audio' ? 'audio.mp3' : 'video.mp4';
        contentType = args.fileType === 'audio' ? 'audio/mpeg' : 'video/mp4';
      }
      
      console.log(`📎 Uploading as: ${filename} (${contentType})`);
      
      formData.append('file', buffer, {
        filename: filename,
        contentType: contentType,
      });
      formData.append('model_id', 'scribe_v1');

      // node-fetch already imported above
      
      // Make direct API call since SDK might not handle Node.js File properly
      const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'Xi-Api-Key': apiKey,
          ...formData.getHeaders(),
        },
        body: formData as any,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `ElevenLabs API error (${response.status})`;
        
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail) {
            errorMessage = errorJson.detail;
          }
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        // Provide user-friendly error messages
        if (response.status === 400) {
          if (errorMessage.includes("parsing the body")) {
            errorMessage = "File format not supported. Please ensure your file is a valid video or audio file.";
          } else if (errorMessage.includes("model_id")) {
            errorMessage = "Transcription model configuration error. Please try again.";
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

      console.log("✅ ElevenLabs response received:", JSON.stringify(elevenLabsResponse, null, 2));

      // The SDK returns the response directly, not a fetch response
      const transcriptionText = elevenLabsResponse.text || "";
      
      // Log additional details if available
      if (elevenLabsResponse.language_code) {
        console.log(`🌐 Detected language: ${elevenLabsResponse.language_code} (confidence: ${elevenLabsResponse.language_probability || 'N/A'})`);
      }
      
      if (elevenLabsResponse.words && elevenLabsResponse.words.length > 0) {
        console.log(`📊 Word count: ${elevenLabsResponse.words.filter((w: any) => w.type === 'word').length} words`);
      }

      // Update progress
      await ctx.runMutation(api.videos.updateTranscriptionStatus, {
        videoId: args.videoId,
        status: "processing",
        progress: "Processing transcription results...",
      });

      // Log transcription result for debugging
      console.log(`📝 Transcription text found. Length: ${transcriptionText.length} characters`);
      console.log(`📄 First 200 chars: "${transcriptionText.substring(0, 200)}..."`);

      if (!transcriptionText || transcriptionText.length === 0) {
        console.error("⚠️ No transcription text found in response!");
        console.error("Response object keys:", Object.keys(elevenLabsResponse));
        throw new Error("No speech detected in the file. Please ensure your video/audio contains clear speech.");
      }

      // Basic quality check
      if (transcriptionText.length < 50) {
        console.warn("Transcription seems too short, might be an issue with audio quality");
      }

      // Update the video with transcription
      await ctx.runMutation(api.videos.updateVideoTranscription, {
        videoId: args.videoId,
        transcription: transcriptionText,
      });

      return { success: true, transcription: transcriptionText, service: 'elevenlabs' };
    } catch (error: any) {
      console.error("❌ ElevenLabs transcription error:", error);
      console.error("Full error details:", error);
      
      // Update status to failed with user-friendly error message
      await ctx.runMutation(api.videos.updateTranscriptionStatus, {
        videoId: args.videoId,
        status: "failed",
        error: error.message || "Transcription failed. Please try again.",
      });
      
      throw error; // Re-throw the error
    }
  },
});

// Main transcription action - just use ElevenLabs
export const transcribeVideo = action({
  args: {
    videoId: v.id("videos"),
    storageId: v.id("_storage"),
    fileType: v.optional(v.string()), // 'video' or 'audio'
    fileName: v.optional(v.string()), // Pass through fileName
  },
  handler: async (ctx, args): Promise<{ success: boolean; transcription: string; service?: string }> => {
    // Just redirect to ElevenLabs
    return ctx.runAction(api.transcription.transcribeVideoElevenLabs, args);
  },
});

