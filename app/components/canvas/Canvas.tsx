import { useCallback, useRef, useState, type DragEvent, useEffect } from "react";
import type {
  Edge,
  Node,
  NodeTypes,
  OnConnect,
} from "./ReactFlowComponents";
import { VideoNode } from "./VideoNode";
import { AgentNode } from "./AgentNode";
import { ContentModal } from "./ContentModal";
import { useMutation, useAction, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { Button } from "~/components/ui/button";
import { Sparkles, ChevronLeft, ChevronRight, FileText, Image, Upload, GripVertical, Eye, X, Map, Video, Bot, Hash, Layers, Settings2, Zap, Palette } from "lucide-react";
import { extractAudioFromVideo } from "~/lib/ffmpeg-audio";
import { extractVideoMetadata } from "~/lib/video-metadata";
import { FloatingChat } from "./FloatingChat";
import { ReactFlowWrapper } from "./ReactFlowWrapper";
import { ThumbnailUploadModal } from "./ThumbnailUploadModal";
import { VideoPlayerModal } from "./VideoPlayerModal";
import { PreviewModal } from "~/components/preview/PreviewModal";
import { handleVideoError, createRetryAction } from "~/lib/video-error-handler";
import { VideoProcessingHelp } from "~/components/VideoProcessingHelp";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

const nodeTypes: NodeTypes = {
  video: VideoNode,
  agent: AgentNode,
};

function CanvasContent({ projectId }: { projectId: Id<"projects"> }) {
  return (
    <ReactFlowWrapper>
      {({ ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge }) => (
        <InnerCanvas 
          projectId={projectId}
          ReactFlow={ReactFlow}
          ReactFlowProvider={ReactFlowProvider}
          Background={Background}
          Controls={Controls}
          MiniMap={MiniMap}
          useNodesState={useNodesState}
          useEdgesState={useEdgesState}
          addEdge={addEdge}
        />
      )}
    </ReactFlowWrapper>
  );
}

function InnerCanvas({ 
  projectId,
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge
}: { 
  projectId: Id<"projects">;
  ReactFlow: any;
  ReactFlowProvider: any;
  Background: any;
  Controls: any;
  MiniMap: any;
  useNodesState: any;
  useEdgesState: any;
  addEdge: any;
}) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNodeForModal, setSelectedNodeForModal] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState<string>("");
  const [hasLoadedFromDB, setHasLoadedFromDB] = useState(false);
  const [hasInitializedViewport, setHasInitializedViewport] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [thumbnailModalOpen, setThumbnailModalOpen] = useState(false);
  const [pendingThumbnailNode, setPendingThumbnailNode] = useState<string | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string; duration?: number; fileSize?: number } | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [enableEdgeAnimations, setEnableEdgeAnimations] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [nodesToDelete, setNodesToDelete] = useState<Node[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Get initial state from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("canvas-sidebar-collapsed");
      return saved === "true";
    }
    return false;
  });
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    role: "user" | "ai";
    content: string;
    timestamp: number;
    agentId?: string;
  }>>([]);
  const [isChatGenerating, setIsChatGenerating] = useState(false);
  
  // Use refs to access current values in callbacks
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  
  // Keep refs updated
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);
  
  // Save sidebar collapsed state
  useEffect(() => {
    localStorage.setItem("canvas-sidebar-collapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);
  
  // Convex queries
  const canvasState = useQuery(api.canvas.getState, { projectId });
  const projectVideos = useQuery(api.videos.getByProject, { projectId });
  const projectAgents = useQuery(api.agents.getByProject, { projectId });
  const userProfile = useQuery(api.profiles.get);
  
  // Convex mutations
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const createVideo = useMutation(api.videos.create);
  const updateVideoMetadata = useMutation(api.videos.updateMetadata);
  const updateVideo = useMutation(api.videos.update);
  const createAgent = useMutation(api.agents.create);
  const updateAgentDraft = useMutation(api.agents.updateDraft);
  const updateAgentConnections = useMutation(api.agents.updateConnections);
  const updateAgentPosition = useMutation(api.agents.updatePosition);
  const saveCanvasState = useMutation(api.canvas.saveState);
  const scheduleTranscription = useMutation(api.videoJobs.scheduleTranscription);
  const deleteVideo = useMutation(api.videos.remove);
  const deleteAgent = useMutation(api.agents.remove);
  
  // Convex actions for AI
  const generateContent = useAction(api.aiHackathon.generateContentSimple);
  const generateThumbnail = useAction(api.thumbnail.generateThumbnail);
  const refineContent = useAction(api.chat.refineContent);

  // Handle content generation for an agent node
  const handleGenerate = useCallback(async (nodeId: string, thumbnailImages?: File[], additionalContext?: string) => {
    const agentNode = nodesRef.current.find((n: any) => n.id === nodeId);
    if (!agentNode) {
      console.error("Agent node not found:", nodeId);
      return;
    }
    
    // For thumbnail agents without images, show the upload modal
    if (agentNode.data.type === "thumbnail" && !thumbnailImages) {
      console.log("[Canvas] Opening thumbnail upload modal for node:", nodeId);
      setPendingThumbnailNode(nodeId);
      setThumbnailModalOpen(true);
      return;
    }
    
    try {
      // Update status to generating in UI
      setNodes((nds: any) =>
        nds.map((node: any) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, status: "generating" } }
            : node
        )
      );
      
      // Also update status in database if we have an agentId
      if (agentNode.data.agentId) {
        await updateAgentDraft({
          id: agentNode.data.agentId as Id<"agents">,
          draft: agentNode.data.draft || "",
          status: "generating",
        });
      }
      
      // Find connected video node
      const connectedVideoEdge = edgesRef.current.find((e: any) => e.target === nodeId && e.source?.includes('video'));
      const videoNode = connectedVideoEdge ? nodesRef.current.find((n: any) => n.id === connectedVideoEdge.source) : null;
      
      // Find other connected agent nodes
      const connectedAgentNodes = edgesRef.current
        .filter((e: any) => e.target === nodeId && e.source?.includes('agent'))
        .map((e: any) => nodesRef.current.find((n: any) => n.id === e.source))
        .filter(Boolean);
      
      // Prepare data for AI generation
      let videoData: { 
        title?: string; 
        transcription?: string;
        duration?: number;
        resolution?: { width: number; height: number };
        format?: string;
      } = {};
      if (videoNode && videoNode.data.videoId) {
        // Fetch the video with transcription and metadata from database
        const video = projectVideos?.find((v: any) => v._id === videoNode.data.videoId);
        videoData = {
          title: videoNode.data.title as string,
          transcription: video?.transcription,
          duration: video?.duration,
          resolution: video?.resolution,
          format: video?.format,
        };
        
        // If no transcription, warn the user
        if (!video?.transcription) {
          toast.warning("Generating without transcription - results may be less accurate");
        }
      }
      
      const connectedAgentOutputs = connectedAgentNodes.map((n: any) => ({
        type: n!.data.type as string,
        content: (n!.data.draft || "") as string,
      }));
      
      // Use real user profile data or fallback to defaults
      const profileData = userProfile ? {
        channelName: userProfile.channelName,
        contentType: userProfile.contentType,
        niche: userProfile.niche,
        tone: userProfile.tone || "Professional and engaging",
        targetAudience: userProfile.targetAudience || "General audience",
      } : {
        channelName: "My Channel",
        contentType: "General Content",
        niche: "General",
        tone: "Professional and engaging",
        targetAudience: "General audience",
      };
      
      // Generate content based on agent type
      let result: string;
      let thumbnailUrl: string | undefined;
      
      if (agentNode.data.type === "thumbnail" && thumbnailImages) {
        // For thumbnail agent, use uploaded images
        console.log("[Canvas] Starting thumbnail generation with uploaded images:", thumbnailImages.length);
        toast.info("Processing uploaded images for thumbnail generation...");
        
        // Convert uploaded images to data URLs
        console.log("[Canvas] Converting images to data URLs...");
        const frames = await Promise.all(
          thumbnailImages.map(async (file, index) => {
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
            return {
              dataUrl,
              timestamp: index, // Use index as timestamp for uploaded images
            };
          })
        );
        console.log("[Canvas] Images converted to data URLs:", frames.length);
        
        // Generate thumbnail with vision API
        console.log("[Canvas] Calling generateThumbnail action with:", {
          videoId: videoNode?.data.videoId,
          frameCount: frames.length,
          hasVideoData: !!videoData,
          hasTranscription: !!videoData.transcription,
          connectedAgentsCount: connectedAgentOutputs.length,
          hasProfile: !!profileData
        });
        
        const thumbnailResult = await generateThumbnail({
          agentType: "thumbnail",
          videoId: videoNode?.data.videoId as Id<"videos"> | undefined,
          videoFrames: frames.map(f => ({
            dataUrl: f.dataUrl,
            timestamp: f.timestamp,
          })),
          videoData,
          connectedAgentOutputs,
          profileData,
          additionalContext,
        });
        
        console.log("[Canvas] Thumbnail generation completed");
        console.log("[Canvas] Concept received:", thumbnailResult.concept.substring(0, 100) + "...");
        console.log("[Canvas] Image URL received:", !!thumbnailResult.imageUrl);
        
        result = thumbnailResult.concept;
        thumbnailUrl = thumbnailResult.imageUrl;
        
        // If no image was generated due to safety issues, inform the user
        if (!thumbnailUrl) {
          toast.warning("Thumbnail concept created, but image generation was blocked by safety filters. Try uploading different images or adjusting your requirements.");
        }
      } else {
        // Use regular content generation for other agent types
        result = await generateContent({
          agentType: agentNode.data.type as "title" | "description" | "thumbnail" | "tweets",
          videoId: videoNode?.data.videoId as Id<"videos"> | undefined,
          videoData,
          connectedAgentOutputs,
          profileData,
        });
      }
      
      // Update node with generated content
      console.log("[Canvas] Updating node with generated content");
      if (agentNode.data.type === "thumbnail") {
        console.log("[Canvas] Thumbnail URL to save:", thumbnailUrl ? "Present" : "Missing");
      }
      
      setNodes((nds: any) =>
        nds.map((node: any) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  draft: result,
                  thumbnailUrl: thumbnailUrl,
                  status: "ready",
                },
              }
            : node
        )
      );
      
      // Save to database if the node has an agentId
      if (agentNode.data.agentId) {
        await updateAgentDraft({
          id: agentNode.data.agentId as Id<"agents">,
          draft: result,
          status: "ready",
          thumbnailUrl: thumbnailUrl,
        });
      }
      
      if (agentNode.data.type === "thumbnail" && thumbnailUrl) {
        console.log("[Canvas] Thumbnail generation successful with image URL");
        toast.success("Thumbnail generated successfully! Click 'View' to see the image.");
      } else {
        toast.success(`${agentNode.data.type} generated successfully!`);
      }
    } catch (error: any) {
      console.error("[Canvas] Generation error:", error);
      console.error("[Canvas] Error details:", {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      toast.error(error.message || "Failed to generate content");
      
      // Update status to error
      setNodes((nds: any) =>
        nds.map((node: any) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, status: "error" } }
            : node
        )
      );
      
      // Update error status in database
      if (agentNode.data.agentId) {
        await updateAgentDraft({
          id: agentNode.data.agentId as Id<"agents">,
          draft: agentNode.data.draft || "",
          status: "error",
        });
      }
    }
  }, [generateContent, generateThumbnail, userProfile, setNodes, updateAgentDraft, projectVideos]);
  
  // Handle thumbnail image upload
  const handleThumbnailUpload = useCallback(async (images: File[]) => {
    if (!pendingThumbnailNode) return;
    
    console.log("[Canvas] Handling thumbnail upload for node:", pendingThumbnailNode);
    console.log("[Canvas] Number of images:", images.length);
    
    // Check if there's a recent regeneration request in chat for this node
    const recentMessages = chatMessages.filter(msg => 
      msg.agentId === pendingThumbnailNode && 
      Date.now() - msg.timestamp < 60000 // Within last minute
    );
    
    const regenerationMessage = recentMessages.find(msg => 
      msg.role === 'user' && msg.content.toLowerCase().includes('regenerate')
    );
    
    // Extract the user's requirements from the regeneration message
    let additionalContext = '';
    if (regenerationMessage) {
      // Remove the @mention and extract the actual requirements
      additionalContext = regenerationMessage.content
        .replace(/@\w+_AGENT/gi, '')
        .replace(/regenerate\s*/gi, '')
        .trim();
      console.log("[Canvas] Found regeneration context:", additionalContext);
    }
    
    // Close modal and reset state
    setThumbnailModalOpen(false);
    
    // Call handleGenerate with the uploaded images and context
    await handleGenerate(pendingThumbnailNode, images, additionalContext);
    
    // Reset pending node
    setPendingThumbnailNode(null);
  }, [pendingThumbnailNode, handleGenerate, chatMessages]);
  
  // Handle video click
  const handleVideoClick = useCallback((videoData: { url: string; title: string; duration?: number; fileSize?: number }) => {
    setSelectedVideo(videoData);
    setVideoModalOpen(true);
  }, []);

  // Handle chat messages with @mentions
  const handleChatMessage = useCallback(async (message: string) => {
    // Extract @mention from message
    const mentionRegex = /@(\w+_AGENT)/gi;
    const match = message.match(mentionRegex);
    
    if (!match) {
      // If no mention, just add the message to chat history
      setChatMessages(prev => [...prev, {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: Date.now(),
      }]);
      
      // Add a general response
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: "ai",
          content: "Please @mention a specific agent (e.g., @TITLE_AGENT) to get help with content generation or refinement.",
          timestamp: Date.now(),
        }]);
      }, 500);
      return;
    }
    
    // Find the agent node based on the mention
    const agentType = match[0].replace("@", "").replace("_AGENT", "").toLowerCase();
    const agentNode = nodesRef.current.find((n: any) => n.type === "agent" && n.data.type === agentType);
    
    if (!agentNode || !agentNode.data.agentId) {
      setChatMessages(prev => [...prev, {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: Date.now(),
      }]);
      
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: "ai",
          content: `No ${agentType} agent found in the canvas. Please add one first.`,
          timestamp: Date.now(),
        }]);
      }, 500);
      return;
    }
    
    // Check if agent has no content and user wants to generate
    if (!agentNode.data.draft && (message.toLowerCase().includes('generate') || message.toLowerCase().includes('create'))) {
      // Trigger generation instead of refinement
      await handleGenerate(agentNode.id);
      
      setChatMessages(prev => [...prev, {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: Date.now(),
        agentId: agentNode.id,
      }]);
      
      return;
    }
    
    // Special handling for thumbnail regeneration
    if (agentNode.data.type === 'thumbnail' && message.toLowerCase().includes('regenerate')) {
      // Store the regeneration request
      setChatMessages(prev => [...prev, {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: Date.now(),
        agentId: agentNode.id,
      }]);
      
      // Open thumbnail upload modal
      setPendingThumbnailNode(agentNode.id);
      setThumbnailModalOpen(true);
      
      // Add response
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: "ai",
          content: `To regenerate the thumbnail, please upload new images in the modal that just opened. I'll use your feedback about making the face more shocked when generating the new thumbnail.`,
          timestamp: Date.now(),
          agentId: agentNode.id,
        }]);
      }, 500);
      
      return;
    }
    
    setIsChatGenerating(true);
    
    // Add user message immediately
    setChatMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
      timestamp: Date.now(),
      agentId: agentNode.id,
    }]);
    
    try {
      // Find connected video for context
      const connectedVideoEdge = edgesRef.current.find((e: any) => e.target === agentNode.id && e.source?.includes('video'));
      const videoNode = connectedVideoEdge ? nodesRef.current.find((n: any) => n.id === connectedVideoEdge.source) : null;
      
      let videoData: { title?: string; transcription?: string } = {};
      if (videoNode && videoNode.data.videoId) {
        const video = projectVideos?.find((v: any) => v._id === videoNode.data.videoId);
        videoData = {
          title: videoNode.data.title as string,
          transcription: video?.transcription,
        };
      }
      
      // Get relevant chat history for this agent
      const agentHistory = chatMessages.filter(msg => msg.agentId === agentNode.id);
      
      // Get connected agent outputs for context
      const connectedAgentOutputs: Array<{type: string, content: string}> = [];
      const connectedAgentEdges = edgesRef.current.filter((e: any) => e.target === agentNode.id && e.source?.includes('agent'));
      for (const edge of connectedAgentEdges) {
        const connectedAgent = nodesRef.current.find((n: any) => n.id === edge.source);
        if (connectedAgent && connectedAgent.data.draft) {
          connectedAgentOutputs.push({
            type: connectedAgent.data.type,
            content: connectedAgent.data.draft,
          });
        }
      }

      // Check if this is a regeneration request
      const cleanMessage = message.replace(mentionRegex, "").trim();
      const lowerMessage = cleanMessage.toLowerCase();
      
      // Check for various regeneration keywords
      const regenerationKeywords = [
        'regenerate', 'generate again', 'create new', 'make new', 'redo', 
        'try again', 'give me another', 'different version', 'new version',
        'change it', 'make it', 'create a'
      ];
      
      const isRegeneration = regenerationKeywords.some(keyword => lowerMessage.includes(keyword)) || 
                            (agentNode.data.draft && lowerMessage.includes('generate'));
      
      // If regenerating, prepend context to the user message
      const finalMessage = isRegeneration && agentNode.data.draft
        ? `REGENERATE the ${agentNode.data.type} with a COMPLETELY NEW version based on the user's instructions. Current version: "${agentNode.data.draft}". User requirements: ${cleanMessage}. Create something different that incorporates their feedback.`
        : cleanMessage;

      // Call refine content action with full context
      const result = await refineContent({
        agentId: agentNode.data.agentId as Id<"agents">,
        userMessage: finalMessage,
        currentDraft: agentNode.data.draft || "",
        agentType: agentNode.data.type as "title" | "description" | "thumbnail" | "tweets",
        chatHistory: agentHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        videoData,
        profileData: userProfile ? {
          channelName: userProfile.channelName,
          contentType: userProfile.contentType,
          niche: userProfile.niche,
          tone: userProfile.tone,
          targetAudience: userProfile.targetAudience,
        } : undefined,
      });
      
      // Add AI response
      setChatMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: "ai",
        content: result.response,
        timestamp: Date.now(),
        agentId: agentNode.id,
      }]);
      
      // Update node with new draft
      setNodes((nds: any) =>
        nds.map((node: any) =>
          node.id === agentNode.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  draft: result.updatedDraft,
                  status: "ready",
                },
              }
            : node
        )
      );
      
      // Add a helpful tip if this was their first generation
      if (!agentNode.data.draft && !isRegeneration) {
        setTimeout(() => {
          setChatMessages(prev => [...prev, {
            id: `tip-${Date.now()}`,
            role: "ai",
            content: `💡 Tip: You can regenerate this ${agentNode.data.type} anytime by mentioning @${agentNode.data.type.toUpperCase()}_AGENT and describing what changes you want. For example: "@${agentNode.data.type.toUpperCase()}_AGENT make it more casual" or "@${agentNode.data.type.toUpperCase()}_AGENT try again with a focus on benefits"`,
            timestamp: Date.now(),
            agentId: agentNode.id,
          }]);
        }, 1000);
      }
      
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to process chat message");
      
      setChatMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: "ai",
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: Date.now(),
        agentId: agentNode.id,
      }]);
    } finally {
      setIsChatGenerating(false);
    }
  }, [chatMessages, projectVideos, userProfile, refineContent, setNodes]);

  // Handle chat button click - add @mention to input
  const handleChatButtonClick = useCallback((nodeId: string) => {
    const agentNode = nodesRef.current.find((n: any) => n.id === nodeId);
    if (!agentNode || agentNode.type !== 'agent') return;
    
    const agentType = agentNode.data.type as string;
    const mention = `@${agentType.toUpperCase()}_AGENT `;
    
    // Add mention to chat input
    setChatInput(mention);
    // Clear it after a short delay to prevent continuous updates
    setTimeout(() => setChatInput(''), 100);
  }, []);

  // Handle regenerate button click - open chat with context
  const handleRegenerateClick = useCallback((nodeId: string) => {
    const agentNode = nodesRef.current.find((n: any) => n.id === nodeId);
    if (!agentNode || agentNode.type !== 'agent') return;
    
    const agentType = agentNode.data.type as string;
    
    // Special handling for thumbnail regeneration
    if (agentType === 'thumbnail') {
      // Open thumbnail upload modal for new images
      setPendingThumbnailNode(nodeId);
      setThumbnailModalOpen(true);
      
      // Add a context message to the chat
      setChatMessages(prev => [...prev, {
        id: `system-${Date.now()}`,
        role: "ai",
        content: `Upload new images for thumbnail regeneration. The previous concept was: "${agentNode.data.draft?.slice(0, 200)}..."`,
        timestamp: Date.now(),
        agentId: nodeId,
      }]);
    } else {
      // For other agents, open chat with pre-filled message
      const mention = `@${agentType.toUpperCase()}_AGENT Regenerate with changes: `;
      
      // Add mention to chat input and open chat if minimized
      setChatInput(mention);
      // Clear it after a short delay to prevent continuous updates
      setTimeout(() => setChatInput(''), 100);
      
      // Add a context message to the chat
      setChatMessages(prev => [...prev, {
        id: `system-${Date.now()}`,
        role: "ai",
        content: `Ready to regenerate ${agentType} content. Please describe what changes you'd like to make.`,
        timestamp: Date.now(),
        agentId: nodeId,
      }]);
    }
  }, []);

  // Generate content for all agent nodes (connect if needed)
  const handleGenerateAll = useCallback(async () => {
    // Find video node
    const videoNode = nodes.find((node: any) => node.type === 'video');
    if (!videoNode) {
      toast.error("Please add a video first!");
      return;
    }
    
    // Find all agent nodes
    const agentNodes = nodes.filter((node: any) => node.type === 'agent');
    if (agentNodes.length === 0) {
      toast.error("No agent nodes found!");
      return;
    }
    
    setIsGeneratingAll(true);
    setGenerationProgress({ current: 0, total: agentNodes.length });
    
    // Ensure all agents are connected to video node
    agentNodes.forEach((agentNode: any) => {
      const existingEdge = edges.find((edge: any) => 
        edge.source === videoNode.id && edge.target === agentNode.id
      );
      
      if (!existingEdge) {
        const newEdge: Edge = {
          id: `e${videoNode.id}-${agentNode.id}`,
          source: videoNode.id,
          target: agentNode.id,
          animated: enableEdgeAnimations && !isDragging,
        };
        setEdges((eds: any) => [...eds, newEdge]);
        
        // Update agent connections in database
        if (agentNode.data.agentId) {
          updateAgentConnections({
            id: agentNode.data.agentId as Id<"agents">,
            connections: [videoNode.data.videoId as string],
          }).catch((error: any) => {
            console.error("Failed to update agent connections:", error);
          });
        }
      }
    });
    
    // Generate content for each agent (skip thumbnail nodes)
    let processedCount = 0;
    for (let i = 0; i < agentNodes.length; i++) {
      const agentNode = agentNodes[i];
      
      if (agentNode.data.type === "thumbnail") {
        console.log("[Canvas] Skipping thumbnail node in Generate All:", agentNode.id);
        toast.info("Thumbnail generation requires manual image upload");
        continue;
      }
      
      processedCount++;
      setGenerationProgress({ current: processedCount, total: agentNodes.length });
      
      try {
        await handleGenerate(agentNode.id);
      } catch (error) {
        console.error(`Failed to generate content for ${agentNode.data.type}:`, error);
        toast.error(`Failed to generate ${agentNode.data.type}`);
      }
    }
    
    setIsGeneratingAll(false);
    setGenerationProgress({ current: 0, total: 0 });
    toast.success("All content generated successfully!");
  }, [nodes, edges, setEdges, handleGenerate, updateAgentConnections]);

  const onConnect: OnConnect = useCallback(
    (params) => {
      const sourceNode = nodes.find((n: any) => n.id === params.source);
      const targetNode = nodes.find((n: any) => n.id === params.target);
      
      // Allow connections from video to agent or agent to agent
      if (!sourceNode || !targetNode) return;
      
      if (
        (sourceNode.type === 'video' && targetNode.type === 'agent') ||
        (sourceNode.type === 'agent' && targetNode.type === 'agent')
      ) {
        setEdges((eds: any) => addEdge(params, eds));
        
        // Update agent connections in database
        if (targetNode.data.agentId && sourceNode.data.videoId) {
          const currentConnections = targetNode.data.connections || [];
          const newConnections = [...currentConnections, sourceNode.data.videoId];
          
          updateAgentConnections({
            id: targetNode.data.agentId as Id<"agents">,
            connections: newConnections,
          }).catch((error: any) => {
            console.error("Failed to update agent connections:", error);
          });
          
          // Update node data
          setNodes((nds: any) =>
            nds.map((node: any) =>
              node.id === targetNode.id
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      connections: newConnections,
                    },
                  }
                : node
            )
          );
        }
      }
    },
    [nodes, setEdges, setNodes, updateAgentConnections]
  );
  
  // Perform the actual deletion
  const performDeletion = useCallback(
    async (nodes: Node[]) => {
      for (const node of nodes) {
        try {
          if (node.type === 'video' && node.data.videoId) {
            // Delete video from database (this also deletes associated agents)
            await deleteVideo({ id: node.data.videoId as Id<"videos"> });
            toast.success("Video and associated content deleted");
            
          } else if (node.type === 'agent' && node.data.agentId) {
            // Delete agent from database
            await deleteAgent({ id: node.data.agentId as Id<"agents"> });
            toast.success("Agent deleted");
          }
        } catch (error) {
          console.error("Failed to delete node:", error);
          toast.error("Failed to delete node");
          
          // Re-add the node if deletion failed
          setNodes((nds: any) => [...nds, node]);
        }
      }
    },
    [deleteVideo, deleteAgent, setNodes]
  );
  
  // Handle node deletion
  const onNodesDelete = useCallback(
    (nodes: Node[]) => {
      console.log("🗑️ Nodes marked for deletion:", nodes);
      console.log("Node types:", nodes.map(n => n.type));
      
      // Check if any nodes have important data
      const hasVideo = nodes.some((n: any) => n.type === 'video');
      const hasAgent = nodes.some((n: any) => n.type === 'agent' && n.data.draft);
      
      if (hasVideo || hasAgent) {
        // Store nodes for deletion and show dialog
        setNodesToDelete(nodes);
        setDeleteDialogOpen(true);
        return false; // Prevent React Flow from deleting immediately
      } else {
        // For non-important nodes (like videoInfo), delete immediately
        performDeletion(nodes);
        return true;
      }
    },
    [performDeletion]
  );
  
  // Handle deletion confirmation
  const handleDeleteConfirm = useCallback(() => {
    performDeletion(nodesToDelete);
    // Remove nodes from React Flow
    setNodes((nds: any) => 
      nds.filter((node: any) => !nodesToDelete.some(n => n.id === node.id))
    );
    setDeleteDialogOpen(false);
    setNodesToDelete([]);
  }, [nodesToDelete, performDeletion, setNodes]);

  // Find non-overlapping position for new nodes
  const findNonOverlappingPosition = useCallback((desiredPos: { x: number; y: number }, nodeType: string) => {
    const nodeWidth = nodeType === 'video' ? 200 : 150;
    const nodeHeight = nodeType === 'video' ? 120 : 50;
    const spacing = 20;
    
    // Check if position overlaps with any existing node
    const checkOverlap = (pos: { x: number; y: number }) => {
      return nodes.some((node: any) => {
        const existingWidth = node.type === 'video' ? 200 : 150;
        const existingHeight = node.type === 'video' ? 120 : 50;
        
        return (
          pos.x < node.position.x + existingWidth + spacing &&
          pos.x + nodeWidth + spacing > node.position.x &&
          pos.y < node.position.y + existingHeight + spacing &&
          pos.y + nodeHeight + spacing > node.position.y
        );
      });
    };
    
    // If no overlap, return desired position
    if (!checkOverlap(desiredPos)) {
      return desiredPos;
    }
    
    // Otherwise, find nearest free position using spiral search
    const step = 30;
    let distance = 1;
    
    while (distance < 10) {
      // Try positions in a spiral pattern
      const positions = [
        { x: desiredPos.x + step * distance, y: desiredPos.y },
        { x: desiredPos.x - step * distance, y: desiredPos.y },
        { x: desiredPos.x, y: desiredPos.y + step * distance },
        { x: desiredPos.x, y: desiredPos.y - step * distance },
        { x: desiredPos.x + step * distance, y: desiredPos.y + step * distance },
        { x: desiredPos.x - step * distance, y: desiredPos.y - step * distance },
        { x: desiredPos.x + step * distance, y: desiredPos.y - step * distance },
        { x: desiredPos.x - step * distance, y: desiredPos.y + step * distance },
      ];
      
      for (const pos of positions) {
        if (!checkOverlap(pos)) {
          return pos;
        }
      }
      
      distance++;
    }
    
    // If no free position found, offset significantly
    return {
      x: desiredPos.x + 200,
      y: desiredPos.y + 100
    };
  }, [nodes]);

  // Handle content update from modal
  const handleContentUpdate = async (nodeId: string, newContent: string) => {
    const node = nodes.find((n: any) => n.id === nodeId);
    if (!node) return;
    
    setNodes((nds: any) =>
      nds.map((node: any) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, draft: newContent } }
          : node
      )
    );
    
    // Save to database if it's an agent with an ID
    if (node.type === 'agent' && node.data.agentId) {
      try {
        await updateAgentDraft({
          id: node.data.agentId as Id<"agents">,
          draft: newContent,
          status: "ready",
        });
        toast.success("Content updated!");
      } catch (error) {
        console.error("Failed to update agent content:", error);
        toast.error("Failed to save content");
      }
    } else {
      toast.success("Content updated!");
    }
  };


  // Handle video file upload
  const handleVideoUpload = async (file: File, position: { x: number; y: number }, retryCount = 0) => {
    const MAX_RETRIES = 2;
    try {
      // Create a temporary node with loading state
      const tempNodeId = `video_temp_${Date.now()}`;
      const tempNode: Node = {
        id: tempNodeId,
        type: "video",
        position,
        data: {
          title: file.name.replace(/\.[^/.]+$/, ""),
          isUploading: true,
        },
      };
      setNodes((nds: any) => nds.concat(tempNode));

      // Validate file before upload
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 100MB.`);
      }

      // Check video format
      const supportedFormats = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mov'];
      if (!supportedFormats.includes(file.type) && !file.name.match(/\.(mp4|mov|avi|webm)$/i)) {
        throw new Error('Unsupported video format. Please upload MP4, MOV, AVI, or WebM files.');
      }

      // Step 1: Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();
      
      // Step 2: Upload file to Convex storage with progress tracking
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!result.ok) {
        const errorText = await result.text().catch(() => 'Unknown error');
        throw new Error(`Upload failed: ${result.status} ${result.statusText}. ${errorText}`);
      }
      
      const { storageId } = await result.json();
      
      // Step 3: Create video record in database with storage URL
      console.log("Creating video record in database...");
      const video = await createVideo({
        projectId,
        title: file.name.replace(/\.[^/.]+$/, ""),
        storageId: storageId,
        canvasPosition: position,
      });
      
      console.log("Video created:", video);
      if (!video || !video._id) {
        throw new Error("Failed to create video record in database. Please try again.");
      }
      
      // Step 4: Update node with real data including video URL
      setNodes((nds: any) => 
        nds.map((node: any) => 
          node.id === tempNodeId
            ? {
                ...node,
                id: `video_${video._id}`,
                data: {
                  ...node.data,
                  isUploading: false,
                  videoId: video._id,
                  storageId,
                  videoUrl: video.videoUrl,
                  title: video.title,
                  isTranscribing: true,
                  onVideoClick: () => handleVideoClick({
                    url: video.videoUrl!,
                    title: video.title || "Untitled Video",
                    duration: undefined, // Will be populated after metadata extraction
                    fileSize: file.size,
                  }),
                },
              }
            : node
        )
      );
      
      toast.success("Video uploaded successfully!", {
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
      });
      
      // Update node to show transcribing state immediately
      setNodes((nds: any) =>
        nds.map((node: any) =>
          node.id === `video_${video._id}`
            ? {
                ...node,
                data: {
                  ...node.data,
                  isTranscribing: true,
                  onVideoClick: node.data.onVideoClick, // Preserve the click handler
                },
              }
            : node
        )
      );
      
      // Step 5: Extract video metadata (optional, non-blocking)
      console.log("Starting optional metadata extraction for video:", video._id);
      // Run metadata extraction in parallel, don't block transcription
      (async () => {
        try {
          
          // Extract metadata with timeout
          console.log("Calling extractVideoMetadata...");
          
          let metadata: any;
          try {
            // Set a timeout for metadata extraction
            const metadataPromise = extractVideoMetadata(file, {
              onProgress: (progress) => {
                console.log("Metadata extraction progress:", progress);
              },
              extractThumbnails: false, // Disable thumbnails for now to speed up
              useFFmpeg: false, // Disable FFmpeg to avoid loading issues
            });
            
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error("Metadata extraction timeout")), 15000); // 15 second timeout
            });
            
            metadata = await Promise.race([metadataPromise, timeoutPromise]);
            console.log("Metadata extracted:", metadata);
          } catch (metadataError) {
            console.error("Metadata extraction failed, using basic info:", metadataError);
            // Use basic metadata as fallback
            metadata = {
              duration: 0,
              fileSize: file.size,
              resolution: { width: 0, height: 0 },
              frameRate: 0,
              bitRate: 0,
              format: file.type.split('/')[1] || 'unknown',
              codec: 'unknown',
              thumbnails: []
            };
            
            // Show info message but don't fail the upload
            toast.info("Video details couldn't be extracted", {
              description: "The video was uploaded successfully, but some information may be missing.",
            });
          }
          
          // Update video in database with metadata
          await updateVideoMetadata({
            id: video._id,
            duration: metadata.duration,
            fileSize: metadata.fileSize,
            resolution: metadata.resolution,
            frameRate: metadata.frameRate,
            bitRate: metadata.bitRate,
            format: metadata.format,
            codec: metadata.codec,
            audioInfo: metadata.audioInfo,
          });
          
          // Update video node with metadata
          setNodes((nds: any) =>
            nds.map((node: any) => {
              if (node.id === `video_${video._id}`) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    duration: metadata.duration,
                    fileSize: metadata.fileSize,
                    onVideoClick: () => handleVideoClick({
                      url: node.data.videoUrl!,
                      title: node.data.title || "Untitled Video",
                      duration: metadata.duration,
                      fileSize: metadata.fileSize,
                    }),
                  },
                };
              }
              return node;
            })
          );
          
          // Only show success if we got real metadata
          if (metadata.duration > 0 || metadata.resolution.width > 0) {
            toast.success("Video information extracted!");
          }
        } catch (metadataError: any) {
          console.error("Metadata extraction error:", metadataError);
          
          // Handle metadata error gracefully
          handleVideoError(metadataError, 'Metadata Extraction');
          
          // Continue with upload even if metadata fails
          toast.warning("Could not extract all video information");
        }
      })();
      
      console.log("Moving to transcription step...");
      
      // Step 6: Transcribe video or extract audio first if too large
      const fileSizeMB = file.size / (1024 * 1024);
      const MAX_DIRECT_TRANSCRIBE_SIZE = 25; // 25MB limit for Whisper API
      
      console.log(`Video file size: ${fileSizeMB.toFixed(2)}MB, Max direct size: ${MAX_DIRECT_TRANSCRIBE_SIZE}MB`);
      
      // Small delay to ensure file is available in storage
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        if (fileSizeMB > MAX_DIRECT_TRANSCRIBE_SIZE) {
          // Show audio extraction progress
          toast.info("Video is large. Extracting audio for transcription...");
          
          // Update node to show extraction status
          setNodes((nds: any) =>
            nds.map((node: any) =>
              node.id === `video_${video._id}`
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      isTranscribing: false,
                      isExtracting: true,
                      extractionProgress: 0,
                    },
                  }
                : node
            )
          );
          
          // Extract audio from video
          const audioFile = await extractAudioFromVideo(file, (progress) => {
              setNodes((nds: any) =>
                nds.map((node: any) =>
                  node.id === `video_${video._id}`
                    ? {
                        ...node,
                        data: {
                          ...node.data,
                          extractionProgress: Math.round(progress * 100),
                        },
                      }
                    : node
                )
              );
            });
          
          // Upload audio file
          const audioUploadUrl = await generateUploadUrl();
          const audioResult = await fetch(audioUploadUrl, {
            method: "POST",
            headers: { "Content-Type": audioFile.type },
            body: audioFile,
          });
          
          if (!audioResult.ok) throw new Error("Audio upload failed");
          
          const { storageId: audioStorageId } = await audioResult.json();
          
          // Update node to show transcription status
          setNodes((nds: any) =>
            nds.map((node: any) =>
              node.id === `video_${video._id}`
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      isExtracting: false,
                      isTranscribing: true,
                    },
                  }
                : node
            )
          );
          
          // Schedule background transcription
          try {
            console.log("Scheduling audio transcription for video:", video._id);
            const result = await scheduleTranscription({
              videoId: video._id,
              storageId: audioStorageId,
              fileType: "audio",
            });
            console.log("Schedule transcription result:", result);
            
            toast.info("Audio transcription started in background. It will continue even if you close this tab.");
          } catch (scheduleError: any) {
            console.error("Failed to schedule transcription:", scheduleError);
            console.error("Error details:", scheduleError.message, scheduleError.stack);
            
            // Don't throw - transcription failure shouldn't fail the whole upload
            toast.error("Transcription couldn't start", {
              description: "The video was uploaded but transcription failed. You can try again later.",
            });
            
            // Update node to show transcription failed
            setNodes((nds: any) =>
              nds.map((node: any) =>
                node.id === `video_${video._id}`
                  ? {
                      ...node,
                      data: {
                        ...node.data,
                        isTranscribing: false,
                        isExtracting: false,
                        hasTranscription: false,
                        transcriptionError: scheduleError.message,
                        onRetryTranscription: () => retryTranscription(video._id),
                      },
                    }
                  : node
              )
            );
          }
        } else {
          // Schedule background transcription for smaller files  
          try {
            console.log("Scheduling video transcription for video:", video._id);
            const result = await scheduleTranscription({
              videoId: video._id,
              storageId: storageId,
              fileType: "video",
            });
            console.log("Schedule transcription result:", result);
            
            toast.info("Video transcription started in background. It will continue even if you close this tab.");
          } catch (scheduleError: any) {
            console.error("Failed to schedule transcription:", scheduleError);
            console.error("Error details:", scheduleError.message, scheduleError.stack);
            
            // Don't throw - transcription failure shouldn't fail the whole upload
            toast.error("Transcription couldn't start", {
              description: "The video was uploaded but transcription failed. You can try again later.",
            });
            
            // Update node to show transcription failed
            setNodes((nds: any) =>
              nds.map((node: any) =>
                node.id === `video_${video._id}`
                  ? {
                      ...node,
                      data: {
                        ...node.data,
                        isTranscribing: false,
                        isExtracting: false,
                        hasTranscription: false,
                        transcriptionError: scheduleError.message,
                        onRetryTranscription: () => retryTranscription(video._id),
                      },
                    }
                  : node
              )
            );
          }
        }
        
        // Note: The transcription status will be updated when we reload from DB
        // For now, keep showing the transcribing state
      } catch (transcriptionError: any) {
        console.error("Transcription error:", transcriptionError);
        
        // Handle transcription errors gracefully
        const errorDetails = handleVideoError(transcriptionError, 'Transcription');
        
        // Update node to show transcription failed
        setNodes((nds: any) =>
          nds.map((node: any) =>
            node.id === `video_${video._id}`
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    isTranscribing: false,
                    isExtracting: false,
                    hasTranscription: false,
                    transcriptionError: errorDetails.message,
                    onRetryTranscription: () => retryTranscription(video._id),
                  },
                }
              : node
          )
        );
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      console.error("Full error details:", error.stack);
      
      // Handle the error with our error handler
      const errorDetails = handleVideoError(error, 'Upload');
      
      // Remove the temporary node on error
      setNodes((nds: any) => nds.filter((node: any) => !node.id.startsWith('video_temp_')));
      
      // If recoverable and haven't exceeded retries, show retry option
      if (errorDetails.recoverable && retryCount < MAX_RETRIES) {
        const retryAction = createRetryAction(() => {
          handleVideoUpload(file, position, retryCount + 1);
        });
        
        toast.error(errorDetails.message, {
          description: errorDetails.details,
          duration: 8000,
          action: retryAction,
        });
      }
    }
  };

  // Retry transcription for a failed video
  // Create refs for viewport saving
  const viewportRef = useRef<{ x: number; y: number; zoom: number } | null>(null);
  const viewportSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle viewport changes - debounced save
  const onViewportChange = useCallback((viewport: { x: number; y: number; zoom: number }) => {
    // Store the latest viewport
    viewportRef.current = viewport;
    
    // Clear existing timeout
    if (viewportSaveTimeoutRef.current) {
      clearTimeout(viewportSaveTimeoutRef.current);
    }
    
    // Set new timeout to save viewport
    if (projectId && hasInitializedViewport && hasLoadedFromDB) {
      viewportSaveTimeoutRef.current = setTimeout(() => {
        console.log("Saving viewport after change:", viewport);
        // Only update viewport in the canvas state
        const currentCanvasState = canvasState || { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
        saveCanvasState({
          projectId,
          nodes: currentCanvasState.nodes,
          edges: currentCanvasState.edges,
          viewport: {
            x: viewport.x,
            y: viewport.y,
            zoom: viewport.zoom,
          },
        }).catch((error) => {
          console.error("Failed to save viewport:", error);
        });
      }, 1000); // Save after 1 second of no viewport changes
    }
  }, [projectId, hasInitializedViewport, hasLoadedFromDB, canvasState, saveCanvasState]);

  const retryTranscription = async (videoId: string) => {
    try {
      const video = nodes.find((n: any) => n.id === `video_${videoId}`)?.data;
      if (!video?.storageId) {
        toast.error("Cannot retry: Video data not found");
        return;
      }

      // Update node to show transcribing state
      setNodes((nds: any) =>
        nds.map((node: any) =>
          node.id === `video_${videoId}`
            ? {
                ...node,
                data: {
                  ...node.data,
                  isTranscribing: true,
                  transcriptionError: null,
                },
              }
            : node
        )
      );

      // Schedule transcription
      await scheduleTranscription({
        videoId: videoId as any,
        storageId: video.storageId,
        fileType: "video",
      });

      toast.success("Transcription retry started", {
        description: "The transcription will process in the background.",
      });
    } catch (error: any) {
      console.error("Retry transcription error:", error);
      handleVideoError(error, 'Transcription Retry');
      
      // Reset node state
      setNodes((nds: any) =>
        nds.map((node: any) =>
          node.id === `video_${videoId}`
            ? {
                ...node,
                data: {
                  ...node.data,
                  isTranscribing: false,
                  transcriptionError: error.message,
                },
              }
            : node
        )
      );
    }
  };

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      
      // Handle video file drop
      if (event.dataTransfer.files.length > 0) {
        const file = event.dataTransfer.files[0];
        if (file.type.startsWith("video/")) {
          if (!reactFlowInstance) return;
          
          const desiredPosition = reactFlowInstance.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });
          
          const position = findNonOverlappingPosition(desiredPosition, 'video');

          // Show file size info
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
          const MAX_FILE_SIZE = 25 * 1024 * 1024;
          
          if (file.size > MAX_FILE_SIZE) {
            toast.info(`Video is ${fileSizeMB}MB. Audio will be extracted for transcription (supports up to ~25 min videos).`);
          } else {
            toast.info(`Video is ${fileSizeMB}MB. Will transcribe directly.`);
          }

          // Upload video to Convex
          handleVideoUpload(file, position);
          return;
        }
      }

      // Handle node type drop
      if (!type || !reactFlowInstance) {
        return;
      }

      const desiredPosition = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      const position = findNonOverlappingPosition(desiredPosition, type);

      // Find the first video node to associate with this agent
      const videoNode = nodes.find((n: any) => n.type === 'video' && n.data.videoId);
      if (!videoNode) {
        toast.error("Please add a video first before adding agents");
        return;
      }

      // Create agent in database
      createAgent({
        videoId: videoNode.data.videoId as Id<"videos">,
        type: type as "title" | "description" | "thumbnail" | "tweets",
        canvasPosition: position,
      }).then((agentId) => {
        const nodeId = `agent_${type}_${agentId}`;
        const newNode: Node = {
          id: nodeId,
          type: "agent",
          position,
          data: {
            agentId, // Store the database ID
            type,
            draft: "",
            status: "idle",
            connections: [],
            onGenerate: () => handleGenerate(nodeId),
            onChat: () => handleChatButtonClick(nodeId),
            onView: () => setSelectedNodeForModal(nodeId),
            onRegenerate: () => handleRegenerateClick(nodeId),
          },
        };

        setNodes((nds: any) => nds.concat(newNode));
        
        // Automatically create edge from video to agent
        const edgeId = `e${videoNode.id}-${nodeId}`;
        const newEdge: Edge = {
          id: edgeId,
          source: videoNode.id,
          target: nodeId,
          animated: enableEdgeAnimations && !isDragging,
        };
        setEdges((eds: any) => [...eds, newEdge]);
        
        // Update agent's connections in database
        updateAgentConnections({
          id: agentId,
          connections: [videoNode.data.videoId as string],
        }).catch((error) => {
          console.error("Failed to update agent connections:", error);
        });
        
        toast.success(`${type} agent added and connected to video`);
        
        // Just inform about transcription status, don't auto-generate
        if (videoNode.data.isTranscribing) {
          toast.info("Video is still being transcribed. Generate once complete.");
        } else if (videoNode.data.hasTranscription) {
          toast.info("Ready to generate content - click Generate on the agent node");
        } else {
          toast.warning("No transcription available - content will be less accurate");
        }
      }).catch((error) => {
        console.error("Failed to create agent:", error);
        toast.error("Failed to create agent");
      });
    },
    [reactFlowInstance, setNodes, setEdges, handleVideoUpload, handleGenerate, nodes, createAgent, projectId, updateAgentConnections, handleChatButtonClick, handleRegenerateClick]
  );

  // Load existing videos and agents from the project
  useEffect(() => {
    if (!hasLoadedFromDB && projectVideos !== undefined && projectAgents !== undefined) {
      const videoNodes: Node[] = projectVideos.map((video) => ({
        id: `video_${video._id}`,
        type: "video",
        position: video.canvasPosition,
        data: {
          videoId: video._id,
          title: video.title,
          videoUrl: video.videoUrl,
          storageId: video.fileId,
          duration: video.duration,
          fileSize: video.fileSize,
          hasTranscription: !!video.transcription || video.transcriptionStatus === "completed",
          isTranscribing: video.transcriptionStatus === "processing",
          transcriptionError: video.transcriptionStatus === "failed" ? video.transcriptionError : null,
          onVideoClick: () => handleVideoClick({
            url: video.videoUrl!,
            title: video.title || "Untitled Video",
            duration: video.duration,
            fileSize: video.fileSize,
          }),
          onRetryTranscription: video.transcriptionStatus === "failed" ? () => retryTranscription(video._id) : undefined,
        },
      }));

      const agentNodes: Node[] = projectAgents.map((agent) => ({
        id: `agent_${agent.type}_${agent._id}`,
        type: "agent",
        position: agent.canvasPosition,
        data: {
          agentId: agent._id, // Store the database ID
          type: agent.type,
          draft: agent.draft,
          thumbnailUrl: agent.thumbnailUrl,
          status: agent.status,
          connections: agent.connections,
          onGenerate: () => handleGenerate(`agent_${agent.type}_${agent._id}`),
          onChat: () => handleChatButtonClick(`agent_${agent.type}_${agent._id}`),
          onView: () => setSelectedNodeForModal(`agent_${agent.type}_${agent._id}`),
          onRegenerate: () => handleRegenerateClick(`agent_${agent.type}_${agent._id}`),
        },
      }));

      setNodes([...videoNodes, ...agentNodes]);
      
      // Load chat history from agents
      const allMessages: typeof chatMessages = [];
      projectAgents.forEach((agent) => {
        if (agent.chatHistory && agent.chatHistory.length > 0) {
          const agentMessages = agent.chatHistory.map((msg, idx) => ({
            id: `msg-${agent._id}-${idx}`,
            role: msg.role,
            content: msg.message,
            timestamp: msg.timestamp,
            agentId: `agent_${agent.type}_${agent._id}`,
          }));
          allMessages.push(...agentMessages);
        }
      });
      // Sort messages by timestamp
      allMessages.sort((a: any, b: any) => a.timestamp - b.timestamp);
      setChatMessages(allMessages);
      
      // Reconstruct edges based on agent connections
      const edges: Edge[] = [];
      projectAgents.forEach((agent) => {
        agent.connections.forEach((connectionId: string) => {
          // Find the source node by its data ID
          let sourceNodeId: string | null = null;
          
          // Check if it's a video ID
          const videoNode = videoNodes.find(vn => vn.data.videoId === connectionId);
          if (videoNode) {
            sourceNodeId = videoNode.id;
          } else {
            // Check if it's an agent ID
            const agentNode = agentNodes.find(an => an.data.agentId === connectionId);
            if (agentNode) {
              sourceNodeId = agentNode.id;
            }
          }
          
          if (sourceNodeId) {
            edges.push({
              id: `e${sourceNodeId}-agent_${agent.type}_${agent._id}`,
              source: sourceNodeId,
              target: `agent_${agent.type}_${agent._id}`,
              animated: enableEdgeAnimations && !isDragging,
            });
          }
        });
      });
      
      setEdges(edges);
      setHasLoadedFromDB(true);
    }
  }, [projectVideos, projectAgents, hasLoadedFromDB, setNodes, setEdges, handleGenerate, handleChatButtonClick]);
  
  // Load canvas viewport state - only run once when everything is ready
  useEffect(() => {
    if (!reactFlowInstance || !hasLoadedFromDB || hasInitializedViewport) return;
    
    // If we have a saved canvas state with viewport
    if (canvasState?.viewport) {
      const { x, y, zoom } = canvasState.viewport;
      // Apply saved viewport with minimal validation
      if (typeof x === 'number' && typeof y === 'number' && typeof zoom === 'number' && zoom > 0) {
        console.log("Restoring saved viewport:", { x, y, zoom });
        // Small delay to ensure React Flow is ready
        setTimeout(() => {
          reactFlowInstance.setViewport({ x, y, zoom });
          viewportRef.current = { x, y, zoom };
          setHasInitializedViewport(true);
        }, 50);
      } else {
        setHasInitializedViewport(true);
      }
    } else if (nodes.length > 0) {
      // Only fit view on first load when there's no saved state
      console.log("No saved viewport, fitting view to nodes");
      setTimeout(() => {
        reactFlowInstance.fitView({ 
          padding: 0.2, 
          maxZoom: 1.5,
          duration: 800 
        });
        setHasInitializedViewport(true);
      }, 100);
    } else {
      // No nodes and no saved state, just mark as initialized
      setHasInitializedViewport(true);
    }
  }, [canvasState?.viewport, reactFlowInstance, hasLoadedFromDB, hasInitializedViewport, nodes.length]);
  
  // Debug: Log when nodes change to see selection state
  useEffect(() => {
    const selectedNodes = nodes.filter((node: any) => node.selected);
    if (selectedNodes.length > 0) {
      console.log("📍 Selected nodes:", selectedNodes.map((n: any) => ({ id: n.id, type: n.type, selected: n.selected })));
    }
  }, [nodes]);

  // Periodically check for transcription updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update nodes with current transcription status from database
      if (projectVideos && projectVideos.length > 0) {
        setNodes((nds: any) =>
          nds.map((node: any) => {
            if (node.type === 'video') {
              const video = projectVideos.find((v: any) => `video_${v._id}` === node.id);
              if (video) {
                // Only update if status has changed
                const newHasTranscription = !!video.transcription || video.transcriptionStatus === "completed";
                const newIsTranscribing = video.transcriptionStatus === "processing";
                const newTranscriptionError = video.transcriptionStatus === "failed" ? video.transcriptionError : null;
                
                if (node.data.hasTranscription !== newHasTranscription ||
                    node.data.isTranscribing !== newIsTranscribing ||
                    node.data.transcriptionError !== newTranscriptionError) {
                  console.log(`Updating video ${video._id} transcription status:`, {
                    status: video.transcriptionStatus,
                    hasTranscription: newHasTranscription,
                    isTranscribing: newIsTranscribing,
                    error: newTranscriptionError
                  });
                  
                  // Show toast when transcription completes
                  if (!node.data.hasTranscription && newHasTranscription) {
                    toast.success("Video transcription completed!");
                  } else if (!node.data.transcriptionError && newTranscriptionError) {
                    toast.error(`Transcription failed: ${newTranscriptionError}`);
                  }
                  
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      hasTranscription: newHasTranscription,
                      isTranscribing: newIsTranscribing,
                      transcriptionError: newTranscriptionError,
                      onRetryTranscription: newTranscriptionError ? () => retryTranscription(video._id) : undefined,
                    },
                  };
                }
              }
            }
            return node;
          })
        );
      }
    }, 3000); // Check every 3 seconds
    
    return () => clearInterval(interval);
  }, [projectVideos, setNodes]);

  // Auto-save canvas state
  useEffect(() => {
    if (!projectId || !hasLoadedFromDB || !hasInitializedViewport) return;
    
    const saveTimeout = setTimeout(() => {
      // Use the viewport from ref or get current viewport
      const viewport = viewportRef.current || reactFlowInstance?.getViewport();
      
      // Basic viewport validation
      if (!viewport || typeof viewport.zoom !== 'number' || viewport.zoom <= 0) {
        console.warn("Invalid viewport, skipping save");
        return;
      }
      
      console.log("Saving canvas state with viewport:", viewport);
      
      saveCanvasState({
        projectId,
        nodes: nodes.map((node: any) => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data,
        })),
        edges: edges.map((edge: any) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        })),
        viewport: {
          x: viewport.x,
          y: viewport.y,
          zoom: viewport.zoom,
        },
      }).catch((error) => {
        console.error("Failed to save canvas state:", error);
      });
    }, 2000); // Save after 2 seconds of inactivity
    
    return () => clearTimeout(saveTimeout);
  }, [nodes, edges, reactFlowInstance, projectId, saveCanvasState, hasLoadedFromDB, hasInitializedViewport]);

  return (
    <ReactFlowProvider>
      <div className="flex h-[calc(100vh-var(--header-height))]">
        {/* Sidebar with draggable agent nodes */}
        <aside className={`${isSidebarCollapsed ? "w-20" : "w-72"} bg-gradient-to-b from-background via-background to-background/95 border-r border-border/50 transition-all duration-300 flex flex-col backdrop-blur-sm`}>
          <div className={`flex-1 ${isSidebarCollapsed ? "p-3" : "p-6"} overflow-y-auto`}>
            {/* Header */}
            <div className={`flex items-center ${isSidebarCollapsed ? "justify-center mb-6" : "justify-between mb-8"}`}>
              {!isSidebarCollapsed && (
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">AI Agents</h2>
                    <p className="text-xs text-muted-foreground">Drag to canvas</p>
                  </div>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`h-9 w-9 hover:bg-primary/10 ${isSidebarCollapsed ? "" : "ml-auto"}`}
              >
                {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>
            
            {/* Agents Section */}
            <div className="space-y-3">
              {!isSidebarCollapsed && (
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Content Agents</span>
                </div>
              )}
              
              <DraggableNode 
                type="title" 
                label={isSidebarCollapsed ? "" : "Title Generator"} 
                description={isSidebarCollapsed ? "" : "Create engaging video titles"}
                icon={<Hash className="h-5 w-5" />}
                collapsed={isSidebarCollapsed}
                color="blue"
              />
              <DraggableNode 
                type="description" 
                label={isSidebarCollapsed ? "" : "Description Writer"} 
                description={isSidebarCollapsed ? "" : "Write SEO-optimized descriptions"}
                icon={<FileText className="h-5 w-5" />}
                collapsed={isSidebarCollapsed}
                color="green"
              />
              <DraggableNode 
                type="thumbnail" 
                label={isSidebarCollapsed ? "" : "Thumbnail Designer"} 
                description={isSidebarCollapsed ? "" : "Design eye-catching thumbnails"}
                icon={<Palette className="h-5 w-5" />}
                collapsed={isSidebarCollapsed}
                color="purple"
              />
              <DraggableNode 
                type="tweets" 
                label={isSidebarCollapsed ? "" : "Social Media"} 
                description={isSidebarCollapsed ? "" : "Create viral tweets & posts"}
                icon={<Zap className="h-5 w-5" />}
                collapsed={isSidebarCollapsed}
                color="yellow"
              />
            </div>
            
            {!isSidebarCollapsed && (
              <div className="mt-8 space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-xl blur-xl" />
                  <div className="relative rounded-xl bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Video className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">Quick Start</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Drag a video file directly onto the canvas to begin
                    </p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="secondary"
                      size="sm"
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Video
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {isSidebarCollapsed && (
              <div className="mt-8 space-y-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  size="icon"
                  variant="secondary"
                  className="w-full hover:bg-primary/10"
                  title="Upload Video"
                >
                  <Upload className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className={`${isSidebarCollapsed ? "p-3" : "p-6"} border-t border-border/50 space-y-3 bg-gradient-to-t from-background/80 to-background backdrop-blur-sm`}>
            <Button 
              onClick={handleGenerateAll} 
              disabled={isGeneratingAll}
              className={`w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 ${isSidebarCollapsed ? "" : "h-11"}`}
              size={isSidebarCollapsed ? "icon" : "default"}
              title={isSidebarCollapsed ? "Generate All Content" : undefined}
            >
              <Sparkles className={`${isSidebarCollapsed ? "h-5 w-5" : "mr-2 h-5 w-5"} ${isGeneratingAll ? "animate-pulse" : ""}`} />
              {!isSidebarCollapsed && (isGeneratingAll 
                ? `Generating ${generationProgress.current}/${generationProgress.total}...`
                : "Generate All Content"
              )}
            </Button>
            
            <Button 
              onClick={() => setPreviewModalOpen(true)}
              className={`w-full ${isSidebarCollapsed ? "" : "h-11"}`}
              variant="secondary"
              size={isSidebarCollapsed ? "icon" : "default"}
              title={isSidebarCollapsed ? "Preview Content" : undefined}
            >
              <Eye className={isSidebarCollapsed ? "h-5 w-5" : "mr-2 h-5 w-5"} />
              {!isSidebarCollapsed && "Preview Content"}
            </Button>
            
            {!isSidebarCollapsed && (
              <div className="space-y-4 pt-2">
                <div className="space-y-3 rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Canvas Settings</span>
                  </div>
                  
                  <div className="space-y-3">
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Mini-map</span>
                      <button
                        onClick={() => setShowMiniMap(!showMiniMap)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
                          showMiniMap ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                            showMiniMap ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
                
                <VideoProcessingHelp />
              </div>
            )}
            
            {isSidebarCollapsed && (
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => setShowMiniMap(!showMiniMap)}
                  variant={showMiniMap ? "secondary" : "ghost"}
                  size="icon"
                  title="Toggle Mini-map"
                  className="w-full"
                >
                  <Map className="h-5 w-5" />
                </Button>
                <Button 
                  onClick={() => setEnableEdgeAnimations(!enableEdgeAnimations)}
                  variant={enableEdgeAnimations ? "secondary" : "ghost"}
                  size="icon"
                  title="Toggle Animations"
                  className="w-full"
                >
                  <Settings2 className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </aside>

        {/* Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onNodeDragStart={() => setIsDragging(true)}
            onNodeDragStop={async (_event: any, node: any) => {
              console.log("Node dragged:", node.id, "to position:", node.position);
              setIsDragging(false);
              
              // Update position in database
              if (node.type === 'video' && node.data.videoId) {
                try {
                  await updateVideo({
                    id: node.data.videoId as Id<"videos">,
                    canvasPosition: node.position,
                  });
                } catch (error) {
                  console.error("Failed to update video position:", error);
                }
              } else if (node.type === 'agent' && node.data.agentId) {
                try {
                  await updateAgentPosition({
                    id: node.data.agentId as Id<"agents">,
                    canvasPosition: node.position,
                  });
                } catch (error) {
                  console.error("Failed to update agent position:", error);
                }
              }
            }}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodesDelete={onNodesDelete}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onViewportChange={onViewportChange}
            nodeTypes={nodeTypes}
            deleteKeyCode={["Backspace", "Delete"]}
            selectionOnDrag={false}
            selectNodesOnDrag={false}
            fitView={false}
            minZoom={0.1}
            maxZoom={2}
            preventScrolling={false}
          >
            <Background />
            <Controls />
            {showMiniMap && <MiniMap />}
          </ReactFlow>
        </div>
        
        {/* Content Modal */}
        <ContentModal
          isOpen={!!selectedNodeForModal}
          onClose={() => setSelectedNodeForModal(null)}
          nodeData={selectedNodeForModal ? 
            nodes.find((n: any) => n.id === selectedNodeForModal)?.data as { type: string; draft: string; thumbnailUrl?: string } | undefined || null 
            : null}
          onUpdate={(newContent) => {
            if (selectedNodeForModal) {
              handleContentUpdate(selectedNodeForModal, newContent);
            }
          }}
        />
        
        {/* Thumbnail Upload Modal */}
        <ThumbnailUploadModal
          isOpen={thumbnailModalOpen}
          onClose={() => {
            setThumbnailModalOpen(false);
            setPendingThumbnailNode(null);
          }}
          onUpload={handleThumbnailUpload}
          isGenerating={false}
        />
        
        {/* Video Player Modal */}
        {selectedVideo && (
          <VideoPlayerModal
            isOpen={videoModalOpen}
            onClose={() => {
              setVideoModalOpen(false);
              setSelectedVideo(null);
            }}
            videoUrl={selectedVideo.url}
            title={selectedVideo.title}
            duration={selectedVideo.duration}
            fileSize={selectedVideo.fileSize}
          />
        )}
        
        {/* Floating Chat - Always Visible */}
        <FloatingChat
          agents={nodes
            .filter((n: any) => n.type === 'agent')
            .map((n: any) => ({
              id: n.id,
              type: n.data.type as string,
              draft: n.data.draft as string,
            }))}
          messages={chatMessages}
          onSendMessage={handleChatMessage}
          isGenerating={isChatGenerating}
          initialInputValue={chatInput}
        />
        
        {/* Hidden file input for video upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file && reactFlowInstance) {
              // Get the center of the current viewport
              const bounds = reactFlowWrapper.current?.getBoundingClientRect();
              if (bounds) {
                const centerX = bounds.width / 2;
                const centerY = bounds.height / 2;
                const position = reactFlowInstance.screenToFlowPosition({
                  x: centerX,
                  y: centerY,
                });
                await handleVideoUpload(file, position);
              }
            }
            // Reset the input
            e.target.value = '';
          }}
        />
        
        {/* Preview Modal */}
        <PreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          title={nodes.find((n: any) => n.type === 'agent' && n.data.type === 'title')?.data.draft || ''}
          description={nodes.find((n: any) => n.type === 'agent' && n.data.type === 'description')?.data.draft || ''}
          tweets={nodes.find((n: any) => n.type === 'agent' && n.data.type === 'tweets')?.data.draft || ''}
          thumbnailUrl={nodes.find((n: any) => n.type === 'agent' && n.data.type === 'thumbnail')?.data.thumbnailUrl}
          videoUrl={nodes.find((n: any) => n.type === 'video')?.data.videoUrl}
          duration={nodes.find((n: any) => n.type === 'video')?.data.duration}
          channelName={userProfile?.channelName}
          subscriberCount="1.2K"
        />
        
        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDeleteConfirm}
          title="Delete Content?"
          description={
            nodesToDelete.some((n: any) => n.type === 'video')
              ? "This will permanently delete the video and all associated content. This action cannot be undone."
              : "This will permanently delete the selected content. This action cannot be undone."
          }
        />
        
      </div>
    </ReactFlowProvider>
  );
}

function DraggableNode({ 
  type, 
  label, 
  description,
  icon, 
  collapsed,
  color = "blue"
}: { 
  type: string; 
  label: string; 
  description?: string;
  icon?: React.ReactNode;
  collapsed?: boolean;
  color?: "blue" | "green" | "purple" | "yellow";
}) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
  };

  const colorClasses = {
    blue: "from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 border-blue-500/30 text-blue-500",
    green: "from-green-500/20 to-green-600/20 hover:from-green-500/30 hover:to-green-600/30 border-green-500/30 text-green-500",
    purple: "from-purple-500/20 to-purple-600/20 hover:from-purple-500/30 hover:to-purple-600/30 border-purple-500/30 text-purple-500",
    yellow: "from-yellow-500/20 to-yellow-600/20 hover:from-yellow-500/30 hover:to-yellow-600/30 border-yellow-500/30 text-yellow-500",
  };

  if (collapsed) {
    return (
      <div
        className={`cursor-move rounded-xl bg-gradient-to-br ${colorClasses[color]} border backdrop-blur-sm p-3 transition-all hover:scale-105 hover:shadow-lg flex items-center justify-center group`}
        onDragStart={onDragStart}
        draggable
        title={label}
        style={{ opacity: 1 }}
      >
        <div className="text-foreground">
          {icon}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`cursor-move rounded-xl bg-gradient-to-br ${colorClasses[color]} border backdrop-blur-sm p-4 transition-all hover:scale-[1.02] hover:shadow-lg group`}
      onDragStart={onDragStart}
      draggable
      style={{ opacity: 1 }}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="text-foreground">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-foreground">{label}</h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          <GripVertical className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

function Canvas({ projectId }: { projectId: Id<"projects"> }) {
  return <CanvasContent projectId={projectId} />;
}

export default Canvas;