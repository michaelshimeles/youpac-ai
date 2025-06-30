import { useState, useCallback } from "react";
import { Upload, FileText, X, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "~/shared/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/shared/components/dialog";
import { Progress } from "~/shared/components/progress";
import { toast } from "sonner";
import { parseTranscriptionFile, validateTranscription, showValidationResults } from "~/features/video/services/utils/transcription-parser";
import type { ParsedTranscription } from "~/features/video/services/utils/transcription-parser";

interface TranscriptionUploadProps {
  videoId: string;
  videoDuration?: number;
  onUploadComplete: (transcription: ParsedTranscription, file: File) => Promise<void>;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TranscriptionUpload({ 
  videoId, 
  videoDuration, 
  onUploadComplete,
  trigger,
  open,
  onOpenChange
}: TranscriptionUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const controlledOpen = open !== undefined ? open : isOpen;
  const setControlledOpen = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setIsOpen(newOpen);
    }
  };
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedTranscription, setParsedTranscription] = useState<ParsedTranscription | null>(null);

  const handleFile = useCallback(async (file: File) => {
    // Validate file type
    const validExtensions = ['srt', 'vtt', 'webvtt', 'txt', 'json'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (!extension || !validExtensions.includes(extension)) {
      toast.error(`Invalid file type. Supported formats: ${validExtensions.join(', ')}`);
      return;
    }

    // Validate file size (10MB limit for transcriptions)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB');
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);
    setUploadProgress(20);

    try {
      // Parse the transcription file
      const parsed = await parseTranscriptionFile(file);
      setUploadProgress(50);
      
      // Validate the transcription
      const validation = validateTranscription(parsed, videoDuration);
      setUploadProgress(70);
      
      console.log('Validation result:', validation);
      
      if (!showValidationResults(validation)) {
        console.log('Validation failed, stopping upload process');
        setIsProcessing(false);
        setUploadProgress(0);
        return;
      }

      setParsedTranscription(parsed);
      setUploadProgress(100);
      setIsProcessing(false); // Reset processing state after successful parsing
      
      // Show preview
      toast.success(`Parsed ${parsed.segments.length} segments from ${parsed.format.toUpperCase()} file`);
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to parse transcription file');
      setIsProcessing(false);
      setUploadProgress(0);
    }
  }, [videoDuration]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleUpload = async () => {
    console.log('handleUpload called', { selectedFile, parsedTranscription, isProcessing });
    
    if (!selectedFile || !parsedTranscription) {
      console.log('Missing file or transcription data');
      return;
    }
    
    setIsProcessing(true);
    try {
      console.log('Calling onUploadComplete...');
      await onUploadComplete(parsedTranscription, selectedFile);
      toast.success('Transcription uploaded successfully');
      setControlledOpen(false);
      resetState();
    } catch (error) {
      toast.error('Failed to upload transcription');
      console.error('Upload error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setParsedTranscription(null);
    setUploadProgress(0);
    setIsProcessing(false);
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setControlledOpen(true)}>{trigger}</div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setControlledOpen(true)}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload Transcription
        </Button>
      )}

      <Dialog open={controlledOpen} onOpenChange={(newOpen) => {
        setControlledOpen(newOpen);
        if (!newOpen) resetState();
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Transcription</DialogTitle>
            <DialogDescription>
              Upload a transcription file when automatic transcription fails or for better accuracy.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              } ${selectedFile ? 'opacity-50 pointer-events-none' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".srt,.vtt,.webvtt,.txt,.json"
                onChange={handleFileSelect}
                className="hidden"
                id="transcription-upload"
                disabled={!!selectedFile}
              />
              <label
                htmlFor="transcription-upload"
                className="cursor-pointer space-y-2"
              >
                <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">
                  Drop transcription file here or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports SRT, VTT, TXT, and JSON formats (max 10MB)
                </p>
              </label>
            </div>

            {/* Progress */}
            {isProcessing && uploadProgress < 100 && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Processing transcription file...
                </p>
              </div>
            )}

            {/* File preview */}
            {selectedFile && parsedTranscription && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Format: {parsedTranscription.format.toUpperCase()} • 
                      Segments: {parsedTranscription.segments.length} • 
                      Words: {parsedTranscription.fullText.split(' ').length}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={resetState}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Preview first few lines */}
                <div className="bg-background/50 rounded p-3 max-h-32 overflow-y-auto">
                  <p className="text-xs font-mono whitespace-pre-wrap">
                    {parsedTranscription.fullText.slice(0, 300)}
                    {parsedTranscription.fullText.length > 300 && '...'}
                  </p>
                </div>
              </div>
            )}

            {/* Help text */}
            <div className="rounded-lg bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-medium flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5" />
                File format examples:
              </p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>• <span className="font-mono">SRT</span>: Standard subtitle format with timestamps</p>
                <p>• <span className="font-mono">VTT</span>: Web subtitle format (WebVTT)</p>
                <p>• <span className="font-mono">TXT</span>: Plain text with optional [00:00:00] timestamps</p>
                <p>• <span className="font-mono">JSON</span>: Array of {`{start, end, text}`} objects</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setControlledOpen(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!parsedTranscription || isProcessing}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {isProcessing ? 'Processing...' : 'Upload Transcription'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}