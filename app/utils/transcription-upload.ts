import { toast } from "sonner";

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface ParsedTranscription {
  segments: TranscriptionSegment[];
  fullText: string;
  format: "srt" | "vtt" | "txt" | "json";
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Parse SRT format
export function parseSRT(content: string): ParsedTranscription {
  const segments: TranscriptionSegment[] = [];
  const blocks = content.trim().split(/\n\s*\n/);
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;
    
    // Parse timestamp line (00:00:00,000 --> 00:00:05,000)
    const timestampMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
    if (!timestampMatch) continue;
    
    const start = srtTimeToSeconds(timestampMatch[1]);
    const end = srtTimeToSeconds(timestampMatch[2]);
    const text = lines.slice(2).join(' ').trim();
    
    segments.push({ start, end, text });
  }
  
  const fullText = segments.map(s => s.text).join(' ');
  return { segments, fullText, format: "srt" };
}

// Parse WebVTT format
export function parseVTT(content: string): ParsedTranscription {
  const segments: TranscriptionSegment[] = [];
  const lines = content.split('\n');
  let i = 0;
  
  // Skip WEBVTT header
  while (i < lines.length && !lines[i].includes('-->')) i++;
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (line.includes('-->')) {
      const timestampMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
      if (timestampMatch) {
        const start = vttTimeToSeconds(timestampMatch[1]);
        const end = vttTimeToSeconds(timestampMatch[2]);
        
        // Collect text lines
        const textLines: string[] = [];
        i++;
        while (i < lines.length && lines[i].trim() && !lines[i].includes('-->')) {
          textLines.push(lines[i].trim());
          i++;
        }
        
        if (textLines.length > 0) {
          segments.push({ start, end, text: textLines.join(' ') });
        }
      }
    }
    i++;
  }
  
  const fullText = segments.map(s => s.text).join(' ');
  return { segments, fullText, format: "vtt" };
}

// Parse plain text (with optional timestamps)
export function parseTXT(content: string): ParsedTranscription {
  const lines = content.trim().split('\n');
  const segments: TranscriptionSegment[] = [];
  let currentTime = 0;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    // Check for timestamp format [00:00:00] or (00:00:00)
    const timestampMatch = trimmedLine.match(/[\[(](\d{2}:\d{2}:\d{2})[\])]\s*(.*)/);
    
    if (timestampMatch) {
      const time = simpleTimeToSeconds(timestampMatch[1]);
      const text = timestampMatch[2].trim();
      
      if (segments.length > 0) {
        segments[segments.length - 1].end = time;
      }
      
      segments.push({ start: time, end: time + 5, text }); // Default 5s duration
      currentTime = time;
    } else {
      // No timestamp, append to previous or create new
      if (segments.length > 0) {
        segments[segments.length - 1].text += ' ' + trimmedLine;
      } else {
        segments.push({ start: 0, end: 5, text: trimmedLine });
      }
    }
  }
  
  const fullText = segments.map(s => s.text).join(' ');
  return { segments, fullText, format: "txt" };
}

// Parse JSON format
export function parseJSON(content: string): ParsedTranscription {
  try {
    const data = JSON.parse(content);
    
    // Support different JSON structures
    let segments: TranscriptionSegment[] = [];
    
    if (Array.isArray(data)) {
      segments = data.map(item => ({
        start: item.start || item.startTime || 0,
        end: item.end || item.endTime || (item.start || 0) + 5,
        text: item.text || item.content || item.transcript || ''
      }));
    } else if (data.segments) {
      segments = parseJSON(JSON.stringify(data.segments)).segments;
    } else if (data.transcript) {
      // Single transcript field
      segments = [{ start: 0, end: 60, text: data.transcript }];
    }
    
    const fullText = segments.map(s => s.text).join(' ');
    return { segments, fullText, format: "json" };
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
}

// Main parser function
export async function parseTranscriptionFile(file: File): Promise<ParsedTranscription> {
  const text = await file.text();
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  try {
    switch (extension) {
      case 'srt':
        return parseSRT(text);
      case 'vtt':
      case 'webvtt':
        return parseVTT(text);
      case 'txt':
        return parseTXT(text);
      case 'json':
        return parseJSON(text);
      default:
        // Try to auto-detect format
        if (text.trim().startsWith('WEBVTT')) {
          return parseVTT(text);
        } else if (text.includes('-->')) {
          return parseSRT(text);
        } else if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          return parseJSON(text);
        } else {
          return parseTXT(text);
        }
    }
  } catch (error) {
    throw new Error(`Failed to parse ${extension?.toUpperCase() || 'file'}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Validate transcription
export function validateTranscription(
  transcription: ParsedTranscription,
  videoDuration?: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if empty
  if (!transcription.segments.length || !transcription.fullText.trim()) {
    errors.push("Transcription file is empty");
  }
  
  // Check file size (rough estimate)
  if (transcription.fullText.length > 1000000) {
    warnings.push("Transcription is very large (>1MB of text)");
  }
  
  // Validate timestamps
  if (videoDuration && transcription.segments.length > 0) {
    const lastSegment = transcription.segments[transcription.segments.length - 1];
    if (lastSegment.end > videoDuration + 5) {
      warnings.push(`Timestamps exceed video duration (${formatTime(videoDuration)})`);
    }
  }
  
  // Check for overlapping segments
  for (let i = 1; i < transcription.segments.length; i++) {
    if (transcription.segments[i].start < transcription.segments[i - 1].end) {
      warnings.push("Some subtitles have overlapping timestamps");
      break;
    }
  }
  
  // Check for very long segments
  const longSegments = transcription.segments.filter(s => s.text.length > 200);
  if (longSegments.length > 0) {
    warnings.push(`${longSegments.length} subtitle(s) are very long (>200 chars)`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Time conversion helpers
function srtTimeToSeconds(time: string): number {
  const [hours, minutes, secondsMs] = time.split(':');
  const [seconds, ms] = secondsMs.split(',');
  return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(ms) / 1000;
}

function vttTimeToSeconds(time: string): number {
  const [hours, minutes, secondsMs] = time.split(':');
  const [seconds, ms] = secondsMs.split('.');
  return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(ms) / 1000;
}

function simpleTimeToSeconds(time: string): number {
  const parts = time.split(':');
  if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  } else if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return parseInt(parts[0]);
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Show validation results to user
export function showValidationResults(validation: ValidationResult) {
  if (!validation.isValid) {
    validation.errors.forEach(error => {
      toast.error(error);
    });
    return false;
  }
  
  validation.warnings.forEach(warning => {
    toast.warning(warning);
  });
  
  return true;
}