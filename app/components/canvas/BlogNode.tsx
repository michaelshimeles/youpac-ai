import { memo } from "react";
import { Handle, Position } from "./ReactFlowComponents";
import { 
  FileText,
  MessageSquare,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Bot,
  Brain,
  Hash,
  BookOpen
} from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

export interface BlogNodeData {
  type: "blog";
  draft: string;
  status: "idle" | "generating" | "ready" | "error";
  connections: string[];
  generationProgress?: {
    stage: string;
    percent: number;
  };
  lastPrompt?: string;
}

interface BlogNodeProps {
  data: BlogNodeData & {
    onGenerate?: () => void;
    onChat?: () => void;
    onView?: () => void;
    onRegenerate?: () => void;
    onViewPrompt?: () => void;
  };
  selected?: boolean;
  id: string;
}

// Helper function to parse and display blog data
const getBlogPreview = (draft: string) => {
  if (!draft) return { title: '', wordCount: 0, hasKeywords: false };
  
  try {
    const blogData = JSON.parse(draft);
    const wordCount = blogData.content ? blogData.content.replace(/<[^>]*>/g, '').split(' ').length : 0;
    return {
      title: blogData.title || 'Blog Post',
      wordCount,
      hasKeywords: Array.isArray(blogData.keywords) && blogData.keywords.length > 0
    };
  } catch {
    const wordCount = draft.split(' ').length;
    return { title: 'Blog Post', wordCount, hasKeywords: false };
  }
};

export const BlogNode = memo(({ data, selected, id }: BlogNodeProps) => {
  const statusIcons = {
    idle: null,
    generating: <Loader2 className="h-4 w-4 animate-spin" />,
    ready: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    error: <AlertCircle className="h-4 w-4 text-red-500" />,
  };

  const { title, wordCount, hasKeywords } = getBlogPreview(data.draft);

  return (
    <div className={`relative group ${selected ? "scale-105" : ""} transition-transform duration-200`}>
      {/* Glow effect when selected */}
      {selected && (
        <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl blur-lg animate-pulse" />
      )}
      
      <Card className={`relative w-72 p-5 border-muted/50 shadow-xl bg-gradient-to-b from-background to-background/90 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl ${selected ? "border-primary/50" : ""}`}>
        <Handle
          type="target"
          position={Position.Left}
          id="blog-input"
          className="!w-3 !h-3 !bg-gradient-to-r from-green-500/20 to-emerald-500/20 !border-2 !border-background"
          style={{ top: '50%' }}
        />
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Blog Generator</h3>
              <p className="text-xs text-muted-foreground">SEO-optimized blog posts</p>
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
                  <p className="text-xs text-muted-foreground">Creating SEO-optimized blog content...</p>
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
              <h4 className="font-medium text-sm text-foreground mb-2 line-clamp-2 leading-snug">
                {title}
              </h4>
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  <span>~{wordCount} words</span>
                </div>
                {hasKeywords && (
                  <div className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    <span>SEO optimized</span>
                  </div>
                )}
              </div>
              
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                  Blog Post
                </Badge>
                {data.status === "ready" && (
                  <Badge variant="outline" className="text-xs">
                    Ready
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <div className="rounded-lg bg-gradient-to-br from-muted/30 to-muted/10 p-8 border border-dashed border-muted-foreground/20">
              <div className="text-center">
                <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No blog post generated yet
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Connect a source and click Generate
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
              className="flex-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:opacity-90 transition-all text-foreground font-medium shadow-sm"
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
          id="blog-output"
          className="!w-3 !h-3 !bg-gradient-to-r from-green-500/20 to-emerald-500/20 !border-2 !border-background"
          style={{ top: '50%' }}
        />
      </Card>
    </div>
  );
});

BlogNode.displayName = "BlogNode";