import { useState } from "react";
import { Card } from "~/shared/components/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/shared/components/avatar";
import { Button } from "~/shared/components/button";
import { 
  MessageCircle, 
  Repeat2, 
  Heart, 
  Share,
  MoreHorizontal,
  Bookmark,
  BarChart3,
  Image as ImageIcon
} from "lucide-react";

interface Tweet {
  id: string;
  content: string;
  media?: string[];
  timestamp?: Date;
}

interface TwitterThreadPreviewProps {
  tweets: string | string[]; // Can be a single string with line breaks or array
  username?: string;
  displayName?: string;
  profileImage?: string;
  verified?: boolean;
  media?: string[]; // Images/thumbnails to include in tweets
}

export function TwitterThreadPreview({
  tweets,
  username = "yourhandle",
  displayName = "Your Name",
  profileImage,
  verified = false,
  media = []
}: TwitterThreadPreviewProps) {
  const [likedTweets, setLikedTweets] = useState<Set<string>>(new Set());
  const [retweetedTweets, setRetweetedTweets] = useState<Set<string>>(new Set());
  const [bookmarkedTweets, setBookmarkedTweets] = useState<Set<string>>(new Set());
  
  // Parse tweets into array
  const tweetArray: Tweet[] = Array.isArray(tweets) 
    ? tweets.map((content, i) => ({ id: `tweet-${i}`, content }))
    : tweets.split('\n\n').filter(t => t.trim()).map((content, i) => ({ 
        id: `tweet-${i}`, 
        content: content.trim() 
      }));
  
  // Add media to first tweet if available
  if (media.length > 0 && tweetArray.length > 0) {
    tweetArray[0].media = media.slice(0, 4); // Max 4 images per tweet
  }
  
  // Format timestamp
  const formatTime = (date?: Date) => {
    const now = date || new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };
  
  const formatDate = (date?: Date) => {
    const now = date || new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  };
  
  // Format numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };
  
  // Random engagement numbers for demo
  const getEngagement = (index: number) => ({
    replies: Math.floor(Math.random() * 50) + index * 5,
    retweets: Math.floor(Math.random() * 100) + index * 10,
    likes: Math.floor(Math.random() * 500) + index * 20,
    views: Math.floor(Math.random() * 5000) + index * 100
  });

  const handleLike = (tweetId: string) => {
    const newLikes = new Set(likedTweets);
    if (newLikes.has(tweetId)) {
      newLikes.delete(tweetId);
    } else {
      newLikes.add(tweetId);
    }
    setLikedTweets(newLikes);
  };
  
  const handleRetweet = (tweetId: string) => {
    const newRetweets = new Set(retweetedTweets);
    if (newRetweets.has(tweetId)) {
      newRetweets.delete(tweetId);
    } else {
      newRetweets.add(tweetId);
    }
    setRetweetedTweets(newRetweets);
  };
  
  const handleBookmark = (tweetId: string) => {
    const newBookmarks = new Set(bookmarkedTweets);
    if (newBookmarks.has(tweetId)) {
      newBookmarks.delete(tweetId);
    } else {
      newBookmarks.add(tweetId);
    }
    setBookmarkedTweets(newBookmarks);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-0">
      {tweetArray.map((tweet, index) => {
        const engagement = getEngagement(index);
        const isLiked = likedTweets.has(tweet.id);
        const isRetweeted = retweetedTweets.has(tweet.id);
        const isBookmarked = bookmarkedTweets.has(tweet.id);
        
        return (
          <div key={tweet.id} className="relative">
            {/* Thread line */}
            {index < tweetArray.length - 1 && (
              <div className="absolute left-[27px] top-[60px] bottom-0 w-[2px] bg-border" />
            )}
            
            <Card className="rounded-none border-x-0 border-t-0 p-4 hover:bg-secondary/10 transition-colors">
              <div className="flex gap-3">
                {/* Avatar */}
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarImage src={profileImage} />
                  <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                
                {/* Content */}
                <div className="flex-1 space-y-1">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold">{displayName}</p>
                      {verified && (
                        <svg className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8.52 3.59a2.57 2.57 0 002.96 0l1.02-.633 1.02.633a2.57 2.57 0 002.96 0l.633-1.02.633 1.02a2.57 2.57 0 002.96 0L22 2.24a.75.75 0 00-.75-1.3l-1.02.633-1.02-.633a2.57 2.57 0 00-2.96 0l-.633 1.02-.633-1.02a2.57 2.57 0 00-2.96 0l-1.02.633-1.02-.633a2.57 2.57 0 00-2.96 0L6 2.24a.75.75 0 00.75 1.3l1.77-1.095zM12 7.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9zm0 1.5a3 3 0 100 6 3 3 0 000-6zm-2.12 2.12a.75.75 0 011.06 0l.59.59 1.59-1.59a.75.75 0 111.06 1.06l-2.12 2.12a.75.75 0 01-1.06 0l-1.12-1.12a.75.75 0 010-1.06z"/>
                        </svg>
                      )}
                      <p className="text-muted-foreground">@{username}</p>
                      <span className="text-muted-foreground">·</span>
                      <p className="text-muted-foreground">
                        {index === 0 ? 'now' : `${index}m`}
                      </p>
                    </div>
                    
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Tweet content */}
                  <p className="text-[15px] leading-normal whitespace-pre-wrap">
                    {tweet.content}
                  </p>
                  
                  {/* Media */}
                  {tweet.media && tweet.media.length > 0 && (
                    <div className={`grid gap-0.5 rounded-2xl overflow-hidden mt-3 ${
                      tweet.media.length === 1 ? 'grid-cols-1' :
                      tweet.media.length === 2 ? 'grid-cols-2' :
                      tweet.media.length === 3 ? 'grid-cols-2' :
                      'grid-cols-2'
                    }`}>
                      {tweet.media.map((mediaUrl, i) => (
                        <div 
                          key={i} 
                          className={`relative bg-muted ${
                            tweet.media!.length === 3 && i === 0 ? 'row-span-2' : ''
                          }`}
                        >
                          <img
                            src={mediaUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 max-w-md">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2 gap-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-xs">{engagement.replies}</span>
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`h-8 px-2 gap-2 ${
                        isRetweeted 
                          ? 'text-green-500 hover:text-green-600' 
                          : 'text-muted-foreground hover:text-green-500'
                      } hover:bg-green-500/10`}
                      onClick={() => handleRetweet(tweet.id)}
                    >
                      <Repeat2 className="h-4 w-4" />
                      <span className="text-xs">{engagement.retweets}</span>
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`h-8 px-2 gap-2 ${
                        isLiked 
                          ? 'text-red-500 hover:text-red-600' 
                          : 'text-muted-foreground hover:text-red-500'
                      } hover:bg-red-500/10`}
                      onClick={() => handleLike(tweet.id)}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                      <span className="text-xs">
                        {engagement.likes + (isLiked ? 1 : 0)}
                      </span>
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2 gap-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span className="text-xs">{formatNumber(engagement.views)}</span>
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`h-8 w-8 ${
                          isBookmarked 
                            ? 'text-blue-500 hover:text-blue-600' 
                            : 'text-muted-foreground hover:text-blue-500'
                        } hover:bg-blue-500/10`}
                        onClick={() => handleBookmark(tweet.id)}
                      >
                        <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
                      >
                        <Share className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );
      })}
      
      {/* Thread summary */}
      {tweetArray.length > 1 && (
        <Card className="rounded-none border-x-0 border-t-0 p-4 bg-secondary/20">
          <p className="text-sm text-muted-foreground text-center">
            Thread • {tweetArray.length} Tweets • {formatTime()} • {formatDate()}
          </p>
        </Card>
      )}
    </div>
  );
}