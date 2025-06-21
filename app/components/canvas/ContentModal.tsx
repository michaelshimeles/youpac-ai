import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeData: {
    type: string;
    draft: string;
    thumbnailUrl?: string;
  } | null;
  onUpdate?: (newContent: string) => void;
}

export function ContentModal({ isOpen, onClose, nodeData, onUpdate }: ContentModalProps) {
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titles[nodeData.type as keyof typeof titles]}</DialogTitle>
          <DialogDescription>
            View, edit, and copy your AI-generated content
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {nodeData.type === "thumbnail" && nodeData.thumbnailUrl && (
            <div className="aspect-video relative rounded-lg overflow-hidden bg-muted mb-4">
              <img 
                src={nodeData.thumbnailUrl} 
                alt="Generated thumbnail" 
                className="w-full h-full object-contain"
              />
            </div>
          )}
          
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={nodeData.type === "thumbnail" ? "min-h-[150px] font-mono text-sm" : "min-h-[300px] font-mono text-sm"}
            placeholder="No content generated yet..."
          />
          
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleCopy}
              className="gap-2"
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
            
            <div className="space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}