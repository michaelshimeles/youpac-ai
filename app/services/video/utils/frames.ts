import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  
  return ffmpeg;
}

export interface ExtractedFrame {
  timestamp: number;
  blob: Blob;
  dataUrl: string;
}

export async function extractFramesFromVideo(
  videoFile: File,
  options: {
    count?: number;
    onProgress?: (progress: number) => void;
  } = {}
): Promise<ExtractedFrame[]> {
  const { count = 3, onProgress } = options;
  const ffmpeg = await loadFFmpeg();
  
  // Set up progress handling
  ffmpeg.on('progress', ({ progress }) => {
    onProgress?.(progress);
  });

  try {
    // Write video file to FFmpeg file system
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
    
    // Get video duration first
    await ffmpeg.exec(['-i', 'input.mp4']);
    
    const frames: ExtractedFrame[] = [];
    
    // Extract frames at different timestamps
    // We'll extract frames at 25%, 50%, and 75% of the video duration
    const timestamps = Array.from({ length: count }, (_, i) => 
      (i + 1) / (count + 1)
    );
    
    for (let i = 0; i < count; i++) {
      const outputName = `frame_${i}.jpg`;
      
      // Extract frame at specific position
      // -ss: seek to position (as percentage)
      // -i: input file
      // -vframes 1: extract 1 frame
      // -q:v 2: quality (2 is high quality)
      await ffmpeg.exec([
        '-ss', `${timestamps[i] * 100}%`,
        '-i', 'input.mp4',
        '-vframes', '1',
        '-q:v', '2',
        outputName
      ]);
      
      // Read the frame
      const frameData = await ffmpeg.readFile(outputName);
      const blob = new Blob([frameData], { type: 'image/jpeg' });
      const dataUrl = await blobToDataURL(blob);
      
      frames.push({
        timestamp: timestamps[i],
        blob,
        dataUrl
      });
      
      // Clean up
      await ffmpeg.deleteFile(outputName);
    }
    
    // Clean up input file
    await ffmpeg.deleteFile('input.mp4');
    
    return frames;
  } catch (error) {
    console.error('FFmpeg frame extraction error:', error);
    throw new Error('Failed to extract frames from video');
  }
}

async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function getVideoThumbnail(videoFile: File): Promise<string> {
  // Extract a single frame at 25% of the video for a quick thumbnail
  const frames = await extractFramesFromVideo(videoFile, { count: 1 });
  return frames[0]?.dataUrl || '';
}