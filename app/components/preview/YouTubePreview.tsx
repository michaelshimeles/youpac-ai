import { useState } from "react";
import { Card } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { 
  ThumbsUp, 
  ThumbsDown, 
  Share2, 
  Download, 
  MoreHorizontal,
  BellOff
} from "lucide-react";
import { formatDuration } from "~/lib/video-metadata";

interface YouTubePreviewProps {
  title: string;
  description: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  duration?: number;
  channelName?: string;
  channelAvatar?: string;
  subscriberCount?: string;
  viewCount?: string;
  uploadDate?: string;
}

export function YouTubePreview({
  title,
  description,
  thumbnailUrl,
  videoUrl,
  duration,
  channelName = "Your Channel",
  channelAvatar,
  subscriberCount = "1.2K",
  viewCount = "0",
  uploadDate = "Just now"
}: YouTubePreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  // Format view count
  const formatViews = (views: string) => {
    const num = parseInt(views);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M views`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K views`;
    return `${num} views`;
  };
  
  // Truncate description
  const truncateDescription = (text: string, maxLines: number = 3) => {
    const words = text.split(' ');
    const wordsPerLine = 15; // Approximate
    const maxWords = maxLines * wordsPerLine;
    
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  return (
    <div className="max-w-2xl">
      <div className="space-y-4">
        {/* Video Player */}
        <Card className="relative aspect-video bg-black overflow-hidden">
            {isPlaying && videoUrl ? (
              <video
                src={videoUrl}
                className="w-full h-full object-contain"
                controls
                autoPlay
                onEnded={() => setIsPlaying(false)}
              />
            ) : (
              <>
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <p className="text-muted-foreground">No thumbnail</p>
                  </div>
                )}
                
                {/* Play button overlay */}
                {videoUrl && (
                  <button
                    onClick={() => setIsPlaying(true)}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
                  >
                    <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </button>
                )}
                
                {/* Duration badge */}
                {duration && !isPlaying && (
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
                    {formatDuration(duration)}
                  </div>
                )}
              </>
            )}
          </Card>
          
          {/* Video Info */}
          <div className="space-y-4 w-fit">
            {/* Title */}
            <h1 className="text-xl font-semibold line-clamp-2">
              {title || "Video Title"}
            </h1>
            
            {/* Channel and Actions */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={channelAvatar} />
                  <AvatarFallback>{channelName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                
                <div>
                  <p className="font-semibold">{channelName}</p>
                  <p className="text-sm text-muted-foreground">
                    {subscriberCount} subscribers
                  </p>
                </div>
                
                <Button
                  variant={isSubscribed ? "secondary" : "default"}
                  className={isSubscribed ? "gap-2" : "bg-black hover:bg-black/90 text-white"}
                  onClick={() => setIsSubscribed(!isSubscribed)}
                >
                  {isSubscribed ? (
                    <>
                      <BellOff className="h-4 w-4" />
                      Subscribed
                    </>
                  ) : (
                    "Subscribe"
                  )}
                </Button>
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-secondary rounded-full">
                  <Button variant="ghost" size="sm" className="rounded-l-full gap-2">
                    <ThumbsUp className="h-4 w-4" />
                    <span className="text-sm">0</span>
                  </Button>
                  <div className="w-px h-6 bg-border" />
                  <Button variant="ghost" size="sm" className="rounded-r-full">
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </div>
                
                <Button variant="secondary" size="sm" className="gap-2 rounded-full">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                
                <Button variant="secondary" size="sm" className="gap-2 rounded-full">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Description */}
            <Card className="p-4 bg-secondary/50">
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {formatViews(viewCount)} • {uploadDate}
                </p>
                
                <div className="text-sm">
                  <p className="whitespace-pre-wrap">
                    {showFullDescription 
                      ? description 
                      : truncateDescription(description || "Video description will appear here...")}
                  </p>
                  
                  {description && description.split(' ').length > 45 && (
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="font-medium hover:underline mt-1"
                    >
                      {showFullDescription ? "Show less" : "...more"}
                    </button>
                  )}
                </div>
              </div>
            </Card>
          </div>
      </div>
    </div>
  );
}