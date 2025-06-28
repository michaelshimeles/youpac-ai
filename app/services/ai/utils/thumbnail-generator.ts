import OpenAI, { toFile } from "openai";

interface ThumbnailGeneratorOptions {
  images: File[];
  prompt: string;
  apiKey: string;
}

export async function generateThumbnailWithGPTImage({
  images,
  prompt,
  apiKey,
}: ThumbnailGeneratorOptions): Promise<{ imageUrl: string; base64?: string }> {
  const client = new OpenAI({ apiKey });

  // Convert File objects to OpenAI format
  const imageFiles = await Promise.all(
    images.map(async (file) => {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return toFile(buffer, file.name, {
        type: file.type || "image/png",
      });
    })
  );

  // Use gpt-image-1 model for image editing
  const response = await client.images.edit({
    model: "gpt-image-1",
    image: imageFiles[0], // gpt-image-1 expects a single image
    prompt,
    size: "1024x1024",
    response_format: "b64_json",
  });

  const base64 = response.data[0].b64_json;
  if (!base64) {
    throw new Error("No image data returned from GPT Image API");
  }

  // Convert base64 to data URL
  const imageUrl = `data:image/png;base64,${base64}`;

  return { imageUrl, base64 };
}

/**
 * Helper function to convert multiple images into a composite prompt
 */
export function createCompositePrompt(
  basePrompt: string,
  videoTitle?: string,
  channelStyle?: {
    channelName: string;
    niche: string;
    contentType: string;
    tone?: string;
  }
): string {
  let compositePrompt = basePrompt;

  if (videoTitle) {
    compositePrompt = `${compositePrompt}\n\nVideo Title: "${videoTitle}"`;
  }

  if (channelStyle) {
    compositePrompt = `${compositePrompt}\n\nChannel Style: ${channelStyle.channelName} (${channelStyle.niche})`;
    compositePrompt = `${compositePrompt}\nContent Type: ${channelStyle.contentType}`;
    if (channelStyle.tone) {
      compositePrompt = `${compositePrompt}\nTone: ${channelStyle.tone}`;
    }
  }

  // Add YouTube thumbnail requirements
  compositePrompt = `${compositePrompt}\n\nCreate a photorealistic YouTube thumbnail with:
- Bold, readable text overlay
- High contrast and vibrant colors
- Professional quality
- Eye-catching composition
- 16:9 aspect ratio optimized for YouTube`;

  return compositePrompt;
}