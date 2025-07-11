import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "./ReactFlowComponents";
import { Play, Film, Loader2, FileText, AlertCircle, RefreshCw, Sparkles, Clock, HardDrive, Upload, Eye } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

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
  transcriptionProgress?: string | null;
  transcription?: string;
  onVideoClick?: () => void;
  onRetryTranscription?: () => void;
  onUploadTranscription?: () => void;
  onViewTranscription?: () => void;
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
    <div className={`relative group ${selected ? "scale-105" : ""} transition-transform duration-200`}>
      {/* Glow effect when selected */}
      {selected && (
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 rounded-2xl blur-lg animate-pulse" />
      )}
      
      <Card className={`relative w-80 p-5 border-muted/50 shadow-xl bg-gradient-to-b from-background to-background/90 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl ${selected ? "border-primary/50" : ""}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm">
              <Film className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Video Source</h3>
              <p className="text-xs text-muted-foreground">Input media</p>
            </div>
          </div>
          <Sparkles className="h-4 w-4 text-muted-foreground/50" />
        </div>
      
      {videoData.isUploading ? (
        <div className="mb-3 aspect-video bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <Loader2 className="relative h-10 w-10 text-primary animate-spin mx-auto mb-3" />
            </div>
            <p className="text-sm font-medium">Uploading video...</p>
            <p className="text-xs text-muted-foreground mt-1">Please wait</p>
          </div>
        </div>
      ) : videoData.videoUrl ? (
        <div 
          className="relative mb-3 aspect-video bg-black rounded-xl overflow-hidden cursor-pointer group/video shadow-lg"
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
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/50 via-black/20 to-transparent transition-all duration-300 group-hover/video:bg-black/40">
                <div className="relative">
                  <div className="absolute inset-0 bg-white rounded-full blur-xl opacity-50 group-hover/video:opacity-70 transition-opacity" />
                  <div className="relative bg-white rounded-full p-4 shadow-2xl transform transition-all duration-300 group-hover/video:scale-110">
                    <Play className="h-6 w-6 text-black ml-0.5" />
                  </div>
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
        <div className="relative mb-3 aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
          <img 
            src={videoData.thumbnail} 
            alt={videoData.title || "Video thumbnail"} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/50 via-black/20 to-transparent">
            <div className="bg-white/90 rounded-full p-3 shadow-lg">
              <Play className="h-6 w-6 text-gray-800 ml-0.5" />
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-3 aspect-video bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl flex items-center justify-center border border-dashed border-muted-foreground/20">
          <div className="text-center">
            <Film className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No video loaded</p>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground truncate">
            {videoData.title || "Untitled Video"}
          </p>
          
          {/* File info with icons */}
          {(videoData.duration || videoData.fileSize) && (
            <div className="flex items-center gap-3 mt-2">
              {formatDuration(videoData.duration) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatDuration(videoData.duration)}</span>
                </div>
              )}
              {formatFileSize(videoData.fileSize) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <HardDrive className="h-3 w-3" />
                  <span>{formatFileSize(videoData.fileSize)}</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Transcription status card */}
        <div className="rounded-lg bg-muted/50 p-3 border border-border/50">
          {videoData.isExtracting && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur animate-pulse" />
                <Loader2 className="relative h-4 w-4 animate-spin text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium">Extracting audio...</p>
                {videoData.transcriptionProgress && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{videoData.transcriptionProgress}</p>
                )}
              </div>
            </div>
          )}
          {!videoData.isExtracting && videoData.isTranscribing && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur animate-pulse" />
                <Loader2 className="relative h-4 w-4 animate-spin text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium">Transcribing video...</p>
                {videoData.transcriptionProgress && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{videoData.transcriptionProgress}</p>
                )}
              </div>
            </div>
          )}
          {!videoData.isExtracting && !videoData.isTranscribing && videoData.hasTranscription && (
            <div className="flex items-center justify-between gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="flex items-center gap-2 flex-1 cursor-pointer hover:bg-green-500/5 rounded-md p-1 -m-1 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('[VideoNode] Transcription view clicked', {
                          hasCallback: !!videoData.onViewTranscription,
                          hasTranscription: videoData.hasTranscription,
                          transcriptionText: videoData.transcription?.substring(0, 50)
                        });
                        videoData.onViewTranscription?.();
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('[VideoNode] Transcription view key pressed');
                          videoData.onViewTranscription?.();
                        }
                      }}
                    >
                      <div className="p-1 rounded-full bg-green-500/10">
                        <FileText className="h-3.5 w-3.5 text-green-500" />
                      </div>
                      <p className="text-xs font-medium text-green-600">Transcription ready</p>
                      <Eye className="h-3 w-3 text-green-600/70 ml-auto" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Click to view transcription</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {videoData.onRetryTranscription && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 hover:bg-primary/10"
                        onClick={videoData.onRetryTranscription}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Re-transcribe video</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
          {!videoData.isExtracting && !videoData.isTranscribing && videoData.hasTranscription === false && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="space-y-1.5 cursor-help">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-full bg-yellow-500/10">
                        <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />
                      </div>
                      <p className="text-xs font-medium text-yellow-600">
                        {videoData.transcriptionError ? "Transcription failed" : "No transcription"}
                      </p>
                    </div>
                    {videoData.transcriptionError && (
                      <p className="text-[10px] text-muted-foreground pl-7 break-words">
                        {videoData.transcriptionError}
                      </p>
                    )}
                  </div>
                </TooltipTrigger>
                {videoData.transcriptionError && (
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{videoData.transcriptionError}</p>
                    <p className="text-xs text-muted-foreground mt-1">The video was uploaded successfully.</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      
      {/* Error action buttons */}
      {!videoData.isUploading && !videoData.isTranscribing && !videoData.isExtracting && 
       videoData.transcriptionError && (
        <div className="flex gap-2 mt-2">
          {videoData.onRetryTranscription && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 hover:bg-primary/10 hover:border-primary/50 transition-all"
              onClick={videoData.onRetryTranscription}
            >
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Retry
            </Button>
          )}
          {videoData.onUploadTranscription && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 hover:bg-primary/10 hover:border-primary/50 transition-all"
              onClick={videoData.onUploadTranscription}
            >
              <Upload className="h-3 w-3 mr-1.5" />
              Upload
            </Button>
          )}
        </div>
      )}
      
      <Handle
        type="source"
        position={Position.Right}
        id="video-output"
        className="!w-3 !h-3 !bg-gradient-to-r !from-blue-500 !to-cyan-500 !border-2 !border-background"
        style={{ top: '50%' }}
      />
    </Card>
    </div>
  );
});

VideoNode.displayName = "VideoNode";