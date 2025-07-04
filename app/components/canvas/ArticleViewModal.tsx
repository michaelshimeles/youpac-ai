import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Copy, Check, Download, Search, X, FileText, Hash, Clock } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface ArticleViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: {
    id: string;
    title: string;
    content: string;
    format: string;
  } | null;
}

export function ArticleViewModal({ 
  isOpen, 
  onClose, 
  article
}: ArticleViewModalProps) {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedText, setHighlightedText] = useState<string>("");

  useEffect(() => {
    if (article?.content && searchQuery) {
      // Simple highlighting - replace with mark tag
      const regex = new RegExp(`(${searchQuery})`, 'gi');
      const highlighted = article.content.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
      setHighlightedText(highlighted);
    } else {
      setHighlightedText(article?.content || "");
    }
  }, [article?.content, searchQuery]);

  const handleCopy = async () => {
    if (!article?.content) return;
    
    try {
      await navigator.clipboard.writeText(article.content);
      setCopied(true);
      toast.success("Article copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy article");
    }
  };

  const handleDownload = () => {
    if (!article) return;
    
    const blob = new Blob([article.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${article.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${article.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Article downloaded!");
  };

  const wordCount = article?.content ? article.content.trim().split(/\s+/).length : 0;
  const charCount = article?.content ? article.content.length : 0;
  const readingTime = Math.ceil(wordCount / 200); // 200 words per minute

  const isMarkdown = article?.format === 'md' || article?.format === 'markdown';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {article?.title || "Article"}
              </DialogTitle>
              <DialogDescription>
                {isMarkdown ? "Markdown document" : "Text document"}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Stats and Actions */}
          <div className="flex items-center justify-between gap-4 px-6 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {wordCount.toLocaleString()} words
              </span>
              <span>{charCount.toLocaleString()} characters</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {readingTime} min read
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!article}
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
                disabled={!article}
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
                placeholder="Search in article..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
                disabled={!article}
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

          {/* Article Content - Scrollable Area */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                {article ? (
                  isMarkdown ? (
                    searchQuery ? (
                      // For search in markdown, show plain text with highlights
                      <div 
                        className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: highlightedText }}
                      />
                    ) : (
                      // Render markdown normally
                      <ReactMarkdown 
                        className="prose prose-sm dark:prose-invert max-w-none"
                        components={{
                          // Customize code blocks to have better styling
                          pre: ({ children, ...props }) => (
                            <pre className="bg-muted rounded-lg p-4 overflow-x-auto" {...props}>
                              {children}
                            </pre>
                          ),
                          code: ({ inline, children, ...props }) => 
                            inline ? (
                              <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
                                {children}
                              </code>
                            ) : (
                              <code {...props}>{children}</code>
                            )
                        }}
                      >
                        {article.content}
                      </ReactMarkdown>
                    )
                  ) : (
                    // Plain text - preserve formatting
                    <div 
                      className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed font-mono text-sm"
                      dangerouslySetInnerHTML={{ __html: highlightedText }}
                    />
                  )
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">No article content available</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Search Results Info */}
          {searchQuery && article && (
            <div className="px-6 py-3 border-t bg-muted/30">
              <div className="text-xs text-muted-foreground">
                {(() => {
                  const matches = article.content.match(new RegExp(searchQuery, 'gi'));
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