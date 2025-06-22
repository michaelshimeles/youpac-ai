import { Sheet, SheetContent, SheetHeader, SheetTitle } from "~/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { YouTubePreview } from "./YouTubePreview";
import { TwitterThreadPreview } from "./TwitterThreadPreview";
import { Youtube, Twitter, Copy, Download, Eye } from "lucide-react";
import { toast } from "sonner";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  tweets?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  duration?: number;
  channelName?: string;
  channelAvatar?: string;
  subscriberCount?: string;
  username?: string;
  displayName?: string;
  profileImage?: string;
}

export function PreviewModal({
  isOpen,
  onClose,
  title = "",
  description = "",
  tweets = "",
  thumbnailUrl,
  videoUrl,
  duration,
  channelName,
  channelAvatar,
  subscriberCount,
  username,
  displayName,
  profileImage
}: PreviewModalProps) {
  const handleCopyYouTube = () => {
    const content = `Title: ${title}\n\nDescription:\n${description}`;
    navigator.clipboard.writeText(content);
    toast.success("YouTube content copied to clipboard!");
  };
  
  const handleCopyTwitter = () => {
    navigator.clipboard.writeText(tweets);
    toast.success("Twitter thread copied to clipboard!");
  };
  
  const handleExportYouTube = () => {
    const content = `# YouTube Video\n\n## Title\n${title}\n\n## Description\n${description}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'youtube-content.md';
    a.click();
    URL.revokeObjectURL(url);
    toast.success("YouTube content exported!");
  };
  
  const handleExportTwitter = () => {
    const content = `# Twitter Thread\n\n${tweets.split('\n\n').map((tweet, i) => `## Tweet ${i + 1}\n${tweet}`).join('\n\n')}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'twitter-thread.md';
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Twitter thread exported!");
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[800px] lg:w-[800px] xl:w-[700px] sm:max-w-[85vw] overflow-hidden p-0">
        <SheetHeader className="p-6 pb-0">
          <SheetTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Content Preview
          </SheetTitle>
        </SheetHeader>
        
        <Tabs defaultValue="youtube" className="flex-1">
          <div className="px-6">
            <TabsList className="grid w-full max-w-sm grid-cols-2">
              <TabsTrigger value="youtube" className="gap-2">
                <Youtube className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="twitter" className="gap-2">
                <Twitter className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
            <TabsContent value="youtube" className="p-6 pt-4">
              <div className="space-y-4">
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCopyYouTube}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Content
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleExportYouTube}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>
                
                <YouTubePreview
                  title={title}
                  description={description}
                  thumbnailUrl={thumbnailUrl}
                  videoUrl={videoUrl}
                  duration={duration}
                  channelName={channelName}
                  channelAvatar={channelAvatar}
                  subscriberCount={subscriberCount}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="twitter" className="p-6 pt-4">
              <div className="space-y-4">
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCopyTwitter}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Thread
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleExportTwitter}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>
                
                <TwitterThreadPreview
                  tweets={tweets}
                  username={username}
                  displayName={displayName || channelName}
                  profileImage={profileImage || channelAvatar}
                  media={thumbnailUrl ? [thumbnailUrl] : []}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}