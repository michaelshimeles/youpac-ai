import { memo } from "react";
import { Handle, Position, type NodeProps } from "./ReactFlowComponents";
import { 
  FileText, 
  Image, 
  Twitter, 
  MessageSquare,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Hash,
  Palette,
  Zap,
  Bot,
  Brain,
  Files,
  Download
} from "lucide-react";
import { Card } from "~/shared/components/card";
import { Badge } from "~/shared/components/badge";
import { Button } from "~/shared/components/button";

export interface AgentNodeData {
  type: "title" | "description" | "thumbnail" | "tweets";
  draft: string;
  thumbnailUrl?: string;
  status: "idle" | "generating" | "ready" | "error";
  connections: string[];
  generationProgress?: {
    stage: string;
    percent: number;
  };
  lastPrompt?: string;
  hasManualTranscriptions?: boolean;
  manualTranscriptionCount?: number;
  hasMoodBoard?: boolean;
  moodBoardCount?: number;
}

const agentConfig = {
  title: {
    icon: Hash,
    label: "Title Generator",
    description: "Create engaging titles",
    color: "blue",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-500",
  },
  description: {
    icon: FileText,
    label: "Description Writer",
    description: "SEO-optimized descriptions",
    color: "green",
    gradient: "from-green-500/20 to-emerald-500/20",
    iconColor: "text-green-500",
  },
  thumbnail: {
    icon: Palette,
    label: "Thumbnail Designer",
    description: "Eye-catching visuals",
    color: "purple",
    gradient: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-500",
  },
  tweets: {
    icon: Zap,
    label: "Social Media",
    description: "Viral tweets & posts",
    color: "yellow",
    gradient: "from-yellow-500/20 to-orange-500/20",
    iconColor: "text-yellow-500",
  },
};

interface ExtendedNodeProps {
  data: AgentNodeData & {
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
const cleanDraftText = (draft: string, type: string): string => {
  if (!draft) return '';
  
  // For title type, remove common markdown patterns
  if (type === 'title') {
    // Remove **Title: prefix and trailing **
    let cleaned = draft.replace(/^\*\*Title:\s*/i, '');
    cleaned = cleaned.replace(/\*\*/g, '');
    // Remove quotes if they wrap the entire title
    cleaned = cleaned.trim();
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }
    return cleaned.trim();
  }
  
  return draft;
};

export const AgentNode = memo(({ data, selected, id }: ExtendedNodeProps) => {
  const config = agentConfig[data.type];
  const Icon = config.icon;
  
  const handleDownloadThumbnail = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the view modal
    
    if (!data.thumbnailUrl) return;
    
    try {
      const response = await fetch(data.thumbnailUrl);
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      a.download = `youtube-thumbnail-${timestamp}.png`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download thumbnail:", error);
    }
  };

  const statusIcons = {
    idle: null,
    generating: <Loader2 className="h-4 w-4 animate-spin" />,
    ready: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    error: <AlertCircle className="h-4 w-4 text-red-500" />,
  };

  const statusColors = {
    idle: "secondary",
    generating: "default",
    ready: "default", // Changed from "success" since that variant doesn't exist
    error: "destructive",
  } as const;

  return (
    <div className={`relative group ${selected ? "scale-105" : ""} transition-transform duration-200`}>
      {/* Glow effect when selected */}
      {selected && (
        <div className={`absolute -inset-1 bg-gradient-to-r ${config.gradient} rounded-2xl blur-lg animate-pulse`} />
      )}
      
      <Card className={`relative w-72 p-5 border-muted/50 shadow-xl bg-gradient-to-b from-background to-background/90 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl ${selected ? "border-primary/50" : ""}`}>
        <Handle
          type="target"
          position={Position.Left}
          id="agent-input"
          className={`!w-3 !h-3 !bg-gradient-to-r ${config.gradient} !border-2 !border-background`}
          style={{ top: '50%' }}
        />
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${config.gradient} backdrop-blur-sm`}>
              <Icon className={`h-5 w-5 ${config.iconColor}`} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{config.label}</h3>
              <p className="text-xs text-muted-foreground">{config.description}</p>
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
        
        {/* Manual transcription indicator */}
        {data.hasManualTranscriptions && (
          <div className={`mb-3 flex items-center gap-2 text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-md transition-all ${
            data.status === 'generating' ? 'animate-pulse ring-2 ring-purple-500/50 ring-offset-2 ring-offset-background' : ''
          }`}>
            <Files className={`h-3.5 w-3.5 ${data.status === 'generating' ? 'animate-bounce' : ''}`} />
            <span>{data.status === 'generating' ? 'Processing' : 'Using'} {data.manualTranscriptionCount} manual transcription{data.manualTranscriptionCount! > 1 ? 's' : ''}</span>
            {data.status === 'generating' && (
              <div className="flex gap-0.5">
                <div className="w-1 h-1 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1 h-1 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1 h-1 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
              </div>
            )}
          </div>
        )}
        
        {/* Mood board indicator */}
        {data.hasMoodBoard && (
          <div className={`mb-3 flex items-center gap-2 text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-md transition-all ${
            data.status === 'generating' ? 'animate-pulse ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-background' : ''
          }`}>
            <Sparkles className={`h-3.5 w-3.5 ${data.status === 'generating' ? 'animate-bounce' : ''}`} />
            <span>{data.status === 'generating' ? 'Applying' : 'Using'} {data.moodBoardCount} mood board reference{data.moodBoardCount! > 1 ? 's' : ''}</span>
            {data.status === 'generating' && (
              <div className="flex gap-0.5">
                <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
              </div>
            )}
          </div>
        )}
      
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
                <p className="text-xs text-muted-foreground">Generating amazing content...</p>
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
      {data.status !== "generating" && (data.type === "thumbnail" && data.thumbnailUrl ? (
        <div className="mb-4">
          <div className="relative group/thumbnail">
            <div className="aspect-video relative rounded-xl overflow-hidden bg-black shadow-lg transition-all duration-300 hover:shadow-xl cursor-pointer" onClick={data.onView}>
              <img 
                src={data.thumbnailUrl} 
                alt="Generated thumbnail" 
                className="w-full h-full object-cover transition-transform duration-300 group-hover/thumbnail:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover/thumbnail:opacity-100 transition-opacity" />
            </div>
            {/* Download button overlay */}
            <Button
              size="icon"
              variant="secondary"
              className="absolute bottom-2 right-2 h-8 w-8 opacity-0 group-hover/thumbnail:opacity-100 transition-opacity shadow-lg"
              onClick={handleDownloadThumbnail}
              title="Download thumbnail"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
          {data.draft && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2 px-1">
              {cleanDraftText(data.draft, data.type)}
            </p>
          )}
        </div>
      ) : data.draft ? (
        <div className="mb-4 cursor-pointer group/content" onClick={data.onView}>
          <div className="rounded-lg bg-muted/50 p-4 border border-border/50 transition-all duration-200 hover:bg-muted/70 hover:border-border">
            <p className="text-sm text-foreground/80 line-clamp-3 leading-relaxed">
              {cleanDraftText(data.draft, data.type)}
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <div className="rounded-lg bg-gradient-to-br from-muted/30 to-muted/10 p-8 border border-dashed border-muted-foreground/20">
            <div className="text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No content generated yet
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Click Generate to create content
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
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Regenerate
          </Button>
        ) : (
          <Button 
            size="sm" 
            variant="default" 
            className={`flex-1 bg-gradient-to-r ${config.gradient} hover:opacity-90 transition-all text-foreground font-medium shadow-sm`}
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
        id="agent-output"
        className={`!w-3 !h-3 !bg-gradient-to-r ${config.gradient} !border-2 !border-background`}
        style={{ top: '50%' }}
      />
    </Card>
    </div>
  );
});

AgentNode.displayName = "AgentNode";