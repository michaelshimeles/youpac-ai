import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "./ReactFlowComponents";
import { FileText, Clock, Hash, Eye, Download, Copy, Check } from "lucide-react";
import { Card } from "~/shared/components/card";
import { Button } from "~/shared/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/shared/components/tooltip";
import { toast } from "sonner";

export interface TranscriptionNodeData {
  fileName?: string;
  format?: string;
  transcription?: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  wordCount?: number;
  duration?: number;
  uploadedAt?: number;
  onView?: () => void;
  onDownload?: () => void;
  isBeingUsed?: boolean; // Add flag to indicate if being used in generation
}

export const TranscriptionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as TranscriptionNodeData;
  const [copied, setCopied] = useState(false);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (wordCount?: number) => {
    if (!wordCount) return null;
    return `${wordCount.toLocaleString()} words`;
  };

  const handleCopy = async () => {
    if (!nodeData.transcription) return;
    
    try {
      await navigator.clipboard.writeText(nodeData.transcription);
      setCopied(true);
      toast.success("Transcription copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy transcription");
    }
  };

  const handleDownload = () => {
    if (!nodeData.transcription) return;
    
    const blob = new Blob([nodeData.transcription], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nodeData.fileName || 'transcription'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Transcription downloaded!");
  };

  return (
    <div className={`relative group ${selected ? "scale-105" : ""} transition-transform duration-200`}>
      {/* Glow effect when selected or being used */}
      {(selected || nodeData.isBeingUsed) && (
        <div className={`absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 rounded-2xl blur-lg ${
          nodeData.isBeingUsed ? 'animate-pulse' : ''
        }`} />
      )}
      
      {/* Active usage indicator */}
      {nodeData.isBeingUsed && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping" />
            <div className="relative bg-purple-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span>In Use</span>
            </div>
          </div>
        </div>
      )}
      
      <Card className={`relative w-80 p-5 border-muted/50 shadow-xl bg-gradient-to-b from-background to-background/90 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl ${
        selected ? "border-primary/50" : ""
      } ${nodeData.isBeingUsed ? "border-purple-500/50 ring-2 ring-purple-500/20" : ""}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm">
              <FileText className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Transcription</h3>
              <p className="text-xs text-muted-foreground">Manual upload</p>
            </div>
          </div>
          <span className="text-xs font-mono text-muted-foreground uppercase bg-muted/50 px-2 py-1 rounded">
            {nodeData.format || "TXT"}
          </span>
        </div>

        {/* File info */}
        <div className="mb-4 p-3 bg-muted/30 rounded-lg space-y-2">
          <p className="text-sm font-medium truncate" title={nodeData.fileName}>
            {nodeData.fileName || "Untitled Transcription"}
          </p>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {formatFileSize(nodeData.wordCount) && (
              <div className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                <span>{formatFileSize(nodeData.wordCount)}</span>
              </div>
            )}
            {formatDuration(nodeData.duration) && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatDuration(nodeData.duration)}</span>
              </div>
            )}
          </div>
          
          {nodeData.segments && (
            <p className="text-xs text-muted-foreground">
              {nodeData.segments.length} segments with timestamps
            </p>
          )}
        </div>

        {/* Preview of transcription */}
        {nodeData.transcription && (
          <div className="mb-4 p-3 bg-muted/20 rounded-lg">
            <p className="text-xs text-muted-foreground line-clamp-3">
              {nodeData.transcription.substring(0, 150)}...
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={nodeData.onView}
                >
                  <Eye className="h-3 w-3 mr-1.5" />
                  View
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">View full transcription</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{copied ? "Copied!" : "Copy to clipboard"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Download transcription</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Handles for connections */}
        <Handle
          type="target"
          position={Position.Left}
          id="transcription-input"
          className="!w-3 !h-3 !bg-gradient-to-r !from-purple-500 !to-pink-500 !border-2 !border-background"
          style={{ top: '50%' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="transcription-output"
          className="!w-3 !h-3 !bg-gradient-to-r !from-purple-500 !to-pink-500 !border-2 !border-background"
          style={{ top: '50%' }}
        />
      </Card>
    </div>
  );
});

TranscriptionNode.displayName = "TranscriptionNode";