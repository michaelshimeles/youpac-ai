import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Bot, User, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Badge } from "~/components/ui/badge";
import { useAIService } from "~/services/ServiceProvider";
import { useAIStore } from "~/services/ai/store/useAIStore";
import { Id } from "~/convex/_generated/dataModel";

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
  agentId?: string;
  isTyping?: boolean;
}

interface AIChatFeatureProps {
  projectId: Id<"projects">;
  agentId?: Id<"agents">;
  className?: string;
  height?: string;
}

export function AIChatFeature({
  projectId,
  agentId,
  className,
  height = "h-96",
}: AIChatFeatureProps) {
  const aiService = useAIService();
  const { 
    chatHistory, 
    addChatMessage, 
    selectedAgentId,
    agents,
    getAgentById 
  } = useAIStore();
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const messages = chatHistory[projectId] || [];
  const currentAgent = agentId ? getAgentById(agentId) : undefined;
  const projectAgents = agents.filter(agent => agent.projectId === projectId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    // Add user message
    addChatMessage(projectId, {
      role: 'user',
      content: userMessage,
      agentId,
    });

    try {
      // If we have a specific agent, refine its content
      if (currentAgent && currentAgent.draft) {
        const refinedContent = await aiService.refineContent({
          agentId: currentAgent._id,
          userMessage,
          currentDraft: currentAgent.draft,
          // Add any additional context if needed
        });

        // Add AI response
        addChatMessage(projectId, {
          role: 'ai',
          content: `I've updated the ${currentAgent.type} based on your feedback:\n\n${refinedContent}`,
          agentId,
        });
      } else {
        // General AI chat response
        // This would typically call a general chat API
        const response = await generateChatResponse(userMessage, projectId);
        
        addChatMessage(projectId, {
          role: 'ai',
          content: response,
        });
      }
    } catch (error) {
      addChatMessage(projectId, {
        role: 'ai',
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const generateChatResponse = async (message: string, projectId: string): Promise<string> => {
    // This is a placeholder - you would implement actual chat logic here
    // For now, return a helpful response based on the context
    
    if (message.toLowerCase().includes('help')) {
      return `I can help you with:
• Creating and refining video content (titles, descriptions, thumbnails)
• Analyzing your video transcriptions
• Suggesting improvements to your content
• Answering questions about your project

What would you like to work on?`;
    }
    
    if (message.toLowerCase().includes('transcription')) {
      return "I can help analyze your video transcriptions to create better titles, descriptions, and thumbnails. Upload a video and I'll extract key insights from the content!";
    }
    
    if (message.toLowerCase().includes('title')) {
      return "I can help create compelling titles that maximize click-through rates. Just connect a video to a title agent and I'll analyze the content to suggest optimized titles.";
    }
    
    return `I understand you're asking about "${message}". Could you be more specific about what you'd like help with? I can assist with content creation, video analysis, and improving your YouTube strategy.`;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          AI Assistant
          {currentAgent && (
            <Badge variant="secondary" className="ml-2">
              {currentAgent.type} agent
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Messages */}
        <ScrollArea className={`${height} w-full pr-4`} ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary/50" />
                <p className="text-sm">Start a conversation with the AI assistant</p>
                <p className="text-xs mt-1">Ask about content creation, video analysis, or optimization tips</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'ai' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))
            )}
            
            {/* Typing indicator */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-sm text-muted-foreground">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              currentAgent 
                ? `Ask about your ${currentAgent.type} or suggest improvements...`
                : "Ask the AI assistant anything..."
            }
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Quick actions */}
        {projectAgents.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput("Help me improve my titles")}
              disabled={isLoading}
            >
              Improve titles
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput("Analyze my video content")}
              disabled={isLoading}
            >
              Analyze content
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput("Suggest thumbnail ideas")}
              disabled={isLoading}
            >
              Thumbnail ideas
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AIChatFeature;