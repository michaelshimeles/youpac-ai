import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Copy, Check, Download, Search, X, FileText } from "lucide-react";
import { toast } from "sonner";

interface TranscriptionViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcription: string | null;
  videoTitle?: string;
  isLoading?: boolean;
}

export function TranscriptionViewModal({ 
  isOpen, 
  onClose, 
  transcription, 
  videoTitle,
  isLoading = false 
}: TranscriptionViewModalProps) {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedText, setHighlightedText] = useState<string>("");
  
  console.log('[TranscriptionViewModal] Render:', {
    isOpen,
    hasTranscription: !!transcription,
    transcriptionLength: transcription?.length,
    videoTitle,
    isLoading
  });

  useEffect(() => {
    if (transcription && searchQuery) {
      // Simple highlighting - replace with mark tag
      const regex = new RegExp(`(${searchQuery})`, 'gi');
      const highlighted = transcription.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
      setHighlightedText(highlighted);
    } else {
      setHighlightedText(transcription || "");
    }
  }, [transcription, searchQuery]);

  const handleCopy = async () => {
    if (!transcription) return;
    
    try {
      await navigator.clipboard.writeText(transcription);
      setCopied(true);
      toast.success("Transcription copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy transcription");
    }
  };

  const handleDownload = () => {
    if (!transcription) return;
    
    const blob = new Blob([transcription], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoTitle || 'video'}-transcription.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Transcription downloaded!");
  };

  const wordCount = transcription ? transcription.trim().split(/\s+/).length : 0;
  const charCount = transcription ? transcription.length : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Video Transcription
              </DialogTitle>
              <DialogDescription>
                {videoTitle ? `Transcription for "${videoTitle}"` : "Video transcription content"}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Stats and Actions */}
          <div className="flex items-center justify-between gap-4 px-6 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{wordCount.toLocaleString()} words</span>
              <span>{charCount.toLocaleString()} characters</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!transcription || isLoading}
                className="gap-2"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!transcription || isLoading}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-6 py-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search in transcription..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
                disabled={!transcription || isLoading}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Transcription Content - Scrollable Area */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                      <p className="text-sm text-muted-foreground">Loading transcription...</p>
                    </div>
                  </div>
                ) : transcription ? (
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: highlightedText }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">No transcription available</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Search Results Info */}
          {searchQuery && transcription && (
            <div className="px-6 py-3 border-t bg-muted/30">
              <div className="text-xs text-muted-foreground">
                {(() => {
                  const matches = transcription.match(new RegExp(searchQuery, 'gi'));
                  const count = matches ? matches.length : 0;
                  return count > 0 
                    ? `Found ${count} match${count !== 1 ? 'es' : ''} for "${searchQuery}"`
                    : `No matches found for "${searchQuery}"`;
                })()}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}