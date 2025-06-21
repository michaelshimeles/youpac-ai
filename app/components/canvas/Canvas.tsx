import { useCallback, useRef, useState, type DragEvent, useEffect } from "react";
import type {
  Edge,
  Node,
  NodeTypes,
  OnConnect,
} from "@xyflow/react";
import { VideoNode } from "./VideoNode";
import { AgentNode } from "./AgentNode";
import { ContentModal } from "./ContentModal";
import { useMutation, useAction, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { Button } from "~/components/ui/button";
import { Sparkles, ChevronLeft, ChevronRight, FileText, Image, Twitter, Upload, GripVertical } from "lucide-react";
import { extractAudioFromVideo } from "~/lib/ffmpeg-audio";
import { extractFramesFromVideo } from "~/lib/video-frames";
import { FloatingChat } from "./FloatingChat";
import { ReactFlowWrapper } from "./ReactFlowWrapper";

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
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNodeForModal, setSelectedNodeForModal] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState<string>("");
  const [hasLoadedFromDB, setHasLoadedFromDB] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [transcriptionVersion, setTranscriptionVersion] = useState(0);
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
  const canvasState = null; // Temporarily disabled to ensure DB loading works
  const projectVideos = useQuery(api.videos.getByProject, { projectId });
  const projectAgents = useQuery(api.agents.getByProject, { projectId });
  const userProfile = useQuery(api.profiles.get);
  
  // Convex mutations
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const createVideo = useMutation(api.videos.create);
  const createAgent = useMutation(api.agents.create);
  const updateAgentDraft = useMutation(api.agents.updateDraft);
  const updateAgentConnections = useMutation(api.agents.updateConnections);
  const saveCanvasState = useMutation(api.canvas.saveState);
  const deleteVideo = useMutation(api.videos.remove);
  const deleteAgent = useMutation(api.agents.remove);
  
  // Convex actions for AI
  const generateContent = useAction(api.aiHackathon.generateContentSimple);
  const generateThumbnail = useAction(api.thumbnail.generateThumbnail);
  const transcribeVideo = useAction(api.transcription.transcribeVideo);
  const refineContent = useAction(api.chat.refineContent);

  // Handle content generation for an agent node
  const handleGenerate = useCallback(async (nodeId: string) => {
    const agentNode = nodesRef.current.find((n: any) => n.id === nodeId);
    if (!agentNode) {
      console.error("Agent node not found:", nodeId);
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
      let videoData: { title?: string; transcription?: string } = {};
      if (videoNode && videoNode.data.videoId) {
        // Fetch the video with transcription from database
        const video = projectVideos?.find((v: any) => v._id === videoNode.data.videoId);
        videoData = {
          title: videoNode.data.title as string,
          transcription: video?.transcription,
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
      
      if (agentNode.data.type === "thumbnail" && videoNode?.data.videoUrl) {
        // For thumbnail agent, extract frames and use vision API
        toast.info("Extracting video frames for thumbnail generation...");
        
        // Get the video file from URL
        const videoResponse = await fetch(videoNode.data.videoUrl as string);
        const videoBlob = await videoResponse.blob();
        const videoFile = new File([videoBlob], "video.mp4", { type: videoBlob.type });
        
        // Extract frames from video
        const frames = await extractFramesFromVideo(videoFile, { 
          count: 3,
          onProgress: (progress: number) => {
            // Could update UI with progress here
          }
        });
        
        // Generate thumbnail with vision API
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
        });
        
        result = thumbnailResult.concept;
        thumbnailUrl = thumbnailResult.imageUrl;
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
      
      toast.success(`${agentNode.data.type} generated successfully!`);
    } catch (error: any) {
      console.error("Generation error:", error);
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
  }, [generateContent, userProfile, setNodes, updateAgentDraft, projectVideos, transcriptionVersion]);

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
      
      // Call refine content action
      const result = await refineContent({
        agentId: agentNode.data.agentId as Id<"agents">,
        userMessage: message.replace(mentionRegex, "").trim(), // Remove @mention from message
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
                },
              }
            : node
        )
      );
      
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
          animated: true,
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
    
    // Generate content for each agent
    for (let i = 0; i < agentNodes.length; i++) {
      const agentNode = agentNodes[i];
      setGenerationProgress({ current: i + 1, total: agentNodes.length });
      
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
  const handleVideoUpload = async (file: File, position: { x: number; y: number }) => {
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

      // Step 1: Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();
      
      // Step 2: Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!result.ok) throw new Error("Upload failed");
      
      const { storageId } = await result.json();
      
      // Step 3: Create video record in database with storage URL
      const video = await createVideo({
        projectId,
        title: file.name.replace(/\.[^/.]+$/, ""),
        storageId: storageId,
        canvasPosition: position,
      });
      
      if (!video) throw new Error("Failed to create video");
      
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
                },
              }
            : node
        )
      );
      
      toast.success("Video uploaded successfully!");
      
      // Step 5: Transcribe video or extract audio first if too large
      const fileSizeMB = file.size / (1024 * 1024);
      const MAX_DIRECT_TRANSCRIBE_SIZE = 25; // 25MB limit for Whisper API
      
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
          const audioFile = await extractAudioFromVideo(file, {
            onProgress: (progress) => {
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
            },
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
          
          // Transcribe the extracted audio
          await transcribeVideo({
            videoId: video._id,
            storageId: audioStorageId,
            fileType: "audio",
          });
        } else {
          // Direct transcription for smaller files
          await transcribeVideo({
            videoId: video._id,
            storageId: storageId,
            fileType: "video",
          });
        }
        
        toast.success("Video transcribed successfully!");
        
        // Update node with transcription complete
        setNodes((nds: any) =>
          nds.map((node: any) =>
            node.id === `video_${video._id}`
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    isTranscribing: false,
                    hasTranscription: true,
                  },
                }
              : node
          )
        );
        
        // Force a re-render to pick up the new transcription data
        setTranscriptionVersion(v => v + 1);
      } catch (transcriptionError: any) {
        console.error("Transcription error:", transcriptionError);
        toast.error(transcriptionError.message || "Failed to transcribe video");
        
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
                  },
                }
              : node
          )
        );
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload video");
      
      // Remove the temporary node on error
      setNodes((nds: any) => nds.filter((node: any) => !node.id.startsWith('video_temp_')));
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
          
          const position = reactFlowInstance.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });

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

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

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
          },
        };

        setNodes((nds: any) => nds.concat(newNode));
        
        // Automatically create edge from video to agent
        const edgeId = `e${videoNode.id}-${nodeId}`;
        const newEdge: Edge = {
          id: edgeId,
          source: videoNode.id,
          target: nodeId,
          animated: true,
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
    [reactFlowInstance, setNodes, setEdges, handleVideoUpload, handleGenerate, nodes, createAgent, projectId, updateAgentConnections, handleChatButtonClick]
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
          hasTranscription: !!video.transcription,
          isTranscribing: false,
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
              animated: true,
            });
          }
        });
      });
      
      setEdges(edges);
      setHasLoadedFromDB(true);
    }
  }, [projectVideos, projectAgents, hasLoadedFromDB, setNodes, setEdges, handleGenerate, handleChatButtonClick]);

  // Auto-save canvas state
  useEffect(() => {
    if (!projectId || !hasLoadedFromDB) return;
    
    const saveTimeout = setTimeout(() => {
      const viewport = reactFlowInstance?.getViewport() || { x: 0, y: 0, zoom: 1 };
      
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
        viewport,
      }).catch((error) => {
        console.error("Failed to save canvas state:", error);
      });
    }, 5000); // Save after 5 seconds of inactivity
    
    return () => clearTimeout(saveTimeout);
  }, [nodes, edges, reactFlowInstance, projectId, saveCanvasState, hasLoadedFromDB]);

  return (
    <ReactFlowProvider>
      <div className="flex h-[calc(100vh-var(--header-height))]">
        {/* Sidebar with draggable agent nodes */}
        <aside className={`${isSidebarCollapsed ? "w-16" : "w-64"} border-r bg-background transition-all duration-300 flex flex-col`}>
          <div className={`flex-1 ${isSidebarCollapsed ? "p-2" : "p-4"}`}>
            {!isSidebarCollapsed && (
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Agent Nodes</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            )}
            {isSidebarCollapsed && (
              <div className="text-center mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <div className="space-y-2">
              <DraggableNode 
                type="title" 
                label={isSidebarCollapsed ? "" : "Title Agent"} 
                icon={<FileText className="h-4 w-4" />}
                collapsed={isSidebarCollapsed}
              />
              <DraggableNode 
                type="description" 
                label={isSidebarCollapsed ? "" : "Description Agent"} 
                icon={<FileText className="h-4 w-4" />}
                collapsed={isSidebarCollapsed}
              />
              <DraggableNode 
                type="thumbnail" 
                label={isSidebarCollapsed ? "" : "Thumbnail Agent"} 
                icon={<Image className="h-4 w-4" />}
                collapsed={isSidebarCollapsed}
              />
              <DraggableNode 
                type="tweets" 
                label={isSidebarCollapsed ? "" : "Tweets Agent"} 
                icon={<Twitter className="h-4 w-4" />}
                collapsed={isSidebarCollapsed}
              />
            </div>
            
            {!isSidebarCollapsed && (
              <div className="mt-8">
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                  Drag & Drop Video
                </h3>
                <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Drop video file onto canvas
                  </p>
                </div>
              </div>
            )}
            
            {isSidebarCollapsed ? (
              <div className="mt-8">
                <Button
                  onClick={() => setIsSidebarCollapsed(false)}
                  size="icon"
                  variant="ghost"
                  className="w-full"
                  title="Upload Video"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>

          <div className={`${isSidebarCollapsed ? "p-2" : "p-4"}`}>
            <Button 
              onClick={handleGenerateAll} 
              disabled={isGeneratingAll}
              className="w-full"
              variant="default"
              size={isSidebarCollapsed ? "icon" : "default"}
              title={isSidebarCollapsed ? "Generate All Content" : undefined}
            >
              <Sparkles className={isSidebarCollapsed ? "h-4 w-4" : "mr-2 h-4 w-4"} />
              {!isSidebarCollapsed && (isGeneratingAll 
                ? `Generating ${generationProgress.current}/${generationProgress.total}...`
                : "Generate All Content"
              )}
            </Button>
            {!isSidebarCollapsed && (
              <p className="mt-2 text-xs text-muted-foreground text-center">
                Connect all agents to video & generate content
              </p>
            )}
          </div>
        </aside>

        {/* Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={(changes: any) => {
              // Handle node deletions
              changes.forEach((change: any) => {
                if (change.type === 'remove') {
                  const nodeToDelete = nodes.find((n: any) => n.id === change.id);
                  if (nodeToDelete) {
                    // Delete from database
                    if (nodeToDelete.type === 'video' && nodeToDelete.data.videoId) {
                      deleteVideo({ id: nodeToDelete.data.videoId as Id<"videos"> })
                        .then(() => toast.success("Video deleted"))
                        .catch((error) => {
                          console.error("Failed to delete video:", error);
                          toast.error("Failed to delete video");
                        });
                    } else if (nodeToDelete.type === 'agent' && nodeToDelete.data.agentId) {
                      deleteAgent({ id: nodeToDelete.data.agentId as Id<"agents"> })
                        .then(() => toast.success(`${nodeToDelete.data.type} agent deleted`))
                        .catch((error) => {
                          console.error("Failed to delete agent:", error);
                          toast.error("Failed to delete agent");
                        });
                    }
                  }
                }
              });
              
              // Apply changes to state
              onNodesChange(changes);
            }}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
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
          currentInputValue={chatInput}
          onInputChange={setChatInput}
        />
      </div>
    </ReactFlowProvider>
  );
}

function DraggableNode({ 
  type, 
  label, 
  icon, 
  collapsed 
}: { 
  type: string; 
  label: string; 
  icon?: React.ReactNode;
  collapsed?: boolean;
}) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
  };

  if (collapsed) {
    return (
      <div
        className="cursor-move rounded-lg border bg-card p-2 transition-colors hover:bg-accent hover:text-white flex items-center justify-center group"
        onDragStart={onDragStart}
        draggable
        title={`${type.charAt(0).toUpperCase() + type.slice(1)} Agent`}
        style={{ opacity: 1 }}
      >
        {icon}
      </div>
    );
  }

  return (
    <div
      className="cursor-move rounded-lg border bg-card p-3 transition-colors hover:bg-accent hover:text-white group"
      onDragStart={onDragStart}
      draggable
      style={{ opacity: 1 }}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-white" />
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  );
}

function Canvas({ projectId }: { projectId: Id<"projects"> }) {
  return <CanvasContent projectId={projectId} />;
}

export default Canvas;