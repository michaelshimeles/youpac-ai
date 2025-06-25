import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Copy, Check, Eye, Edit3, Youtube, Twitter, Linkedin, Sparkles, FileText, Image } from "lucide-react";
import { toast } from "sonner";
import { Card } from "~/components/ui/card";
import { YouTubePreview } from "~/components/preview/YouTubePreview";
import { TwitterThreadPreview } from "~/components/preview/TwitterThreadPreview";
import { LinkedInPostPreview } from "~/components/preview/LinkedInPostPreview";
import { cn } from "~/lib/utils";

interface ContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeData: {
    type: string;
    draft: string;
    thumbnailUrl?: string;
  } | null;
  onUpdate?: (newContent: string) => void;
  videoData?: {
    title?: string;
    thumbnailUrl?: string;
    duration?: number;
  };
  channelData?: {
    channelName?: string;
    channelAvatar?: string;
    subscriberCount?: string;
  };
}

export function ContentModal({ isOpen, onClose, nodeData, onUpdate, videoData, channelData }: ContentModalProps) {
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // Update content when nodeData changes
  React.useEffect(() => {
    if (nodeData) {
      setContent(nodeData.draft || "");
    }
  }, [nodeData]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(content);
    }
    onClose();
  };

  if (!nodeData) return null;

  const titles = {
    title: "Video Title",
    description: "Video Description",
    thumbnail: "Thumbnail Concept",
    tweets: "Twitter/X Thread",
  };

  const icons = {
    title: <FileText className="h-5 w-5" />,
    description: <FileText className="h-5 w-5" />,
    thumbnail: <Image className="h-5 w-5" />,
    tweets: <Twitter className="h-5 w-5" />,
  };

  const showPreview = nodeData.type === "title" || nodeData.type === "description" || nodeData.type === "tweets";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                nodeData.type === "title" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" :
                nodeData.type === "description" ? "bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" :
                nodeData.type === "thumbnail" ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400" :
                "bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
              )}>
                {icons[nodeData.type as keyof typeof icons]}
              </div>
              <div>
                <DialogTitle className="text-xl">{titles[nodeData.type as keyof typeof titles]}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {nodeData.type === "thumbnail" 
                    ? "AI-generated thumbnail concept and image"
                    : "View, edit, and preview your AI-generated content"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {showPreview ? (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")} className="h-full">
              <div className="px-6 pt-4">
                <TabsList className="grid w-fit grid-cols-2">
                  <TabsTrigger value="edit" className="gap-2">
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-2">
                    <Eye className="h-4 w-4" />
                    Preview
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
                <TabsContent value="edit" className="p-6 pt-4 m-0">
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className={cn(
                      "font-mono text-sm resize-none",
                      nodeData.type === "tweets" ? "min-h-[400px]" : "min-h-[300px]"
                    )}
                    placeholder="No content generated yet..."
                  />
                </TabsContent>
                
                <TabsContent value="preview" className="p-6 pt-4 m-0">
                  {(nodeData.type === "title" || nodeData.type === "description") && (
                    <YouTubePreview
                      title={nodeData.type === "title" ? content : (videoData?.title || "Video Title")}
                      description={nodeData.type === "description" ? content : ""}
                      thumbnailUrl={nodeData.thumbnailUrl || videoData?.thumbnailUrl}
                      duration={videoData?.duration}
                      channelName={channelData?.channelName}
                      channelAvatar={channelData?.channelAvatar}
                      subscriberCount={channelData?.subscriberCount}
                    />
                  )}
                  
                  {nodeData.type === "tweets" && (
                    <TwitterThreadPreview
                      tweets={content}
                      username={channelData?.channelName?.toLowerCase().replace(/\s+/g, '') || "yourhandle"}
                      displayName={channelData?.channelName || "Your Channel"}
                      profileImage={channelData?.channelAvatar}
                      media={nodeData.thumbnailUrl ? [nodeData.thumbnailUrl] : []}
                    />
                  )}
                </TabsContent>
              </div>
            </Tabs>
          ) : (
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
              {nodeData.type === "thumbnail" && nodeData.thumbnailUrl && (
                <Card className="relative overflow-hidden bg-gradient-to-br from-background to-muted/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                  <div className="relative p-6">
                    <div className="aspect-video relative rounded-lg overflow-hidden shadow-2xl">
                      <img 
                        src={nodeData.thumbnailUrl} 
                        alt="Generated thumbnail" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <Sparkles className="h-4 w-4" />
                      <span>AI-generated YouTube thumbnail</span>
                    </div>
                  </div>
                </Card>
              )}
              
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {nodeData.type === "thumbnail" ? "Thumbnail Concept & Prompt" : "Content"}
                </label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className={cn(
                    "font-mono text-sm resize-none",
                    nodeData.type === "thumbnail" ? "min-h-[150px]" : "min-h-[300px]"
                  )}
                  placeholder="No content generated yet..."
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center px-6 py-4 border-t bg-muted/50">
          <div className="text-sm text-muted-foreground">
            {content.length} characters • {content.split(/\s+/).filter(w => w).length} words
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Check className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}