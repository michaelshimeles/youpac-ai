import { useState } from "react";
import { Card } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { 
  ThumbsUp, 
  MessageCircle, 
  Repeat2, 
  Send,
  MoreHorizontal,
  Building2,
  Users,
  TrendingUp
} from "lucide-react";

interface LinkedInPostPreviewProps {
  content: string;
  authorName?: string;
  authorTitle?: string;
  authorCompany?: string;
  profileImage?: string;
  thumbnailUrl?: string;
  connections?: number;
  postTime?: string;
}

export function LinkedInPostPreview({
  content,
  authorName = "Your Name",
  authorTitle = "Founder & CEO",
  authorCompany = "Your Company",
  profileImage,
  thumbnailUrl,
  connections = 500,
  postTime = "1h"
}: LinkedInPostPreviewProps) {
  const [copied, setCopied] = useState(false);
  // Static engagement numbers for V1 (no dynamic counters)
  const likeCount = 23;
  const commentCount = 8;
  const shareCount = 3;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("LinkedIn post copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Format content with proper line breaks and hashtag styling
  const formatContent = (text: string) => {
    return text.split('\n').map((line, index) => (
      <span key={index}>
        {line.split(' ').map((word, wordIndex) => (
          <span key={wordIndex}>
            {word.startsWith('#') ? (
              <span className="text-[#0077B5] font-medium hover:underline cursor-pointer">
                {word}
              </span>
            ) : (
              word
            )}
            {wordIndex < line.split(' ').length - 1 && ' '}
          </span>
        ))}
        {index < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 border-2 border-gray-100">
                <AvatarImage src={profileImage} />
                <AvatarFallback className="bg-[#0077B5] text-white font-semibold">
                  {authorName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 hover:text-[#0077B5] cursor-pointer">
                    {authorName}
                  </h3>
                  <span className="text-gray-500">•</span>
                  <button className="text-xs text-[#0077B5] font-semibold hover:bg-[#0077B5]/10 px-2 py-1 rounded border border-[#0077B5]">
                    + Follow
                  </button>
                </div>
                <p className="text-sm text-gray-600">{authorTitle} at {authorCompany}</p>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <span>{postTime} •</span>
                  <Users className="h-3 w-3" />
                  <span>{formatNumber(connections)} connections</span>
                </div>
              </div>
            </div>
            
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:bg-gray-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-3">
          <div className="text-[14px] leading-5 text-gray-900 whitespace-pre-wrap">
            {formatContent(content)}
          </div>
        </div>

        {/* Media */}
        {thumbnailUrl && (
          <div className="px-4 pb-3">
            <div className="relative rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
              <img
                src={thumbnailUrl}
                alt="Post media"
                className="w-full h-auto max-h-80 object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3">
                <div className="flex items-center gap-2 text-white text-xs">
                  <Building2 className="h-3 w-3" />
                  <span>Featured content</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Engagement Stats */}
        <div className="px-4 py-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="flex -space-x-1">
                  <div className="w-4 h-4 bg-[#0077B5] rounded-full flex items-center justify-center">
                    <ThumbsUp className="h-2.5 w-2.5 text-white fill-current" />
                  </div>
                  <div className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-2.5 w-2.5 text-white fill-current" />
                  </div>
                </div>
                <span className="ml-1">{likeCount}</span>
              </div>
              {commentCount > 0 && (
                <span>{commentCount} comments</span>
              )}
              {shareCount > 0 && (
                <span>{shareCount} reposts</span>
              )}
            </div>
            <div className="text-gray-500">
              {Math.floor(Math.random() * 1000) + 200} views
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className={`gap-2 transition-all ${
                copied ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </div>
          
          <div className="flex items-center justify-around">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 gap-2 text-gray-600 hover:bg-gray-100"
              disabled
            >
              <ThumbsUp className="h-4 w-4" />
              <span className="font-medium">Like</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 gap-2 text-gray-600 hover:bg-gray-100"
              disabled
            >
              <MessageCircle className="h-4 w-4" />
              <span className="font-medium">Comment</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 gap-2 text-gray-600 hover:bg-gray-100"
              disabled
            >
              <Repeat2 className="h-4 w-4" />
              <span className="font-medium">Repost</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 gap-2 text-gray-600 hover:bg-gray-100"
              disabled
            >
              <Send className="h-4 w-4" />
              <span className="font-medium">Send</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}