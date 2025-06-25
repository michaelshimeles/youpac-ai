import { memo } from "react";
import { Handle, Position } from "./ReactFlowComponents";
import { 
  Linkedin,
  MessageSquare,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Bot,
  Brain
} from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

export interface LinkedInNodeData {
  type: "linkedin";
  draft: string;
  status: "idle" | "generating" | "ready" | "error";
  connections: string[];
  generationProgress?: {
    stage: string;
    percent: number;
  };
  lastPrompt?: string;
}

interface LinkedInNodeProps {
  data: LinkedInNodeData & {
    onGenerate?: () => void;
    onChat?: () => void;
    onView?: () => void;
    onRegenerate?: () => void;
    onViewPrompt?: () => void;
  };
  selected?: boolean;
  id: string;
}

// Helper function to clean up draft text
const cleanDraftText = (draft: string): string => {
  if (!draft) return '';
  return draft.trim();
};

export const LinkedInNode = memo(({ data, selected, id }: LinkedInNodeProps) => {
  const statusIcons = {
    idle: null,
    generating: <Loader2 className="h-4 w-4 animate-spin" />,
    ready: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    error: <AlertCircle className="h-4 w-4 text-red-500" />,
  };

  return (
    <div className={`relative group ${selected ? "scale-105" : ""} transition-transform duration-200`}>
      {/* Glow effect when selected */}
      {selected && (
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-blue-500/20 rounded-2xl blur-lg animate-pulse" />
      )}
      
      <Card className={`relative w-72 p-5 border-muted/50 shadow-xl bg-gradient-to-b from-background to-background/90 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl ${selected ? "border-primary/50" : ""}`}>
        <Handle
          type="target"
          position={Position.Left}
          id="linkedin-input"
          className="!w-3 !h-3 !bg-gradient-to-r from-blue-600/20 to-blue-500/20 !border-2 !border-background"
          style={{ top: '50%' }}
        />
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600/20 to-blue-500/20 backdrop-blur-sm">
              <Linkedin className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">LinkedIn Generator</h3>
              <p className="text-xs text-muted-foreground">Professional posts for LinkedIn</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {data.status !== "idle" && (
              <div className="flex items-center gap-1.5">
                {statusIcons[data.status]}
                <Bot className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            )}
            {data.lastPrompt && data.status === "ready" && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 hover:bg-primary/10"
                onClick={data.onViewPrompt}
                title="View generation prompt"
              >
                <Brain className="h-4 w-4 text-primary" />
              </Button>
            )}
          </div>
        </div>
      
        {/* Show progress when generating */}
        {data.status === "generating" && data.generationProgress && (
          <div className="mb-4">
            <div className="rounded-lg bg-primary/10 p-4 border border-primary/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur animate-pulse" />
                  <Loader2 className="relative h-5 w-5 animate-spin text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{data.generationProgress.stage}</p>
                  <p className="text-xs text-muted-foreground">Creating professional LinkedIn content...</p>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out"
                  style={{ width: `${data.generationProgress.percent}%` }}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Regular content display */}
        {data.status !== "generating" && (data.draft ? (
          <div className="mb-4 cursor-pointer group/content" onClick={data.onView}>
            <div className="rounded-lg bg-muted/50 p-4 border border-border/50 transition-all duration-200 hover:bg-muted/70 hover:border-border">
              <p className="text-sm text-foreground/80 line-clamp-3 leading-relaxed">
                {cleanDraftText(data.draft)}
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <div className="rounded-lg bg-gradient-to-br from-muted/30 to-muted/10 p-8 border border-dashed border-muted-foreground/20">
              <div className="text-center">
                <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No LinkedIn post generated yet
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Click Generate to create professional content
                </p>
              </div>
            </div>
          </div>
        ))}
        
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all"
            onClick={data.onChat}
            disabled={data.status === "generating"}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            Chat
          </Button>
          {data.status === "ready" && data.draft ? (
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all"
              onClick={data.onRegenerate}
              disabled={data.status === "generating"}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Regenerate
            </Button>
          ) : (
            <Button 
              size="sm" 
              variant="default" 
              className="flex-1 bg-gradient-to-r from-blue-600/20 to-blue-500/20 hover:opacity-90 transition-all text-foreground font-medium shadow-sm"
              onClick={data.onGenerate}
              disabled={data.status === "generating"}
            >
              {data.status === "generating" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Generate
                </>
              )}
            </Button>
          )}
        </div>
        
        <Handle
          type="source"
          position={Position.Right}
          id="linkedin-output"
          className="!w-3 !h-3 !bg-gradient-to-r from-blue-600/20 to-blue-500/20 !border-2 !border-background"
          style={{ top: '50%' }}
        />
      </Card>
    </div>
  );
});

LinkedInNode.displayName = "LinkedInNode";