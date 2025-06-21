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

export interface VideoMetadata {
  duration: number; // seconds
  fileSize: number; // bytes
  resolution: {
    width: number;
    height: number;
  };
  frameRate: number;
  bitRate: number;
  format: string;
  codec: string;
  audioInfo?: {
    codec: string;
    sampleRate: number;
    channels: number;
    bitRate: number;
  };
  thumbnails: string[]; // Data URLs of extracted frames
}

export async function extractVideoMetadata(
  videoFile: File,
  options: {
    onProgress?: (progress: number) => void;
    extractThumbnails?: boolean;
  } = {}
): Promise<VideoMetadata> {
  const { onProgress, extractThumbnails = true } = options;
  const ffmpeg = await loadFFmpeg();
  
  // Set up progress handling
  ffmpeg.on('progress', ({ progress }) => {
    onProgress?.(progress * 0.5); // First 50% for metadata
  });

  try {
    // Write video file to FFmpeg file system
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
    
    // Get detailed video information using ffprobe-like command
    // FFmpeg.wasm doesn't have ffprobe, so we use ffmpeg with null output
    const output: string[] = [];
    ffmpeg.on('log', ({ message }) => {
      output.push(message);
    });
    
    // Run ffmpeg to get video info
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-f', 'null',
      '-'
    ]);
    
    // Parse the output to extract metadata
    const metadata = parseFFmpegOutput(output.join('\n'));
    metadata.fileSize = videoFile.size;
    metadata.format = videoFile.type.split('/')[1] || 'unknown';
    
    // Extract thumbnails if requested
    if (extractThumbnails) {
      onProgress?.(0.5);
      const thumbnails: string[] = [];
      const frameCount = 5; // Extract 5 frames
      
      for (let i = 0; i < frameCount; i++) {
        const timestamp = (i + 1) / (frameCount + 1) * metadata.duration;
        const outputName = `thumb_${i}.jpg`;
        
        await ffmpeg.exec([
          '-ss', timestamp.toString(),
          '-i', 'input.mp4',
          '-vframes', '1',
          '-vf', 'scale=320:-1',
          '-q:v', '2',
          outputName
        ]);
        
        const frameData = await ffmpeg.readFile(outputName);
        const blob = new Blob([frameData], { type: 'image/jpeg' });
        const dataUrl = await blobToDataURL(blob);
        thumbnails.push(dataUrl);
        
        await ffmpeg.deleteFile(outputName);
        onProgress?.(0.5 + (0.5 * (i + 1) / frameCount));
      }
      
      metadata.thumbnails = thumbnails;
    }
    
    // Clean up
    await ffmpeg.deleteFile('input.mp4');
    
    // Ensure all required fields are set
    return {
      duration: metadata.duration || 0,
      fileSize: metadata.fileSize || videoFile.size,
      resolution: metadata.resolution || { width: 0, height: 0 },
      frameRate: metadata.frameRate || 0,
      bitRate: metadata.bitRate || 0,
      format: metadata.format || videoFile.type.split('/')[1] || 'unknown',
      codec: metadata.codec || 'unknown',
      audioInfo: metadata.audioInfo,
      thumbnails: metadata.thumbnails || []
    };
  } catch (error) {
    console.error('FFmpeg metadata extraction error:', error);
    // Return basic metadata on error
    return {
      duration: 0,
      fileSize: videoFile.size,
      resolution: { width: 0, height: 0 },
      frameRate: 0,
      bitRate: 0,
      format: videoFile.type.split('/')[1] || 'unknown',
      codec: 'unknown',
      thumbnails: []
    };
  }
}

function parseFFmpegOutput(output: string): Partial<VideoMetadata> {
  const metadata: Partial<VideoMetadata> = {};
  
  // Extract duration
  const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d+)/);
  if (durationMatch) {
    const hours = parseInt(durationMatch[1]);
    const minutes = parseInt(durationMatch[2]);
    const seconds = parseFloat(durationMatch[3]);
    metadata.duration = hours * 3600 + minutes * 60 + seconds;
  }
  
  // Extract video stream info
  const videoStreamMatch = output.match(/Stream.*Video: (\w+).*?(\d+)x(\d+).*?(\d+(?:\.\d+)?)\s*fps.*?(\d+)\s*kb\/s/);
  if (videoStreamMatch) {
    metadata.codec = videoStreamMatch[1];
    metadata.resolution = {
      width: parseInt(videoStreamMatch[2]),
      height: parseInt(videoStreamMatch[3])
    };
    metadata.frameRate = parseFloat(videoStreamMatch[4]);
    metadata.bitRate = parseInt(videoStreamMatch[5]) * 1000; // Convert to bits/s
  }
  
  // Extract audio stream info
  const audioStreamMatch = output.match(/Stream.*Audio: (\w+).*?(\d+)\s*Hz.*?(\w+).*?(\d+)\s*kb\/s/);
  if (audioStreamMatch) {
    metadata.audioInfo = {
      codec: audioStreamMatch[1],
      sampleRate: parseInt(audioStreamMatch[2]),
      channels: audioStreamMatch[3] === 'stereo' ? 2 : 1,
      bitRate: parseInt(audioStreamMatch[4]) * 1000
    };
  }
  
  return metadata;
}

async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

export function formatBitRate(bitsPerSecond: number): string {
  if (bitsPerSecond < 1000) return bitsPerSecond + ' bps';
  if (bitsPerSecond < 1000000) return (bitsPerSecond / 1000).toFixed(0) + ' kbps';
  return (bitsPerSecond / 1000000).toFixed(1) + ' Mbps';
}