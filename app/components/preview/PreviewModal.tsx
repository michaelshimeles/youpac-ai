import { Sheet, SheetContent, SheetHeader, SheetTitle } from "~/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { YouTubePreview } from "./YouTubePreview";
import { TwitterThreadPreview } from "./TwitterThreadPreview";
import { LinkedInPostPreview } from "./LinkedInPostPreview";
import { Youtube, Twitter, Copy, Download, Eye, Sparkles, X, Check, Linkedin } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "~/lib/utils";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  tweets?: string;
  linkedin?: string;
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
  linkedin = "",
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
  const [copiedYouTube, setCopiedYouTube] = useState(false);
  const [copiedTwitter, setCopiedTwitter] = useState(false);
  const [copiedLinkedIn, setCopiedLinkedIn] = useState(false);
  const [activeTab, setActiveTab] = useState("youtube");

  const handleCopyYouTube = () => {
    const content = `Title: ${title}\n\nDescription:\n${description}`;
    navigator.clipboard.writeText(content);
    setCopiedYouTube(true);
    toast.success("YouTube content copied to clipboard!");
    setTimeout(() => setCopiedYouTube(false), 2000);
  };
  
  const handleCopyTwitter = () => {
    navigator.clipboard.writeText(tweets);
    setCopiedTwitter(true);
    toast.success("Twitter thread copied to clipboard!");
    setTimeout(() => setCopiedTwitter(false), 2000);
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

  const handleCopyLinkedIn = () => {
    navigator.clipboard.writeText(linkedin);
    setCopiedLinkedIn(true);
    toast.success("LinkedIn post copied to clipboard!");
    setTimeout(() => setCopiedLinkedIn(false), 2000);
  };
  
  const handleExportLinkedIn = () => {
    const content = `# LinkedIn Post\n\n${linkedin}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'linkedin-post.md';
    a.click();
    URL.revokeObjectURL(url);
    toast.success("LinkedIn post exported!");
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[900px] lg:w-[900px] xl:w-[800px] sm:max-w-[90vw] overflow-hidden p-0">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-gradient-to-tr from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl" />
        </div>
        
        {/* Header */}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 relative">
          <div className="px-6 pt-4 pb-2 bg-background/50 backdrop-blur-sm">
            <TabsList className="grid w-full max-w-lg grid-cols-3 h-12 p-1 bg-muted/50">
              <TabsTrigger 
                value="youtube" 
                className={cn(
                  "gap-2 data-[state=active]:shadow-sm transition-all",
                  "data-[state=active]:bg-background data-[state=active]:text-foreground"
                )}
              >
                <Youtube className="h-4 w-4" />
                YouTube
              </TabsTrigger>
              <TabsTrigger 
                value="twitter" 
                className={cn(
                  "gap-2 data-[state=active]:shadow-sm transition-all",
                  "data-[state=active]:bg-background data-[state=active]:text-foreground"
                )}
              >
                <Twitter className="h-4 w-4" />
                Twitter/X
              </TabsTrigger>
              <TabsTrigger 
                value="linkedin" 
                className={cn(
                  "gap-2 data-[state=active]:shadow-sm transition-all",
                  "data-[state=active]:bg-background data-[state=active]:text-foreground"
                )}
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="overflow-y-auto max-h-[100vh]">
            <TabsContent value="youtube" className="p-6 pt-4 m-0">
              <div className="space-y-6">
                {/* Preview container with background */}
                <div className="relative rounded-xl bg-gradient-to-br from-background to-muted/30 p-6 shadow-inner">
                  <div className="absolute inset-0 bg-grid-white/5 rounded-xl pointer-events-none" />
                  <div className="relative">
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
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="twitter" className="p-6 pt-4 m-0">
              <div className="space-y-6">
                {/* Action buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">AI-generated thread</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleCopyTwitter}
                      className={cn(
                        "gap-2 transition-all",
                        copiedTwitter && "bg-green-500/10 text-green-600 border-green-500/20"
                      )}
                    >
                      {copiedTwitter ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy Thread
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleExportTwitter}
                      className="gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/20"
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>
                
                {/* Preview container with background */}
                <div className="relative rounded-xl bg-gradient-to-br from-background to-muted/30 p-6 shadow-inner">
                  <div className="absolute inset-0 bg-grid-white/5 rounded-xl pointer-events-none" />
                  <div className="relative">
                    <TwitterThreadPreview
                      tweets={tweets}
                      username={username}
                      displayName={displayName || channelName}
                      profileImage={profileImage || channelAvatar}
                      media={thumbnailUrl ? [thumbnailUrl] : []}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}