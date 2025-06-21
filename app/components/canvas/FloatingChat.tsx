import React, { useState, useRef, useEffect } from "react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { 
  X, 
  Send, 
  MessageSquare, 
  Minimize2, 
  Maximize2,
  Bot,
  User,
  AtSign
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { MentionAutocomplete } from "./MentionAutocomplete";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: number;
  agentId?: string;
}

interface FloatingChatProps {
  agents: Array<{
    id: string;
    type: string;
    draft: string;
  }>;
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  isGenerating?: boolean;
  currentInputValue?: string;
  onInputChange?: (value: string) => void;
}

const agentLabels = {
  title: "Title Agent",
  description: "Description Agent",
  thumbnail: "Thumbnail Agent",
  tweets: "Tweets Agent",
};

export function FloatingChat({ 
  agents,
  messages,
  onSendMessage,
  isGenerating = false,
  currentInputValue = "",
  onInputChange
}: FloatingChatProps) {
  const [input, setInput] = useState(currentInputValue);
  const [isMinimized, setIsMinimized] = useState(true);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Available mention options for keyboard navigation
  const mentionOptions = [
    { value: "TITLE_AGENT", label: "Title Agent" },
    { value: "DESCRIPTION_AGENT", label: "Description Agent" },
    { value: "THUMBNAIL_AGENT", label: "Thumbnail Agent" },
    { value: "TWEETS_AGENT", label: "Tweets Agent" },
  ];
  
  const filteredMentions = mentionOptions.filter(option =>
    option.label.toLowerCase().includes(mentionSearchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(mentionSearchTerm.toLowerCase())
  );
  
  // Auto-expand when input changes (from @mention)
  useEffect(() => {
    if (currentInputValue && currentInputValue.includes('@') && isMinimized) {
      setIsMinimized(false);
    }
  }, [currentInputValue, isMinimized]);

  // Sync input with external value
  useEffect(() => {
    setInput(currentInputValue);
  }, [currentInputValue]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Focus input when chat opens or when @mention is added
  useEffect(() => {
    if (!isMinimized && currentInputValue) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        inputRef.current?.focus();
        // Move cursor to end of input
        if (inputRef.current) {
          inputRef.current.setSelectionRange(input.length, input.length);
        }
      }, 100);
    }
  }, [isMinimized, currentInputValue, input.length]);

  const handleInputChange = (value: string) => {
    setInput(value);
    onInputChange?.(value);
    
    // Check for @ symbol to show mention dropdown
    const lastAtIndex = value.lastIndexOf('@');
    const textAfterAt = value.slice(lastAtIndex + 1);
    const hasSpaceAfterAt = textAfterAt.includes(' ');
    
    if (lastAtIndex !== -1 && !hasSpaceAfterAt) {
      // Show dropdown
      setShowMentionDropdown(true);
      setMentionSearchTerm(textAfterAt);
      setMentionStartIndex(lastAtIndex);
      setSelectedMentionIndex(0);
      console.log('Showing mention dropdown for:', textAfterAt);
    } else {
      // Hide dropdown
      setShowMentionDropdown(false);
      setMentionSearchTerm("");
      setMentionStartIndex(-1);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;
    
    const message = input.trim();
    handleInputChange("");
    
    try {
      await onSendMessage(message);
    } catch (error) {
      toast.error("Failed to send message");
      handleInputChange(message); // Restore input on error
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (showMentionDropdown) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < filteredMentions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex(prev => prev > 0 ? prev - 1 : prev);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredMentions[selectedMentionIndex]) {
          handleMentionSelect(filteredMentions[selectedMentionIndex].value);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowMentionDropdown(false);
      } else if (e.key === "Tab") {
        e.preventDefault();
        if (filteredMentions[selectedMentionIndex]) {
          handleMentionSelect(filteredMentions[selectedMentionIndex].value);
        }
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const handleMentionSelect = (mention: string) => {
    if (mentionStartIndex !== -1) {
      const beforeMention = input.slice(0, mentionStartIndex);
      const afterMention = input.slice(mentionStartIndex + mentionSearchTerm.length + 1);
      const newValue = `${beforeMention}@${mention} ${afterMention}`;
      handleInputChange(newValue);
      setShowMentionDropdown(false);
      
      // Focus input and move cursor to end of mention
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const cursorPosition = beforeMention.length + mention.length + 2;
          inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
        }
      }, 0);
    }
  };

  // Extract agent mentions from message
  const extractAgentMention = (content: string) => {
    const mentionRegex = /@(\w+_AGENT)/gi;
    const match = content.match(mentionRegex);
    if (match) {
      const agentType = match[0].replace("@", "").replace("_AGENT", "").toLowerCase();
      const agent = agents.find(a => a.type === agentType);
      return agent;
    }
    return null;
  };

  // Render message with highlighted mentions
  const renderMessageContent = (content: string) => {
    const mentionRegex = /@(\w+_AGENT)/gi;
    const parts = content.split(mentionRegex);
    
    return parts.map((part, index) => {
      if (part.endsWith("_AGENT")) {
        const agentType = part.replace("_AGENT", "").toLowerCase();
        const label = agentLabels[agentType as keyof typeof agentLabels];
        return (
          <span key={index} className="text-primary font-medium">
            @{label || part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed bottom-4 right-4 z-50"
      style={{ width: isMinimized ? "auto" : "384px" }}
    >
      <Card className={`shadow-lg ${isMinimized ? "p-2" : "py-0"}`}>
        {/* Header */}
        <div className={`flex items-center justify-between ${!isMinimized ? "p-4 border-b" : ""}`}>
          {!isMinimized && (
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">AI Assistant</h3>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Minimize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Chat Content */}
        {!isMinimized && (
          <>

            {/* Messages */}
            <ScrollArea className="h-[300px]" ref={scrollAreaRef}>
              <div className="p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Start a conversation with your AI agents</p>
                    <p className="text-xs mt-2">Click "Chat" on any agent node to mention them</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const mentionedAgent = message.agentId ? 
                      agents.find(a => a.id === message.agentId) : 
                      extractAgentMention(message.content);
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {message.role === "ai" && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] ${
                            message.role === "user"
                              ? ""
                              : ""
                          }`}
                        >
                          {mentionedAgent && message.role === "ai" && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <AtSign className="h-3 w-3" />
                              <span>{agentLabels[mentionedAgent.type as keyof typeof agentLabels]}</span>
                            </div>
                          )}
                          <div
                            className={`rounded-lg px-3 py-2 ${
                              message.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">
                              {message.role === "user" ? renderMessageContent(message.content) : message.content}
                            </p>
                          </div>
                          <p className={`text-xs mt-1 ${
                            message.role === "user" 
                              ? "text-right text-muted-foreground" 
                              : "text-muted-foreground"
                          }`}>
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        {message.role === "user" && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                            <User className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                {isGenerating && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary animate-pulse" />
                    </div>
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce delay-100" />
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="relative">
                <MentionAutocomplete
                  isOpen={showMentionDropdown}
                  searchTerm={mentionSearchTerm}
                  onSelect={handleMentionSelect}
                  selectedIndex={selectedMentionIndex}
                />
                <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask a question or @mention an agent..."
                  disabled={isGenerating}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!input.trim() || isGenerating}
                >
                  <Send className="h-4 w-4" />
                </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>
    </motion.div>
  );
}