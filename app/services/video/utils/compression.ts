/**
 * Audio compression utilities to reduce file size before uploading
 */

interface CompressionOptions {
  targetBitrate?: number; // Target bitrate in kbps (e.g., 64, 96, 128)
  targetSampleRate?: number; // Target sample rate in Hz (e.g., 16000, 22050, 44100)
  mono?: boolean; // Convert to mono to reduce size
}

/**
 * Compress an audio file using the Web Audio API
 * This reduces file size while maintaining reasonable quality for transcription
 */
export async function compressAudioFile(
  file: File,
  options: CompressionOptions = {}
): Promise<Blob> {
  const {
    targetBitrate = 64, // 64 kbps is usually sufficient for speech
    targetSampleRate = 16000, // 16 kHz is standard for speech recognition
    mono = true, // Mono is sufficient for transcription
  } = options;

  try {
    // Create an audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Read the file as an array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Decode the audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Create an offline context for processing
    const offlineContext = new OfflineAudioContext(
      mono ? 1 : audioBuffer.numberOfChannels,
      audioBuffer.duration * targetSampleRate,
      targetSampleRate
    );
    
    // Create a buffer source
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // If converting to mono and source is stereo, mix channels
    if (mono && audioBuffer.numberOfChannels > 1) {
      const merger = offlineContext.createChannelMerger(1);
      source.connect(merger);
      merger.connect(offlineContext.destination);
    } else {
      source.connect(offlineContext.destination);
    }
    
    // Start processing
    source.start();
    const renderedBuffer = await offlineContext.startRendering();
    
    // Convert to WAV format with lower quality settings
    const wavBlob = await audioBufferToWav(renderedBuffer, targetBitrate);
    
    // Clean up
    audioContext.close();
    
    return wavBlob;
  } catch (error) {
    console.error("Audio compression failed:", error);
    throw error;
  }
}

/**
 * Convert an AudioBuffer to a WAV blob
 */
function audioBufferToWav(buffer: AudioBuffer, bitrate: number): Blob {
  const length = buffer.length * buffer.numberOfChannels * 2;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, buffer.numberOfChannels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true);
  view.setUint16(32, buffer.numberOfChannels * 2, true);
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, 'data');
  view.setUint32(40, length, true);
  
  // Write audio data
  let offset = 44;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Check if a file exceeds the size limit
 */
export function isFileTooLarge(file: File, maxSizeMB: number = 20): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size > maxSizeBytes;
}

/**
 * Get file size in MB
 */
export function getFileSizeMB(file: File): number {
  return file.size / (1024 * 1024);
}

/**
 * Estimate compressed file size based on duration and bitrate
 */
export function estimateCompressedSize(
  durationSeconds: number,
  bitrate: number = 64,
  channels: number = 1
): number {
  // Size in bytes = (bitrate in kbps * 1000 / 8) * duration * channels
  return (bitrate * 1000 / 8) * durationSeconds * channels;
}