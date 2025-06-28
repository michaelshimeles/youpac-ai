import { Dialog, DialogContent } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { X, Download, Maximize2, Play, Pause, Volume2, VolumeX, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "~/services/shared";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
  duration?: number;
  fileSize?: number;
}

export function VideoPlayerModal({ 
  isOpen, 
  onClose, 
  videoUrl, 
  title,
  duration,
  fileSize
}: VideoPlayerModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoDuration, setVideoDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Format duration
  const formatDuration = (seconds?: number) => {
    if (!seconds && seconds !== 0) return "0:00";
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

  // Show controls temporarily
  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  // Handle play/pause
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    
    if (videoRef.current.paused) {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Handle fullscreen
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        // Try to fullscreen the dialog content element
        const dialogElement = containerRef.current?.closest('[role="dialog"]');
        if (dialogElement) {
          await dialogElement.requestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  // Handle download
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = title || 'video.mp4';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Update video state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Sync initial state
    setIsPlaying(!video.paused);
    setCurrentTime(video.currentTime || 0);
    if (video.duration && !isNaN(video.duration)) {
      setVideoDuration(video.duration);
    }

    const updateTime = () => {
      if (video.currentTime !== undefined && !isNaN(video.currentTime)) {
        setCurrentTime(video.currentTime);
        // Also check if we need to update duration
        if (!videoDuration && video.duration && !isNaN(video.duration) && isFinite(video.duration)) {
          setVideoDuration(video.duration);
        }
      }
    };
    const updatePlayState = () => {
      setIsPlaying(!video.paused);
      showControlsTemporarily();
    };
    const handleLoadStart = () => {
      // Only show loading if the video hasn't loaded metadata yet
      if (video.readyState < 3) {
        setIsLoading(true);
      }
    };
    const handleLoadedData = () => {
      setIsLoading(false);
      setIsPlaying(!video.paused);
    };
    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration) && isFinite(video.duration)) {
        setVideoDuration(video.duration);
      }
    };
    const handleDurationChange = () => {
      if (video.duration && !isNaN(video.duration)) {
        setVideoDuration(video.duration);
      }
    };
    const handleWaiting = () => {
      // Only show loading if we're actually waiting for data
      if (video.readyState < 3) {
        setIsLoading(true);
      }
    };
    const handleCanPlay = () => setIsLoading(false);
    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };
    const handleError = () => setIsLoading(false);

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('play', updatePlayState);
    video.addEventListener('pause', updatePlayState);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('play', updatePlayState);
      video.removeEventListener('pause', updatePlayState);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);
    };
  }, [videoDuration]);

  // Auto-play when modal opens
  useEffect(() => {
    if (isOpen && videoRef.current) {
      // Don't set loading here - let the video events handle it
      videoRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          // Handle autoplay errors
          setIsPlaying(false);
        });
    } else if (!isOpen) {
      // Reset states when modal closes
      setIsPlaying(false);
      setCurrentTime(0);
      setIsLoading(false);
      setVideoDuration(0);
    }
  }, [isOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Handle mouse movement
  useEffect(() => {
    showControlsTemporarily();
  }, [isPlaying]);

  // Ensure play state is synced
  useEffect(() => {
    if (!isOpen || !videoRef.current) return;

    const checkPlayState = () => {
      if (videoRef.current && !videoRef.current.paused && !isPlaying) {
        setIsPlaying(true);
      } else if (videoRef.current && videoRef.current.paused && isPlaying) {
        setIsPlaying(false);
      }
    };

    // Check immediately
    checkPlayState();

    // Check periodically to ensure sync
    const interval = setInterval(checkPlayState, 100);

    return () => clearInterval(interval);
  }, [isOpen, isPlaying]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-5xl p-0 overflow-hidden bg-black rounded-xl"
        ref={containerRef}
      >
        <div 
          className="relative w-full h-full rounded-xl"
          onMouseMove={showControlsTemporarily}
          onMouseLeave={() => isPlaying && setShowControls(false)}
        >
          {/* Header */}
          <div className={cn(
            "absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/90 to-transparent transition-opacity duration-300 rounded-t-xl",
            showControls ? "opacity-100" : "opacity-0"
          )}>
            <div className="flex items-start justify-between">
              <div className="flex-1 mr-4">
                <h2 className="text-white font-semibold text-lg truncate">
                  {title || "Video Player"}
                </h2>
                <div className="flex items-center gap-3 text-white/70 text-sm mt-1">
                  {(videoDuration || duration) && (
                    <span>Duration: {formatDuration(videoDuration || duration)}</span>
                  )}
                  {fileSize && (
                    <>
                      <span>•</span>
                      <span>{formatFileSize(fileSize)}</span>
                    </>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Video */}
          <div className="relative flex items-center justify-center bg-black rounded-xl" style={{ minHeight: "400px" }}>
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full max-h-[80vh] cursor-pointer rounded-xl"
              muted={isMuted}
              onClick={togglePlayPause}
              playsInline
            >
              Your browser does not support the video tag.
            </video>

            {/* Loading indicator */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-12 w-12 text-white animate-spin" />
              </div>
            )}

            {/* Play/Pause overlay - only show when paused */}
            {!isPlaying && !isLoading && (
              <div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                key={isPlaying ? 'playing' : 'paused'}
              >
                <div className="bg-black/50 rounded-full p-6 backdrop-blur-sm">
                  <Play className="h-16 w-16 text-white ml-2" />
                </div>
              </div>
            )}
          </div>

          {/* Bottom controls */}
          <div className={cn(
            "absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 rounded-b-xl",
            showControls ? "opacity-100" : "opacity-0"
          )}>
            {/* Progress bar */}
            <div className="px-4 pb-2">
              <div 
                className="relative h-2 bg-white/20 rounded-full overflow-hidden cursor-pointer group hover:h-3 transition-all"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = x / rect.width;
                  const time = percentage * (videoDuration || duration || 0);
                  if (videoRef.current && !isNaN(time)) {
                    videoRef.current.currentTime = time;
                    setCurrentTime(time);
                  }
                }}
              >
                <div 
                  className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(currentTime / (videoDuration || duration || 1)) * 100}%` }}
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                  style={{ left: `${(currentTime / (videoDuration || duration || 1)) * 100}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                />
              </div>
            </div>

            {/* Control buttons */}
            <div className="px-4 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Play/Pause */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePlayPause}
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                </Button>

                {/* Volume */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsMuted(!isMuted);
                    if (videoRef.current) {
                      videoRef.current.muted = !isMuted;
                    }
                  }}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>

                {/* Time display */}
                <span className="text-white text-sm font-mono">
                  {formatDuration(currentTime)} / {formatDuration(videoDuration || duration || 0)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Download */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDownload}
                  className="text-white hover:bg-white/20"
                >
                  <Download className="h-5 w-5" />
                </Button>

                {/* Fullscreen */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white/20"
                >
                  <Maximize2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}