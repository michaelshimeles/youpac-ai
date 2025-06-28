/**
 * Clean, organized Convex API structure
 * 
 * This provides a well-structured API surface that groups related functionality
 * by domain, making it easier to find and use the right functions.
 * 
 * Note: This is a reference file. The actual API is still generated from individual files.
 * Use this as a guide for the new organization structure.
 */

// The new organized structure will be:

// Videos Domain: /domains/videos/
// - videos.ts: createVideo, updateVideo, getVideo, getVideosByProject, updateVideoStorage, deleteVideo
// - transcription.ts: transcribeVideo, transcribeWithElevenLabs, updateTranscriptionStatus, etc.
// - metadata.ts: updateVideoMetadata

// Projects Domain: /domains/projects/  
// - projects.ts: createProject, getProjects, getProject, updateProject, deleteProject
// - canvas.ts: saveCanvasState, getCanvasState, clearCanvasState

// AI Domain: /domains/ai/
// - agents.ts: createAgent, updateAgentDraft, getAgentsByVideo, etc.

// Users Domain: /domains/users/
// - users.ts: store, current  
// - profiles.ts: getUserProfile, upsertUserProfile, deleteUserProfile

// Shared Domain: /domains/shared/
// - files.ts: generateUploadUrl

// This organization provides:
// 1. Clear separation of concerns by domain
// 2. Consistent naming conventions (verb + noun pattern)
// 3. Logical grouping of related functionality
// 4. Easy discovery and maintenance