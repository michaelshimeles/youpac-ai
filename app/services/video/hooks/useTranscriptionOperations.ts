import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "~/convex/_generated/api";
import { Id } from "~/convex/_generated/dataModel";
import { useTranscriptionService } from "~/services/ServiceProvider";
import { TranscriptionOptions, TranscriptionResult } from "~/types/video";
import { useState, useCallback, useRef } from "react";

/**
 * Hook for video transcription operations
 */
export function useTranscription() {
  const transcriptionService = useTranscriptionService();
  const transcribeAction = useAction(api.transcription.transcribeVideo);
  const updateStatusMutation = useMutation(api.videos.updateTranscriptionStatus);
  
  const [transcriptionState, setTranscriptionState] = useState<{
    isTranscribing: Record<string, boolean>;
    progress: Record<string, string>;
    errors: Record<string, string>;
  }>({
    isTranscribing: {},
    progress: {},
    errors: {},
  });

  const transcribeVideo = useCallback(async (options: TranscriptionOptions) => {
    const videoKey = options.videoId;
    
    setTranscriptionState(prev => ({
      ...prev,
      isTranscribing: { ...prev.isTranscribing, [videoKey]: true },
      progress: { ...prev.progress, [videoKey]: "Starting transcription..." },
      errors: { ...prev.errors, [videoKey]: "" },
    }));

    try {
      // Update status to processing
      await updateStatusMutation({
        id: options.videoId,
        status: "processing",
        progress: "Initializing transcription...",
      });

      const result = await transcribeAction({
        videoId: options.videoId,
        storageId: options.storageId,
        fileType: options.fileType,
        fileName: options.fileName,
      });

      setTranscriptionState(prev => ({
        ...prev,
        progress: { ...prev.progress, [videoKey]: "Transcription complete!" },
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Transcription failed";
      
      setTranscriptionState(prev => ({
        ...prev,
        errors: { ...prev.errors, [videoKey]: errorMessage },
        progress: { ...prev.progress, [videoKey]: "Transcription failed" },
      }));

      // Update status to failed
      await updateStatusMutation({
        id: options.videoId,
        status: "failed",
        error: errorMessage,
      });

      throw error;
    } finally {
      setTranscriptionState(prev => ({
        ...prev,
        isTranscribing: { ...prev.isTranscribing, [videoKey]: false },
      }));
    }
  }, [transcribeAction, updateStatusMutation]);

  const isTranscribing = useCallback((videoId: Id<"videos">) => {
    return transcriptionState.isTranscribing[videoId] || false;
  }, [transcriptionState.isTranscribing]);

  const getProgress = useCallback((videoId: Id<"videos">) => {
    return transcriptionState.progress[videoId];
  }, [transcriptionState.progress]);

  const getError = useCallback((videoId: Id<"videos">) => {
    return transcriptionState.errors[videoId];
  }, [transcriptionState.errors]);

  const clearError = useCallback((videoId: Id<"videos">) => {
    setTranscriptionState(prev => ({
      ...prev,
      errors: { ...prev.errors, [videoId]: "" },
    }));
  }, []);

  return {
    transcribeVideo,
    isTranscribing,
    getProgress,
    getError,
    clearError,
  };
}

/**
 * Hook for manual transcription upload
 */
export function useManualTranscription() {
  const updateVideoMutation = useMutation(api.videos.updateVideoTranscription);
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});

  const uploadTranscription = useCallback(async (
    videoId: Id<"videos">,
    transcriptionText: string
  ) => {
    setIsUploading(prev => ({ ...prev, [videoId]: true }));

    try {
      await updateVideoMutation({
        videoId,
        transcription: transcriptionText,
      });
    } catch (error) {
      console.error("Manual transcription upload error:", error);
      throw error;
    } finally {
      setIsUploading(prev => ({ ...prev, [videoId]: false }));
    }
  }, [updateVideoMutation]);

  const uploadFromFile = useCallback(async (
    videoId: Id<"videos">,
    file: File
  ) => {
    const text = await file.text();
    return uploadTranscription(videoId, text);
  }, [uploadTranscription]);

  const parseTranscriptionFile = useCallback(async (file: File): Promise<{
    text: string;
    format: string;
    segments?: Array<{ text: string; startTime?: number; endTime?: number }>;
  }> => {
    const text = await file.text();
    const extension = file.name.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'srt': {
        // Parse SRT format
        const segments = text.split('\n\n').map(block => {
          const lines = block.trim().split('\n');
          if (lines.length >= 3) {
            const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/);
            const text = lines.slice(2).join(' ');
            
            if (timeMatch) {
              const startTime = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
              const endTime = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000;
              
              return { text, startTime, endTime };
            }
            return { text };
          }
          return null;
        }).filter(Boolean);

        return {
          text: segments.map(s => s?.text).join(' '),
          format: 'srt',
          segments: segments.filter(Boolean) as any[],
        };
      }

      case 'vtt': {
        // Parse VTT format
        const lines = text.split('\n');
        const segments: Array<{ text: string; startTime?: number; endTime?: number }> = [];
        let currentSegment = '';
        
        for (const line of lines) {
          if (line.includes('-->')) {
            // Time marker line
            continue;
          } else if (line.trim() === '') {
            if (currentSegment) {
              segments.push({ text: currentSegment.trim() });
              currentSegment = '';
            }
          } else if (!line.startsWith('WEBVTT') && !line.startsWith('NOTE')) {
            currentSegment += line + ' ';
          }
        }
        
        if (currentSegment) {
          segments.push({ text: currentSegment.trim() });
        }

        return {
          text: segments.map(s => s.text).join(' '),
          format: 'vtt',
          segments,
        };
      }

      case 'json': {
        // Parse JSON format
        try {
          const parsed = JSON.parse(text);
          if (parsed.text) {
            return {
              text: parsed.text,
              format: 'json',
              segments: parsed.segments,
            };
          }
        } catch (e) {
          // Fall through to plain text
        }
      }

      default: {
        // Plain text
        return {
          text: text.trim(),
          format: 'txt',
        };
      }
    }
  }, []);

  const isUploadingTranscription = useCallback((videoId: Id<"videos">) => {
    return isUploading[videoId] || false;
  }, [isUploading]);

  return {
    uploadTranscription,
    uploadFromFile,
    parseTranscriptionFile,
    isUploadingTranscription,
  };
}

/**
 * Hook for transcription editing and management
 */
export function useTranscriptionEditor(videoId: Id<"videos">) {
  const video = useQuery(api.videos.getWithTranscription, { videoId });
  const updateVideoMutation = useMutation(api.videos.updateVideoTranscription);
  const clearTranscriptionMutation = useMutation(api.videos.update);
  
  const [editState, setEditState] = useState<{
    isEditing: boolean;
    draft: string;
    hasChanges: boolean;
  }>({
    isEditing: false,
    draft: "",
    hasChanges: false,
  });

  const startEditing = useCallback(() => {
    setEditState({
      isEditing: true,
      draft: video?.transcription || "",
      hasChanges: false,
    });
  }, [video?.transcription]);

  const updateDraft = useCallback((newText: string) => {
    setEditState(prev => ({
      ...prev,
      draft: newText,
      hasChanges: newText !== (video?.transcription || ""),
    }));
  }, [video?.transcription]);

  const saveChanges = useCallback(async () => {
    if (!editState.hasChanges) return;

    await updateVideoMutation({
      videoId,
      transcription: editState.draft,
    });

    setEditState(prev => ({
      ...prev,
      isEditing: false,
      hasChanges: false,
    }));
  }, [updateVideoMutation, videoId, editState.draft, editState.hasChanges]);

  const cancelEditing = useCallback(() => {
    setEditState({
      isEditing: false,
      draft: "",
      hasChanges: false,
    });
  }, []);

  const clearTranscription = useCallback(async () => {
    await clearTranscriptionMutation({
      id: videoId,
      clearTranscription: true,
    });

    setEditState({
      isEditing: false,
      draft: "",
      hasChanges: false,
    });
  }, [clearTranscriptionMutation, videoId]);

  const getWordCount = useCallback((text?: string) => {
    const content = text || editState.draft || video?.transcription || "";
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }, [editState.draft, video?.transcription]);

  const getCharacterCount = useCallback((text?: string) => {
    const content = text || editState.draft || video?.transcription || "";
    return content.length;
  }, [editState.draft, video?.transcription]);

  const exportTranscription = useCallback((format: "txt" | "srt" | "vtt" | "json" = "txt") => {
    const text = video?.transcription || "";
    if (!text) return null;

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `transcription-${video._id}-${timestamp}.${format}`;

    let content = text;
    
    switch (format) {
      case 'srt':
        // Convert to SRT format (basic implementation)
        const sentences = text.split(/[.!?]+/).filter(s => s.trim());
        content = sentences.map((sentence, index) => {
          const start = index * 5; // 5 seconds per sentence
          const end = (index + 1) * 5;
          return `${index + 1}\n${formatSRTTime(start)} --> ${formatSRTTime(end)}\n${sentence.trim()}\n`;
        }).join('\n');
        break;
        
      case 'vtt':
        content = `WEBVTT\n\n${text}`;
        break;
        
      case 'json':
        content = JSON.stringify({
          videoId: video._id,
          text,
          wordCount: getWordCount(text),
          exportedAt: new Date().toISOString(),
        }, null, 2);
        break;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { filename, content };
  }, [video, getWordCount]);

  return {
    video,
    editState,
    startEditing,
    updateDraft,
    saveChanges,
    cancelEditing,
    clearTranscription,
    getWordCount,
    getCharacterCount,
    exportTranscription,
    isLoading: video === undefined,
  };
}

/**
 * Hook for transcription search and analysis
 */
export function useTranscriptionAnalysis() {
  const [analysis, setAnalysis] = useState<{
    keywords: Array<{ word: string; frequency: number }>;
    sentiment: "positive" | "negative" | "neutral";
    topics: string[];
    readingTime: number;
    speakingTime: number;
  } | null>(null);

  const analyzeTranscription = useCallback(async (text: string) => {
    // Basic analysis implementation
    const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const wordCount = words.length;
    
    // Calculate word frequency
    const wordFreq = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const keywords = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word, frequency]) => ({ word, frequency }));

    // Basic sentiment analysis (placeholder)
    const positiveWords = ["good", "great", "excellent", "amazing", "love", "best"];
    const negativeWords = ["bad", "terrible", "awful", "hate", "worst", "horrible"];
    
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    let sentiment: "positive" | "negative" | "neutral" = "neutral";
    if (positiveCount > negativeCount) sentiment = "positive";
    else if (negativeCount > positiveCount) sentiment = "negative";

    // Estimate reading and speaking time
    const readingTime = Math.ceil(wordCount / 200); // 200 words per minute reading
    const speakingTime = Math.ceil(wordCount / 150); // 150 words per minute speaking

    // Extract basic topics (placeholder)
    const topics = keywords.slice(0, 5).map(k => k.word);

    const result = {
      keywords,
      sentiment,
      topics,
      readingTime,
      speakingTime,
    };

    setAnalysis(result);
    return result;
  }, []);

  const searchInTranscription = useCallback((text: string, query: string) => {
    if (!query.trim()) return [];

    const regex = new RegExp(query.trim(), 'gi');
    const matches: Array<{ text: string; index: number; context: string }> = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      const start = Math.max(0, match.index - 50);
      const end = Math.min(text.length, match.index + match[0].length + 50);
      const context = text.substring(start, end);

      matches.push({
        text: match[0],
        index: match.index,
        context,
      });
    }

    return matches;
  }, []);

  return {
    analyzeTranscription,
    searchInTranscription,
    analysis,
  };
}

// Helper function for SRT time formatting
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}