import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "./ReactFlowComponents";
import { Link, Music, Video, Image, Plus, X, Globe, Sparkles, Loader2 } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { toast } from "sonner";
import { useAction } from "convex/react";
import { api } from "convex/_generated/api";

export interface MoodBoardItem {
  id: string;
  url: string;
  title?: string;
  type: "youtube" | "music" | "image" | "other";
  thumbnail?: string;
  metadata?: {
    author?: string;
    description?: string;
    duration?: number;
  };
  loading?: boolean;
}

export interface MoodBoardNodeData {
  items: MoodBoardItem[];
  onAddItem?: (item: MoodBoardItem) => void;
  onRemoveItem?: (id: string) => void;
  onUpdateItem?: (id: string, item: MoodBoardItem) => void;
  isBeingUsed?: boolean;
}

const getItemIcon = (type: string) => {
  switch (type) {
    case "youtube":
      return <Video className="h-4 w-4" />;
    case "music":
      return <Music className="h-4 w-4" />;
    case "image":
      return <Image className="h-4 w-4" />;
    default:
      return <Globe className="h-4 w-4" />;
  }
};

const detectUrlType = (url: string): MoodBoardItem["type"] => {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    return "youtube";
  } else if (url.includes("spotify.com") || url.includes("soundcloud.com") || url.includes("music")) {
    return "music";
  } else if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return "image";
  }
  return "other";
};

const extractYouTubeId = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?]*)/);
  return match ? match[1] : null;
};

export const MoodBoardNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as MoodBoardNodeData;
  const [isAdding, setIsAdding] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  
  const fetchUrlMetadata = useAction(api.moodboardUtils.fetchUrlMetadata);

  const handleAddItem = async () => {
    if (!newUrl.trim()) return;

    try {
      new URL(newUrl); // Validate URL
      
      const type = detectUrlType(newUrl);
      const newItem: MoodBoardItem = {
        id: Date.now().toString(),
        url: newUrl,
        type,
        title: newUrl,
        loading: true,
      };

      // Extract YouTube thumbnail if applicable
      if (type === "youtube") {
        const videoId = extractYouTubeId(newUrl);
        if (videoId) {
          newItem.thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }
      } else if (type === "image") {
        newItem.thumbnail = newUrl;
      }

      // Add item immediately with loading state
      if (nodeData.onAddItem) {
        nodeData.onAddItem(newItem);
      }
      
      setNewUrl("");
      setIsAdding(false);
      setIsLoadingMetadata(true);

      try {
        // Fetch metadata in the background
        const metadata = await fetchUrlMetadata({ url: newUrl, type });
        
        if (metadata && nodeData.onUpdateItem) {
          // Update the item with fetched metadata
          const updatedItem: MoodBoardItem = {
            ...newItem,
            title: metadata.title || newItem.title,
            thumbnail: metadata.thumbnail || newItem.thumbnail,
            metadata: {
              author: metadata.author,
              description: metadata.description,
              duration: metadata.duration,
            },
            loading: false,
          };
          
          nodeData.onUpdateItem(newItem.id, updatedItem);
        } else if (nodeData.onUpdateItem) {
          // Just remove loading state if metadata fetch failed
          nodeData.onUpdateItem(newItem.id, { ...newItem, loading: false });
        }
      } catch (error) {
        console.error("Failed to fetch metadata:", error);
        // Remove loading state on error
        if (nodeData.onUpdateItem) {
          nodeData.onUpdateItem(newItem.id, { ...newItem, loading: false });
        }
      } finally {
        setIsLoadingMetadata(false);
      }
      
      toast.success("Added to mood board!");
    } catch (error) {
      toast.error("Please enter a valid URL");
    }
  };

  const handleRemoveItem = (id: string) => {
    if (nodeData.onRemoveItem) {
      nodeData.onRemoveItem(id);
    }
  };

  return (
    <div className={`relative group ${selected ? "scale-105" : ""} transition-transform duration-200`}>
      {/* Glow effect when selected or being used */}
      {(selected || nodeData.isBeingUsed) && (
        <div className={`absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-lg ${
          nodeData.isBeingUsed ? 'animate-pulse' : ''
        }`} />
      )}
      
      {/* Active usage indicator */}
      {nodeData.isBeingUsed && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping" />
            <div className="relative bg-indigo-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span>In Use</span>
            </div>
          </div>
        </div>
      )}
      
      <Card className={`relative w-96 p-5 border-muted/50 shadow-xl bg-gradient-to-b from-background to-background/90 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl ${
        selected ? "border-primary/50" : ""
      } ${nodeData.isBeingUsed ? "border-indigo-500/50 ring-2 ring-indigo-500/20" : ""}`}>
        <Handle
          type="source"
          position={Position.Right}
          id="moodboard-output"
          className="!w-3 !h-3 !bg-gradient-to-r from-indigo-500 to-purple-500 !border-2 !border-background"
          style={{ top: '50%' }}
        />
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-sm">
              <Sparkles className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Mood Board</h3>
              <p className="text-xs text-muted-foreground">Reference materials for AI</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {nodeData.items.length} items
          </Badge>
        </div>

        {/* Items list */}
        <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
          {nodeData.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No items yet</p>
              <p className="text-xs mt-1">Add links to build your mood board</p>
            </div>
          ) : (
            nodeData.items.map((item) => (
              <div
                key={item.id}
                className="group/item flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors relative"
              >
                {item.loading && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                
                <div className="flex-shrink-0 text-muted-foreground">
                  {getItemIcon(item.type)}
                </div>
                
                {item.thumbnail && (
                  <img 
                    src={item.thumbnail} 
                    alt="" 
                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                
                <div className="flex-1 min-w-0">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-foreground hover:text-primary truncate block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.title || item.url}
                        </a>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold">{item.title || "Link"}</p>
                        {item.metadata?.author && (
                          <p className="text-xs text-muted-foreground">by {item.metadata.author}</p>
                        )}
                        <p className="text-xs mt-1">{item.url}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {item.metadata?.author && (
                    <p className="text-xs text-muted-foreground truncate">{item.metadata.author}</p>
                  )}
                </div>
                
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity"
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={item.loading}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Add new item */}
        {isAdding ? (
          <div className="flex gap-2">
            <Input
              placeholder="Paste URL here..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddItem()}
              className="flex-1 h-8 text-sm"
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleAddItem}
              disabled={!newUrl.trim()}
            >
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsAdding(false);
                setNewUrl("");
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Link
          </Button>
        )}
      </Card>
    </div>
  );
});

MoodBoardNode.displayName = "MoodBoardNode";