import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/shared/components/dialog";
import { ScrollArea } from "~/shared/components/scroll-area";
import { Brain, Copy, CheckCircle } from "lucide-react";
import { Button } from "~/shared/components/button";
import { useState } from "react";
import { toast } from "sonner";

interface PromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentType: string;
  prompt: string;
}

const agentLabels = {
  title: "Title Generator",
  description: "Description Writer",
  thumbnail: "Thumbnail Designer",
  tweets: "Social Media Agent",
};

export function PromptModal({ open, onOpenChange, agentType, prompt }: PromptModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success("Prompt copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy prompt");
    }
  };

  // Format the prompt for better readability
  const formatPrompt = (text: string) => {
    return text
      .split('\n')
      .map((line, index) => {
        // Highlight headers (lines with emojis or all caps)
        if (line.match(/^[🎯📊🎨✅💡]/)) {
          return <div key={index} className="font-semibold text-primary mt-4 mb-2">{line}</div>;
        }
        // Highlight section headers
        if (line.match(/^[A-Z\s]+:$/)) {
          return <div key={index} className="font-semibold mt-3 mb-1">{line}</div>;
        }
        // Regular lines
        if (line.trim()) {
          return <div key={index} className="mb-1">{line}</div>;
        }
        // Empty lines
        return <div key={index} className="h-2" />;
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <DialogTitle className="text-xl">
                Generation Prompt - {agentLabels[agentType as keyof typeof agentLabels]}
              </DialogTitle>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            This is the exact prompt that was sent to the AI model to generate your content.
          </p>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] w-full rounded-md border p-4 bg-muted/20">
          <div className="font-mono text-sm text-foreground/90 whitespace-pre-wrap">
            {formatPrompt(prompt)}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}