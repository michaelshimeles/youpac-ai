import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "./ReactFlowComponents";
import { FileText, Clock, Hash, Eye, Download, Copy, Check, Edit2 } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { toast } from "sonner";

export interface ArticleNodeData {
  articleId?: string;
  title?: string;
  content?: string;
  format?: string;
  wordCount?: number;
  fileName?: string;
  uploadedAt?: number;
  onView?: () => void;
  onEdit?: () => void;
  isBeingUsed?: boolean;
}

export const ArticleNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as ArticleNodeData;
  const [copied, setCopied] = useState(false);

  const formatWordCount = (wordCount?: number) => {
    if (!wordCount) return null;
    return `${wordCount.toLocaleString()} words`;
  };

  const formatReadingTime = (wordCount?: number) => {
    if (!wordCount) return null;
    const wordsPerMinute = 200;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
  };

  const handleCopy = async () => {
    if (!nodeData.content) return;
    
    try {
      await navigator.clipboard.writeText(nodeData.content);
      setCopied(true);
      toast.success("Article copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy article");
    }
  };

  const handleDownload = () => {
    if (!nodeData.content || !nodeData.title) return;
    
    const mimeType = (nodeData.format === 'md' || nodeData.format === 'markdown') ? 'text/markdown' : 'text/plain';
    const blob = new Blob([nodeData.content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nodeData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${nodeData.format || 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Article downloaded!");
  };

  return (
    <div className={`relative group ${selected ? "scale-105" : ""} transition-transform duration-200`}>
      {/* Glow effect when selected or being used */}
      {(selected || nodeData.isBeingUsed) && (
        <div className={`absolute -inset-1 bg-gradient-to-r from-orange-500/20 via-red-500/20 to-orange-500/20 rounded-2xl blur-lg ${
          nodeData.isBeingUsed ? 'animate-pulse' : ''
        }`} />
      )}
      
      {/* Active usage indicator */}
      {nodeData.isBeingUsed && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="relative">
            <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping" />
            <div className="relative bg-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span>In Use</span>
            </div>
          </div>
        </div>
      )}
      
      <Card className={`relative w-80 p-5 border-muted/50 shadow-xl bg-gradient-to-b from-background to-background/90 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl ${
        selected ? "border-primary/50" : ""
      } ${nodeData.isBeingUsed ? "border-orange-500/50 ring-2 ring-orange-500/20" : ""}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-sm">
              <FileText className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Article</h3>
              <p className="text-xs text-muted-foreground">Written content</p>
            </div>
          </div>
          <span className="text-xs font-mono text-muted-foreground uppercase bg-muted/50 px-2 py-1 rounded">
            {nodeData.format || "TEXT"}
          </span>
        </div>

        {/* Article info */}
        <div className="mb-4 p-3 bg-muted/30 rounded-lg space-y-2">
          <p className="text-sm font-medium truncate" title={nodeData.title}>
            {nodeData.title || "Untitled Article"}
          </p>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {formatWordCount(nodeData.wordCount) && (
              <div className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                <span>{formatWordCount(nodeData.wordCount)}</span>
              </div>
            )}
            {formatReadingTime(nodeData.wordCount) && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatReadingTime(nodeData.wordCount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Preview of article */}
        {nodeData.content && (
          <div className="mb-4 p-3 bg-muted/20 rounded-lg">
            <p className="text-xs text-muted-foreground line-clamp-3">
              {nodeData.content.substring(0, 150)}...
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
                  Read
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Read full article</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nodeData.onEdit}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Edit article</p>
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
                <p className="text-xs">Download article</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Handles for connections */}
        <Handle
          type="target"
          position={Position.Left}
          id="article-input"
          className="!w-3 !h-3 !bg-gradient-to-r !from-orange-500 !to-red-500 !border-2 !border-background"
          style={{ top: '50%' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="article-output"
          className="!w-3 !h-3 !bg-gradient-to-r !from-orange-500 !to-red-500 !border-2 !border-background"
          style={{ top: '50%' }}
        />
      </Card>
    </div>
  );
});

ArticleNode.displayName = "ArticleNode";