import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "./ReactFlowComponents";
import { Play, Film, Loader2, FileText, AlertCircle } from "lucide-react";
import { Card } from "~/components/ui/card";

export interface VideoNodeData {
  title?: string;
  videoUrl?: string;
  fileId?: string;
  storageId?: string;
  thumbnail?: string;
  duration?: number; // in seconds
  fileSize?: number; // in bytes
  isUploading?: boolean;
  isTranscribing?: boolean;
  hasTranscription?: boolean;
  isExtracting?: boolean;
  extractionProgress?: number;
  transcriptionError?: string | null;
  onVideoClick?: () => void;
}

export const VideoNode = memo(({ data, selected }: NodeProps) => {
  const videoData = data as VideoNodeData;
  const [isHovering, setIsHovering] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  
  // Format duration from seconds to mm:ss
  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };
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
        <div 
          className="relative mb-3 aspect-video bg-black rounded overflow-hidden cursor-pointer"
          onClick={() => {
            if (videoData.onVideoClick) {
              videoData.onVideoClick();
            }
          }}
          onMouseEnter={() => {
            setIsHovering(true);
            // Delay preview to avoid flickering on quick hovers
            hoverTimeoutRef.current = setTimeout(() => {
              setShowPreview(true);
              if (videoRef.current) {
                videoRef.current.currentTime = 0;
                videoRef.current.play().catch(() => {
                  // Ignore autoplay errors
                });
              }
            }, 300);
          }}
          onMouseLeave={() => {
            setIsHovering(false);
            setShowPreview(false);
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
            }
            if (videoRef.current) {
              videoRef.current.pause();
              videoRef.current.currentTime = 0;
            }
          }}
        >
          {/* Thumbnail/Static view */}
          {!showPreview && (
            <>
              <video
                src={videoData.videoUrl}
                className="w-full h-full object-cover"
                preload="metadata"
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-all duration-200 hover:bg-black/40">
                <div className="bg-white/90 rounded-full p-3 shadow-lg transform transition-transform hover:scale-110">
                  <Play className="h-6 w-6 text-gray-800 ml-0.5" />
                </div>
              </div>
              {/* Duration badge */}
              {formatDuration(videoData.duration) && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                  {formatDuration(videoData.duration)}
                </div>
              )}
            </>
          )}
          
          {/* Preview video */}
          {showPreview && (
            <video
              ref={videoRef}
              src={videoData.videoUrl}
              className="w-full h-full object-cover"
              muted
              loop
              playsInline
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
          )}
          
          {/* Hover indicator */}
          {isHovering && !showPreview && (
            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded animate-pulse">
              Loading preview...
            </div>
          )}
          
          {/* Preview indicator */}
          {showPreview && (
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Preview
            </div>
          )}
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
        
        {/* File info */}
        {(videoData.duration || videoData.fileSize) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {formatDuration(videoData.duration) && (
              <span>{formatDuration(videoData.duration)}</span>
            )}
            {formatDuration(videoData.duration) && formatFileSize(videoData.fileSize) && (
              <span>•</span>
            )}
            {formatFileSize(videoData.fileSize) && (
              <span>{formatFileSize(videoData.fileSize)}</span>
            )}
          </div>
        )}
        
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