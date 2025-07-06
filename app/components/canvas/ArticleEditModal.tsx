import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { ScrollArea } from "~/components/ui/scroll-area";
import { FileText, Hash, Eye, Edit, Save, X } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

interface ArticleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: {
    id: string;
    title: string;
    content: string;
    format: string;
  } | null;
  onSave: (id: string, title: string, content: string) => Promise<void>;
}

export function ArticleEditModal({ 
  isOpen, 
  onClose, 
  article,
  onSave
}: ArticleEditModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setContent(article.content);
      setActiveTab("edit");
    }
  }, [article]);

  const handleSave = async () => {
    if (!article) return;
    
    if (!title.trim()) {
      toast.error("Title cannot be empty");
      return;
    }
    
    if (!content.trim()) {
      toast.error("Content cannot be empty");
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave(article.id, title.trim(), content);
      toast.success("Article saved successfully!");
      onClose();
    } catch (error) {
      toast.error("Failed to save article");
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (article && (title !== article.title || content !== article.content)) {
      if (!confirm("You have unsaved changes. Are you sure you want to close?")) {
        return;
      }
    }
    onClose();
  };

  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = content.length;
  const isMarkdown = article?.format === 'md' || article?.format === 'markdown';

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Edit Article
              </DialogTitle>
              <DialogDescription>
                {isMarkdown ? "Editing markdown document" : "Editing text document"}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Title Input */}
          <div className="px-6 py-4 border-b">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter article title..."
                className="font-medium"
              />
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {isMarkdown ? (
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "edit" | "preview")} className="h-full flex flex-col">
                <div className="px-6 py-2 border-b">
                  <TabsList>
                    <TabsTrigger value="edit" className="gap-2">
                      <Edit className="h-4 w-4" />
                      Edit
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="gap-2">
                      <Eye className="h-4 w-4" />
                      Preview
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="edit" className="flex-1 p-0 m-0">
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your markdown content here..."
                    className="h-full w-full resize-none rounded-none border-0 p-6 font-mono text-sm focus-visible:ring-0"
                  />
                </TabsContent>
                
                <TabsContent value="preview" className="flex-1 p-0 m-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-6">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            pre: ({ children, ...props }) => (
                              <pre className="bg-muted rounded-lg p-4 overflow-x-auto" {...props}>
                                {children}
                              </pre>
                            ),
                            code: ({ children, ...props }: any) => {
                              const inline = !props.node?.position;
                              return inline ? (
                                <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
                                  {children}
                                </code>
                              ) : (
                                <code {...props}>{children}</code>
                              );
                            }
                          }}
                        >
                          {content || "*No content to preview*"}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            ) : (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your content here..."
                className="h-full w-full resize-none rounded-none border-0 p-6 font-mono text-sm focus-visible:ring-0"
              />
            )}
          </div>

          {/* Footer with Stats and Actions */}
          <div className="border-t">
            <div className="px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {wordCount.toLocaleString()} words
                </span>
                <span>{charCount.toLocaleString()} characters</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !title.trim() || !content.trim()}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}