import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// Helper function to extract YouTube video ID
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// Helper function to extract Spotify ID
function extractSpotifyId(url: string): { type: string; id: string } | null {
  const match = url.match(/spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
  if (match) {
    return { type: match[1], id: match[2] };
  }
  return null;
}

// Fetch metadata for a URL using oEmbed services
export const fetchUrlMetadata = action({
  args: {
    url: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const { url, type } = args;
    
    try {
      if (type === "youtube") {
        // Use noembed for YouTube (no API key needed)
        const response = await fetch(
          `https://noembed.com/embed?url=${encodeURIComponent(url)}`
        );
        
        if (!response.ok) {
          console.warn("[MoodBoard] Failed to fetch YouTube metadata:", response.status);
          return null;
        }
        
        const data = await response.json();
        
        // Extract video ID for thumbnail
        const videoId = extractYouTubeId(url);
        
        return {
          title: data.title || "YouTube Video",
          author: data.author_name || "",
          thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : data.thumbnail_url,
          description: data.title || "",
          duration: data.duration,
        };
      }
      
      if (type === "music" && url.includes("spotify.com")) {
        // Use Spotify oEmbed
        const response = await fetch(
          `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`
        );
        
        if (!response.ok) {
          console.warn("[MoodBoard] Failed to fetch Spotify metadata:", response.status);
          return null;
        }
        
        const data = await response.json();
        
        return {
          title: data.title || "Spotify Track",
          author: data.provider_name || "Spotify",
          thumbnail: data.thumbnail_url,
          description: data.description || "",
        };
      }
      
      if (type === "music" && url.includes("soundcloud.com")) {
        // Use SoundCloud oEmbed
        const response = await fetch(
          `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`
        );
        
        if (!response.ok) {
          console.warn("[MoodBoard] Failed to fetch SoundCloud metadata:", response.status);
          return null;
        }
        
        const data = await response.json();
        
        return {
          title: data.title || "SoundCloud Track",
          author: data.author_name || "",
          thumbnail: data.thumbnail_url,
          description: data.description || "",
        };
      }
      
      // For images and other URLs, return basic info
      return {
        title: new URL(url).hostname,
        author: "",
        thumbnail: type === "image" ? url : undefined,
        description: "",
      };
      
    } catch (error) {
      console.error("[MoodBoard] Error fetching metadata:", error);
      return null;
    }
  },
});

// Download an image and convert to base64
export const downloadImageAsBase64 = action({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      console.log("[MoodBoard] Downloading image:", args.url);
      
      const response = await fetch(args.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      const mimeType = blob.type || 'image/jpeg';
      
      return {
        dataUrl: `data:${mimeType};base64,${base64}`,
        size: buffer.length,
        mimeType,
      };
    } catch (error) {
      console.error("[MoodBoard] Error downloading image:", error);
      throw error;
    }
  },
});

// Process mood board references for thumbnail generation
export const processMoodBoardReferences = action({
  args: {
    references: v.array(v.object({
      url: v.string(),
      type: v.string(),
      title: v.optional(v.string()),
      thumbnail: v.optional(v.string()),
    })),
    maxImages: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<{
    url: string;
    type: string;
    title?: string;
    thumbnail?: string;
    imageData: string | null;
    description: string;
  }>> => {
    const { references, maxImages = 5 } = args;
    const processedRefs = [];
    let imageCount = 0;
    
    for (const ref of references) {
      try {
        if (imageCount >= maxImages) {
          // Just add text reference if we've hit the image limit
          processedRefs.push({
            ...ref,
            imageData: null,
            description: `${ref.type}: ${ref.title || ref.url}`,
          });
          continue;
        }
        
        if (ref.type === "youtube" && ref.thumbnail) {
          // Download YouTube thumbnail
          try {
            const response = await fetch(ref.thumbnail);
            if (!response.ok) {
              throw new Error(`Failed to fetch thumbnail: ${response.status}`);
            }
            
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64 = buffer.toString('base64');
            const mimeType = blob.type || 'image/jpeg';
            
            processedRefs.push({
              ...ref,
              imageData: `data:${mimeType};base64,${base64}`,
              description: `YouTube thumbnail reference: ${ref.title || "Video"}`,
            });
            imageCount++;
          } catch (error) {
            console.warn(`Failed to download YouTube thumbnail: ${ref.thumbnail}`, error);
            processedRefs.push({
              ...ref,
              imageData: null,
              description: `YouTube video (thumbnail failed): ${ref.title || ref.url}`,
            });
          }
        } else if (ref.type === "image" && ref.url) {
          // Download direct image
          try {
            const response = await fetch(ref.url);
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.status}`);
            }
            
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64 = buffer.toString('base64');
            const mimeType = blob.type || 'image/jpeg';
            
            processedRefs.push({
              ...ref,
              imageData: `data:${mimeType};base64,${base64}`,
              description: `Image reference: ${ref.title || "Mood board image"}`,
            });
            imageCount++;
          } catch (error) {
            console.warn(`Failed to download image: ${ref.url}`, error);
            processedRefs.push({
              ...ref,
              imageData: null,
              description: `Image (failed to load): ${ref.title || ref.url}`,
            });
          }
        } else {
          // Non-image references
          processedRefs.push({
            ...ref,
            imageData: null,
            description: `${ref.type}: ${ref.title || ref.url}`,
          });
        }
      } catch (error) {
        console.warn(`[MoodBoard] Failed to process reference: ${ref.url}`, error);
        // Add as text reference if download fails
        processedRefs.push({
          ...ref,
          imageData: null,
          description: `${ref.type} (failed to load): ${ref.title || ref.url}`,
        });
      }
    }
    
    return processedRefs;
  },
});