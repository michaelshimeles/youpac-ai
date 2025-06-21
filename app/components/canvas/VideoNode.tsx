import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Play, Film, Loader2, FileText, AlertCircle } from "lucide-react";
import { Card } from "~/components/ui/card";

export interface VideoNodeData {
  title?: string;
  videoUrl?: string;
  fileId?: string;
  storageId?: string;
  thumbnail?: string;
  isUploading?: boolean;
  isTranscribing?: boolean;
  hasTranscription?: boolean;
  isExtracting?: boolean;
  extractionProgress?: number;
  transcriptionError?: string | null;
}

export const VideoNode = memo(({ data, selected }: NodeProps) => {
  const videoData = data as VideoNodeData;
  return (
    <Card className={`w-80 p-4 ${selected ? "ring-2 ring-primary" : ""}`}>
      <div className="flex items-center gap-2 mb-3">
        <Film className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Video</h3>
      </div>
      
      {videoData.isUploading ? (
        <div className="mb-3 aspect-video bg-muted rounded flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Uploading...</p>
          </div>
        </div>
      ) : videoData.videoUrl ? (
        <div className="relative mb-3 aspect-video bg-black rounded overflow-hidden">
          <video
            src={videoData.videoUrl}
            controls
            className="w-full h-full"
            preload="metadata"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      ) : videoData.thumbnail ? (
        <div className="relative mb-3 aspect-video bg-muted rounded overflow-hidden">
          <img 
            src={videoData.thumbnail} 
            alt={videoData.title || "Video thumbnail"} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Play className="h-8 w-8 text-white" />
          </div>
        </div>
      ) : (
        <div className="mb-3 aspect-video bg-muted rounded flex items-center justify-center">
          <Film className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      
      <div className="space-y-1">
        <p className="text-sm font-medium truncate">
          {videoData.title || "Untitled Video"}
        </p>
        
        {/* Transcription status */}
        {videoData.isExtracting && (
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Extracting audio... {videoData.extractionProgress ? `${videoData.extractionProgress}%` : ''}</span>
          </div>
        )}
        {!videoData.isExtracting && videoData.isTranscribing && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Transcribing...</span>
          </div>
        )}
        {!videoData.isExtracting && !videoData.isTranscribing && videoData.hasTranscription && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <FileText className="h-3 w-3" />
            <span>Transcribed</span>
          </div>
        )}
        {!videoData.isExtracting && !videoData.isTranscribing && videoData.hasTranscription === false && (
          <div className="flex items-center gap-1 text-xs text-yellow-600" title={videoData.transcriptionError || undefined}>
            <AlertCircle className="h-3 w-3" />
            <span>{videoData.transcriptionError ? "Transcription failed" : "No transcription"}</span>
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        id="video-output"
        style={{ background: "#555" }}
      />
    </Card>
  );
});

VideoNode.displayName = "VideoNode";