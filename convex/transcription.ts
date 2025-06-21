import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI from "openai";

// Action to transcribe video using OpenAI Whisper
export const transcribeVideo = action({
  args: {
    videoId: v.id("videos"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get OpenAI API key from Convex environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    try {
      // Get the video file URL from storage
      const fileUrl = await ctx.storage.getUrl(args.storageId);
      if (!fileUrl) throw new Error("Could not get file URL");

      // Download the video file
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error("Failed to fetch video file");
      
      const blob = await response.blob();
      
      // OpenAI Whisper has a 25MB file size limit
      // For larger files, we'd need to extract audio first
      const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
      
      if (blob.size > MAX_FILE_SIZE) {
        throw new Error("Video file is too large. Please use a video under 25MB for transcription.");
      }
      
      // Convert blob to File object for Whisper API
      const file = new File([blob], "video.mp4", { type: blob.type || "video/mp4" });

      // Transcribe using Whisper API
      console.log("Starting transcription with Whisper API...");
      const transcriptionResponse = await openai.audio.transcriptions.create({
        file,
        model: "whisper-1",
        response_format: "text",
      });

      // Update the video with transcription
      await ctx.runMutation(api.transcription.updateVideoTranscription, {
        videoId: args.videoId,
        transcription: transcriptionResponse,
      });

      return { success: true, transcription: transcriptionResponse };
    } catch (error: any) {
      console.error("Transcription error:", error);
      throw new Error(`Failed to transcribe video: ${error.message}`);
    }
  },
});

// Internal mutation to update video transcription
export const updateVideoTranscription = mutation({
  args: {
    videoId: v.id("videos"),
    transcription: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      transcription: args.transcription,
    });
  },
});