import { useCallback, useRef, useState, type DragEvent, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Edge,
  type Node,
  type NodeTypes,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { VideoNode } from "./VideoNode";
import { AgentNode } from "./AgentNode";
import { ContentModal } from "./ContentModal";
import { useMutation, useAction, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

const nodeTypes: NodeTypes = {
  video: VideoNode,
  agent: AgentNode,
};

function CanvasContent({ projectId }: { projectId: Id<"projects"> }) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNodeForChat, setSelectedNodeForChat] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  
  // Convex queries
  const canvasState = useQuery(api.canvas.getState, { projectId });
  const projectVideos = useQuery(api.videos.getByProject, { projectId });
  const projectAgents = useQuery(api.agents.getByProject, { projectId });
  
  // Convex mutations
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const createVideo = useMutation(api.videos.create);
  const saveCanvasState = useMutation(api.canvas.saveState);
  
  // Convex actions for AI
  const generateContent = useAction(api.aiHackathon.generateContentSimple);

  const onConnect: OnConnect = useCallback(
    (params) => {
      // Validate connection: only allow video -> agent or agent -> agent
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      
      if (!sourceNode || !targetNode) return;
      
      // Check if this is a valid connection
      const isValidConnection = 
        (sourceNode.type === 'video' && targetNode.type === 'agent') ||
        (sourceNode.type === 'agent' && targetNode.type === 'agent');
      
      if (!isValidConnection) {
        toast.error("Can only connect video to agents or agents to agents");
        return;
      }
      
      // Add the edge
      setEdges((eds) => addEdge({...params, animated: true}, eds));
      
      // Update target agent's connections
      setNodes((nds) =>
        nds.map((node) =>
          node.id === targetNode.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  connections: [...((node.data.connections as string[]) || []), params.source as string],
                },
              }
            : node
        )
      );
    },
    [setEdges, nodes, setNodes]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);
  
  // Handle content update from modal
  const handleContentUpdate = (nodeId: string, newContent: string) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, draft: newContent } }
          : node
      )
    );
    toast.success("Content updated!");
  };

  // Handle content generation for an agent node
  const handleGenerate = async (nodeId: string) => {
    const agentNode = nodes.find(n => n.id === nodeId);
    if (!agentNode) return;
    
    try {
      // Update status to generating
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, status: "generating" } }
            : node
        )
      );
      
      // Find connected video node
      const connectedVideoEdge = edges.find(e => e.target === nodeId && e.source?.includes('video'));
      const videoNode = connectedVideoEdge ? nodes.find(n => n.id === connectedVideoEdge.source) : null;
      
      // Find other connected agent nodes
      const connectedAgentNodes = edges
        .filter(e => e.target === nodeId && e.source?.includes('agent'))
        .map(e => nodes.find(n => n.id === e.source))
        .filter(Boolean);
      
      // Prepare data for AI generation
      const videoData = videoNode ? {
        title: videoNode.data.title as string,
        // In a real app, we'd fetch transcription here
      } : {};
      
      const connectedAgentOutputs = connectedAgentNodes.map(n => ({
        type: n!.data.type as string,
        content: (n!.data.draft || "") as string,
      }));
      
      // For hackathon: Use hardcoded profile data
      const profileData = {
        channelName: "Tech Tutorial Channel",
        contentType: "Educational Technology",
        niche: "Web Development",
        tone: "Professional and engaging",
        targetAudience: "Developers and students",
      };
      
      // Generate content
      const result = await generateContent({
        agentType: agentNode.data.type as "title" | "description" | "thumbnail" | "tweets",
        videoData,
        connectedAgentOutputs,
        profileData,
      });
      
      // Update node with generated content
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  draft: result,
                  status: "ready",
                },
              }
            : node
        )
      );
      
      toast.success(`${agentNode.data.type} generated successfully!`);
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Failed to generate content");
      
      // Reset status
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, status: "idle" } }
            : node
        )
      );
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
      setNodes((nds) => nds.concat(tempNode));

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
      setNodes((nds) => 
        nds.map((node) => 
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
                },
              }
            : node
        )
      );
      
      toast.success("Video uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload video");
    }
  };

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

      const nodeId = `agent_${type}_${Date.now()}`;
      const newNode: Node = {
        id: nodeId,
        type: "agent",
        position,
        data: {
          type,
          draft: "",
          status: "idle",
          connections: [],
          onGenerate: () => handleGenerate(nodeId),
          onChat: () => setSelectedNodeForChat(nodeId),
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, handleVideoUpload, handleGenerate]
  );

  // Load existing canvas state when component mounts
  useEffect(() => {
    if (!hasLoaded && canvasState) {
      setNodes(canvasState.nodes || []);
      setEdges(canvasState.edges || []);
      if (reactFlowInstance && canvasState.viewport) {
        reactFlowInstance.setViewport(canvasState.viewport);
      }
      setHasLoaded(true);
    }
  }, [canvasState, hasLoaded, reactFlowInstance, setNodes, setEdges]);

  // Load existing videos and agents from the project
  useEffect(() => {
    if (!hasLoaded && projectVideos && projectAgents && !canvasState) {
      const videoNodes: Node[] = projectVideos.map((video) => ({
        id: `video_${video._id}`,
        type: "video",
        position: video.canvasPosition,
        data: {
          videoId: video._id,
          title: video.title,
          videoUrl: video.videoUrl,
          storageId: video.fileId,
        },
      }));

      const agentNodes: Node[] = projectAgents.map((agent) => ({
        id: `agent_${agent.type}_${agent._id}`,
        type: "agent",
        position: agent.canvasPosition,
        data: {
          type: agent.type,
          draft: agent.draft,
          status: agent.status,
          connections: agent.connections,
          onGenerate: () => handleGenerate(`agent_${agent.type}_${agent._id}`),
          onChat: () => setSelectedNodeForChat(`agent_${agent.type}_${agent._id}`),
        },
      }));

      setNodes([...videoNodes, ...agentNodes]);
      setHasLoaded(true);
    }
  }, [projectVideos, projectAgents, canvasState, hasLoaded, setNodes, handleGenerate]);

  // Auto-save canvas state periodically
  useEffect(() => {
    if (!reactFlowInstance || !hasLoaded) return;

    const saveState = () => {
      const viewport = reactFlowInstance.getViewport();
      saveCanvasState({
        projectId,
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.type || "agent",
          position: n.position,
          data: n.data,
        })),
        edges: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle || undefined,
          targetHandle: e.targetHandle || undefined,
        })),
        viewport,
      }).catch((error) => {
        console.error("Failed to save canvas state:", error);
      });
    };

    const interval = setInterval(saveState, 5000); // Save every 5 seconds
    return () => clearInterval(interval);
  }, [nodes, edges, reactFlowInstance, projectId, saveCanvasState, hasLoaded]);

  return (
    <div className="flex h-[calc(100vh-var(--header-height))]">
      {/* Sidebar with draggable agent nodes */}
      <aside className="w-64 border-r bg-background p-4">
        <h2 className="mb-4 text-lg font-semibold">Agent Nodes</h2>
        <div className="space-y-2">
          <DraggableNode type="title" label="Title Agent" />
          <DraggableNode type="description" label="Description Agent" />
          <DraggableNode type="thumbnail" label="Thumbnail Agent" />
          <DraggableNode type="tweets" label="Tweets Agent" />
        </div>
        
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
      </aside>

      {/* Canvas */}
      <div className="flex-1" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
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
        isOpen={!!selectedNodeForChat}
        onClose={() => setSelectedNodeForChat(null)}
        nodeData={selectedNodeForChat ? 
          nodes.find(n => n.id === selectedNodeForChat)?.data as { type: string; draft: string } | undefined || null 
          : null}
        onUpdate={(newContent) => {
          if (selectedNodeForChat) {
            handleContentUpdate(selectedNodeForChat, newContent);
          }
        }}
      />
    </div>
  );
}

function DraggableNode({ type, label }: { type: string; label: string }) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className="cursor-move rounded-lg border bg-card p-3 text-center transition-colors hover:bg-accent"
      onDragStart={onDragStart}
      draggable
    >
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function Canvas({ projectId }: { projectId: Id<"projects"> }) {
  return (
    <ReactFlowProvider>
      <CanvasContent projectId={projectId} />
    </ReactFlowProvider>
  );
}

export default Canvas;