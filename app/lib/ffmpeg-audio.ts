import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  
  return ffmpeg;
}

export async function extractAudioFromVideo(
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  const ffmpeg = await loadFFmpeg();
  
  // Set up progress handling
  ffmpeg.on('progress', ({ progress }) => {
    onProgress?.(progress);
  });

  try {
    // Write video file to FFmpeg file system
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
    
    // Extract audio as MP3 (smaller file size)
    // -vn: no video
    // -acodec mp3: use MP3 codec
    // -b:a 128k: audio bitrate 128kbps (good quality, smaller size)
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-vn',
      '-acodec', 'mp3',
      '-b:a', '128k',
      'output.mp3'
    ]);
    
    // Read the output file
    const data = await ffmpeg.readFile('output.mp3');
    
    // Convert to File object
    const audioBlob = new Blob([data], { type: 'audio/mp3' });
    const audioFile = new File([audioBlob], 'extracted_audio.mp3', { type: 'audio/mp3' });
    
    // Clean up
    await ffmpeg.deleteFile('input.mp4');
    await ffmpeg.deleteFile('output.mp3');
    
    return audioFile;
  } catch (error) {
    console.error('FFmpeg audio extraction error:', error);
    throw new Error('Failed to extract audio from video');
  }
}

export function estimateAudioSize(videoFile: File): number {
  // Estimate audio size at 128kbps
  // Rough estimate: 1MB per 1 minute of audio at 128kbps
  const videoDurationMinutes = videoFile.size / (5 * 1024 * 1024); // Assume 5MB/min for video
  return videoDurationMinutes * 1024 * 1024; // 1MB per minute for audio
}