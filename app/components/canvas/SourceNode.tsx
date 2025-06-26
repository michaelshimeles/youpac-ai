import { memo, useState, useCallback } from "react";
import { Handle, Position } from "./ReactFlowComponents";
import { 
  Globe,
  Video,
  Type,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Link as LinkIcon,
  FileText
} from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Textarea } from "~/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

export interface SourceNodeData {
  content: string;
  sourceType: "topic" | "url" | "video";
  isScraping: boolean;
  error: string | null;
  videoId?: string;
}

interface SourceNodeProps {
  data: SourceNodeData;
  selected?: boolean;
  id: string;
}

export const SourceNode = memo(({ data, selected, id }: SourceNodeProps) => {
  const [content, setContent] = useState(data.content || "");
  const [sourceType, setSourceType] = useState<"topic" | "url" | "video">(data.sourceType || "topic");
  
  const videos = useQuery(api.videos.list) || [];
  const scrapeContent = useAction(api.prompts.scrape.scrapeContent);
  
  // Detect if content looks like a URL
  const isUrl = content.trim().startsWith('http://') || content.trim().startsWith('https://');
  
  const handleScrape = useCallback(async () => {
    if (!content.trim()) {
      toast.error("Please enter a URL to scrape");
      return;
    }
    
    try {
      // Update node to show scraping state
      // This would typically be handled by the parent Canvas component
      const result = await scrapeContent({ url: content.trim() });
      
      // Update content with scraped result
      setContent(`${result.title}\n\n${result.content}`);
      setSourceType("url");
      toast.success("Content scraped successfully!");
      
    } catch (error: any) {
      toast.error(error.message || "Failed to scrape content");
      console.error("Scraping error:", error);
    }
  }, [content, scrapeContent]);
  
  const handleVideoSelect = useCallback((videoId: string) => {
    const selectedVideo = videos.find(v => v._id === videoId);
    if (selectedVideo) {
      setContent(selectedVideo.transcript || selectedVideo.title || "");
      setSourceType("video");
      toast.success("Video content imported!");
    }
  }, [videos]);
  
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    // Auto-detect source type
    if (newContent.trim().startsWith('http')) {
      setSourceType("url");
    } else {
      setSourceType("topic");
    }
  }, []);

  return (
    <div className={`relative group ${selected ? "scale-105" : ""} transition-transform duration-200`}>
      {/* Glow effect when selected */}
      {selected && (
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-lg animate-pulse" />
      )}
      
      <Card className={`relative w-80 p-5 border-muted/50 shadow-xl bg-gradient-to-b from-background to-background/90 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl ${selected ? "border-primary/50" : ""}`}>
        <Handle
          type="target"
          position={Position.Left}
          id="source-input"
          className="!w-3 !h-3 !bg-gradient-to-r from-blue-500/20 to-purple-500/20 !border-2 !border-background"
          style={{ top: '50%' }}
        />
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Content Source</h3>
              <p className="text-xs text-muted-foreground">Topic, URL, or video transcript</p>
            </div>
          </div>
          
          <Badge variant="outline" className="text-xs">
            {sourceType === "topic" && (
              <>
                <Type className="h-3 w-3 mr-1" />
                Topic
              </>
            )}
            {sourceType === "url" && (
              <>
                <Globe className="h-3 w-3 mr-1" />
                URL
              </>
            )}
            {sourceType === "video" && (
              <>
                <Video className="h-3 w-3 mr-1" />
                Video
              </>
            )}
          </Badge>
        </div>
        
        {/* Content Input */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Content Input
            </label>
            <Textarea
              placeholder="Enter a topic (e.g., 'How to Scale a SaaS Startup') or paste a URL to scrape content..."
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full h-24 text-sm resize-none"
              rows={4}
            />
          </div>
          
          {/* URL Scraping */}
          {isUrl && (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleScrape}
                disabled={data.isScraping || !content.trim()}
                className="w-full gap-2"
              >
                {data.isScraping ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scraping content...
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4" />
                    Scrape URL Content
                  </>
                )}
              </Button>
              
              {data.error && (
                <div className="flex items-center gap-2 text-red-600 text-xs">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  <span>{data.error}</span>
                </div>
              )}
            </div>
          )}
          
          {/* Video Selection */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Import from Video
            </label>
            <Select onValueChange={handleVideoSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a video to import transcript" />
              </SelectTrigger>
              <SelectContent>
                {videos.map((video) => (
                  <SelectItem key={video._id} value={video._id}>
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      <span className="truncate">
                        {video.title || `Video ${video._id.slice(-4)}`}
                      </span>
                    </div>
                  </SelectItem>
                ))}
                {videos.length === 0 && (
                  <SelectItem value="none" disabled>
                    No videos available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          {/* Status Indicator */}
          {content && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Content Ready
                </p>
                <p className="text-xs text-muted-foreground">
                  {content.length} characters • {sourceType} source
                </p>
              </div>
            </div>
          )}
        </div>
        
        <Handle
          type="source"
          position={Position.Right}
          id="source-output"
          className="!w-3 !h-3 !bg-gradient-to-r from-blue-500/20 to-purple-500/20 !border-2 !border-background"
          style={{ top: '50%' }}
        />
      </Card>
    </div>
  );
});

SourceNode.displayName = "SourceNode";