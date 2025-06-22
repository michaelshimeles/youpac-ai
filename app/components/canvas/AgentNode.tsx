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
  RefreshCw
} from "lucide-react";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

export interface AgentNodeData {
  type: "title" | "description" | "thumbnail" | "tweets";
  draft: string;
  thumbnailUrl?: string;
  status: "idle" | "generating" | "ready" | "error";
  connections: string[];
}

const agentConfig = {
  title: {
    icon: FileText,
    label: "Title Agent",
    color: "text-blue-500",
  },
  description: {
    icon: FileText,
    label: "Description Agent",
    color: "text-green-500",
  },
  thumbnail: {
    icon: Image,
    label: "Thumbnail Agent",
    color: "text-purple-500",
  },
  tweets: {
    icon: Twitter,
    label: "Tweets Agent",
    color: "text-sky-500",
  },
};

interface ExtendedNodeProps {
  data: AgentNodeData & {
    onGenerate?: () => void;
    onChat?: () => void;
    onView?: () => void;
    onRegenerate?: () => void;
  };
  selected?: boolean;
  id: string;
}

export const AgentNode = memo(({ data, selected, id }: ExtendedNodeProps) => {
  const config = agentConfig[data.type];
  const Icon = config.icon;

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
    <Card className={`w-72 p-4 ${selected ? "ring-2 ring-primary" : ""}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="agent-input"
        style={{ background: "#555" }}
      />
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${config.color}`} />
          <h3 className="font-semibold">{config.label}</h3>
        </div>
        <Badge variant={statusColors[data.status]} className="flex items-center gap-1">
          {statusIcons[data.status]}
          {data.status}
        </Badge>
      </div>
      
      {data.type === "thumbnail" && data.thumbnailUrl ? (
        <div className="mb-3 cursor-pointer" onClick={data.onView}>
          <div className="aspect-video relative rounded-lg overflow-hidden bg-muted">
            <img 
              src={data.thumbnailUrl} 
              alt="Generated thumbnail" 
              className="w-full h-full object-cover"
            />
          </div>
          {data.draft && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {data.draft}
            </p>
          )}
        </div>
      ) : data.draft ? (
        <div className="mb-3 cursor-pointer hover:bg-muted/50 rounded p-2 -m-2 transition-colors" onClick={data.onView}>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {data.draft}
          </p>
        </div>
      ) : (
        <div className="mb-3 p-4 border-2 border-dashed border-muted rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            No content generated yet
          </p>
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          className="flex-1"
          onClick={data.onChat}
          disabled={data.status === "generating"}
        >
          <MessageSquare className="h-3 w-3 mr-1" />
          Chat
        </Button>
        {data.status === "ready" && data.draft ? (
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={data.onRegenerate}
            disabled={data.status === "generating"}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Regenerate
          </Button>
        ) : (
          <Button 
            size="sm" 
            variant="default" 
            className="flex-1"
            onClick={data.onGenerate}
            disabled={data.status === "generating"}
          >
            {data.status === "generating" ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate"
            )}
          </Button>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        id="agent-output"
        style={{ background: "#555" }}
      />
    </Card>
  );
});

AgentNode.displayName = "AgentNode";