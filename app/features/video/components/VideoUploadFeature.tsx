import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Video, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Card } from "~/shared/components/card";
import { Button } from "~/shared/components/button";
import { Progress } from "~/shared/components/progress";
import { Alert, AlertDescription } from "~/shared/components/alert";
import { useVideoService } from "~/shared/services/ServiceProvider";
import { useCanvasStore } from "~/features/canvas/services/store/useCanvasStore";
import { Id } from "~/convex/_generated/dataModel";

interface VideoUploadFeatureProps {
  projectId: Id<"projects">;
  position?: { x: number; y: number };
  onUploadComplete?: (videoId: Id<"videos">, nodeId: string) => void;
  onUploadError?: (error: string) => void;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  stage: string;
  error: string | null;
  success: boolean;
}

export function VideoUploadFeature({
  projectId,
  position = { x: 100, y: 100 },
  onUploadComplete,
  onUploadError,
}: VideoUploadFeatureProps) {
  const videoService = useVideoService();
  const { addNode } = useCanvasStore();
  
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    stage: "Ready to upload",
    error: null,
    success: false,
  });

  const handleUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    
    const file = files[0];
    
    // Validate file
    const validation = videoService.validateVideoFile(file);
    if (!validation.isValid) {
      const errorMessage = validation.errors.join(", ");
      setUploadState(prev => ({ ...prev, error: errorMessage }));
      onUploadError?.(errorMessage);
      return;
    }

    setUploadState({
      isUploading: true,
      progress: 0,
      stage: "Starting upload...",
      error: null,
      success: false,
    });

    try {
      const result = await videoService.uploadVideo(file, {
        projectId,
        canvasPosition: position,
        onProgress: (progress) => {
          setUploadState(prev => ({
            ...prev,
            progress: progress * 100,
            stage: progress < 0.5 ? "Uploading file..." : "Processing video...",
          }));
        },
      });

      // Create canvas node
      const nodeId = `video-${result.videoId}`;
      addNode({
        id: nodeId,
        type: "video",
        position,
        data: {
          videoId: result.videoId,
          title: file.name,
          isUploading: false,
          hasTranscription: false,
          metadata: result.metadata,
        },
      });

      setUploadState({
        isUploading: false,
        progress: 100,
        stage: "Upload complete!",
        error: null,
        success: true,
      });

      onUploadComplete?.(result.videoId, nodeId);

      // Reset success state after 3 seconds
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, success: false, progress: 0, stage: "Ready to upload" }));
      }, 3000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      setUploadState({
        isUploading: false,
        progress: 0,
        stage: "Upload failed",
        error: errorMessage,
        success: false,
      });
      onUploadError?.(errorMessage);
    }
  }, [videoService, projectId, position, addNode, onUploadComplete, onUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
    },
    maxFiles: 1,
    disabled: uploadState.isUploading,
  });

  return (
    <div className="w-full max-w-lg">
      <Card 
        {...getRootProps()} 
        className={`
          p-8 border-2 border-dashed transition-all duration-200 cursor-pointer
          ${isDragActive 
            ? 'border-primary bg-primary/5' 
            : uploadState.isUploading 
              ? 'border-muted cursor-not-allowed' 
              : 'border-muted-foreground/25 hover:border-primary hover:bg-primary/5'
          }
          ${uploadState.success ? 'border-green-500 bg-green-50' : ''}
          ${uploadState.error ? 'border-red-500 bg-red-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="text-center space-y-4">
          {/* Icon */}
          <div className="flex justify-center">
            {uploadState.isUploading ? (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            ) : uploadState.success ? (
              <CheckCircle className="h-12 w-12 text-green-500" />
            ) : uploadState.error ? (
              <AlertCircle className="h-12 w-12 text-red-500" />
            ) : (
              <div className="relative">
                <Video className="h-12 w-12 text-muted-foreground" />
                <Upload className="h-6 w-6 text-primary absolute -top-1 -right-1" />
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            {uploadState.isUploading ? (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Uploading Video</h3>
                <p className="text-sm text-muted-foreground">{uploadState.stage}</p>
                <Progress value={uploadState.progress} className="w-full" />
                <p className="text-xs text-muted-foreground">
                  {Math.round(uploadState.progress)}% complete
                </p>
              </div>
            ) : uploadState.success ? (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-green-700">Upload Successful!</h3>
                <p className="text-sm text-green-600">Your video has been added to the canvas</p>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  {isDragActive ? "Drop your video here" : "Upload Video"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isDragActive 
                    ? "Release to upload" 
                    : "Drag & drop a video file or click to browse"
                  }
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports MP4, MOV, AVI, WebM (max 100MB)
                </p>
              </div>
            )}
          </div>

          {/* Browse button */}
          {!uploadState.isUploading && !uploadState.success && !isDragActive && (
            <Button variant="outline" className="mt-4">
              <Upload className="h-4 w-4 mr-2" />
              Browse Files
            </Button>
          )}
        </div>
      </Card>

      {/* Error Alert */}
      {uploadState.error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadState.error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Tips */}
      {!uploadState.isUploading && !uploadState.success && !uploadState.error && (
        <div className="mt-4 text-xs text-muted-foreground space-y-1">
          <p>💡 <strong>Tips for best results:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Use clear audio for better transcription</li>
            <li>Keep videos under 10 minutes for faster processing</li>
            <li>MP4 format provides the best compatibility</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default VideoUploadFeature;