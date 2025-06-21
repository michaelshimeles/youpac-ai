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
import { Button } from "~/components/ui/button";
import { Sparkles } from "lucide-react";

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
  const [hasLoadedFromDB, setHasLoadedFromDB] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [transcriptionVersion, setTranscriptionVersion] = useState(0);
  
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
  const transcribeVideo = useAction(api.transcription.transcribeVideo);

  // Handle content generation for an agent node
  const handleGenerate = useCallback(async (nodeId: string) => {
    console.log("handleGenerate called for:", nodeId);
    console.log("Current nodes:", nodesRef.current.map(n => n.id));
    const agentNode = nodesRef.current.find(n => n.id === nodeId);
    if (!agentNode) {
      console.error("Agent node not found:", nodeId);
      console.error("Available nodes:", nodesRef.current.map(n => ({ id: n.id, type: n.type })));
      return;
    }
    
    try {
      // Update status to generating in UI
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, status: "generating" } }
            : node
        )
      );
      
      // Also update status in database if we have an agentId
      if (agentNode.data.agentId) {
        await updateAgentDraft({
          id: agentNode.data.agentId,
          draft: agentNode.data.draft || "",
          status: "generating",
        });
      }
      
      // Find connected video node
      const connectedVideoEdge = edgesRef.current.find(e => e.target === nodeId && e.source?.includes('video'));
      const videoNode = connectedVideoEdge ? nodesRef.current.find(n => n.id === connectedVideoEdge.source) : null;
      
      // Find other connected agent nodes
      const connectedAgentNodes = edgesRef.current
        .filter(e => e.target === nodeId && e.source?.includes('agent'))
        .map(e => nodesRef.current.find(n => n.id === e.source))
        .filter(Boolean);
      
      // Prepare data for AI generation
      let videoData: { title?: string; transcription?: string } = {};
      if (videoNode && videoNode.data.videoId) {
        // Fetch the video with transcription from database
        const video = projectVideos?.find(v => v._id === videoNode.data.videoId);
        videoData = {
          title: videoNode.data.title as string,
          transcription: video?.transcription,
        };
        
        // If no transcription, warn the user
        if (!video?.transcription) {
          toast.warning("Generating without transcription - results may be less accurate");
        }
      }
      
      const connectedAgentOutputs = connectedAgentNodes.map(n => ({
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
      
      // Generate content - pass videoId for fresh data lookup
      const result = await generateContent({
        agentType: agentNode.data.type as "title" | "description" | "thumbnail" | "tweets",
        videoId: videoNode?.data.videoId as any, // Pass the video ID
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
      
      // Save to database if the node has an agentId
      if (agentNode.data.agentId) {
        await updateAgentDraft({
          id: agentNode.data.agentId,
          draft: result,
          status: "ready",
        });
      }
      
      toast.success(`${agentNode.data.type} generated successfully!`);
    } catch (error: any) {
      console.error("Generation error:", error);
      toast.error(`Failed to generate ${agentNode.data.type}: ${error.message || 'Unknown error'}`);
      
      // Update status to error
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, status: "error" } }
            : node
        )
      );
      
      // Update error status in database
      if (agentNode.data.agentId) {
        await updateAgentDraft({
          id: agentNode.data.agentId,
          draft: agentNode.data.draft || "",
          status: "error",
        });
      }
    }
  }, [generateContent, userProfile, setNodes, updateAgentDraft, projectVideos, transcriptionVersion]);

  // Generate content for all agent nodes (connect if needed)
  const handleGenerateAll = useCallback(async () => {
    // Find video node
    const videoNode = nodes.find(node => node.type === 'video');
    if (!videoNode) {
      toast.error("Please add a video first!");
      return;
    }

    // Find all agent nodes
    const agentNodes = nodes.filter(node => node.type === 'agent');
    if (agentNodes.length === 0) {
      toast.info("No agent nodes found. Drag some agents onto the canvas!");
      return;
    }

    // Connect all unconnected agents to the video
    const newEdges: Edge[] = [];
    agentNodes.forEach(agentNode => {
      const isConnected = edges.some(edge => 
        edge.source === videoNode.id && edge.target === agentNode.id
      );
      
      if (!isConnected) {
        const edgeId = `e${videoNode.id}-${agentNode.id}`;
        newEdges.push({
          id: edgeId,
          source: videoNode.id,
          target: agentNode.id,
          animated: true,
        });
      }
    });

    // Add new edges if any
    if (newEdges.length > 0) {
      setEdges((eds) => [...eds, ...newEdges]);
      
      // Update agent connections
      setNodes((nds) =>
        nds.map((node) => {
          const newConnection = newEdges.find(edge => edge.target === node.id);
          if (newConnection) {
            return {
              ...node,
              data: {
                ...node.data,
                connections: [...((node.data.connections as string[]) || []), videoNode.id],
              },
            };
          }
          return node;
        })
      );
      
      // Update connections in database for each newly connected agent
      for (const edge of newEdges) {
        const agentNode = agentNodes.find(n => n.id === edge.target);
        if (agentNode?.data.agentId) {
          // Store the video ID, not the node ID
          const newConnections = [...((agentNode.data.connections as string[]) || []), videoNode.data.videoId];
          updateAgentConnections({
            id: agentNode.data.agentId,
            connections: newConnections,
          }).catch((error) => {
            console.error("Failed to update agent connections:", error);
          });
        }
      }
    }

    // Now find all agent nodes that need content generation
    const agentNodesToGenerate = agentNodes.filter(node => !node.data.draft);

    setIsGeneratingAll(true);
    setGenerationProgress({ current: 0, total: agentNodesToGenerate.length });

    // Sort nodes by type priority: title → description → thumbnail → tweets
    const typePriority = { title: 1, description: 2, thumbnail: 3, tweets: 4 };
    const sortedNodes = agentNodesToGenerate.sort((a, b) => 
      (typePriority[a.data.type as keyof typeof typePriority] || 5) - 
      (typePriority[b.data.type as keyof typeof typePriority] || 5)
    );

    for (let i = 0; i < sortedNodes.length; i++) {
      const node = sortedNodes[i];
      setGenerationProgress({ current: i + 1, total: sortedNodes.length });
      
      try {
        await handleGenerate(node.id);
        // Small delay between generations to avoid rate limiting
        if (i < sortedNodes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Failed to generate ${node.data.type}:`, error);
        // Continue with next node even if one fails
      }
    }

    setIsGeneratingAll(false);
    setGenerationProgress({ current: 0, total: 0 });
    toast.success("All content generated successfully!");
  }, [nodes, edges, handleGenerate, setEdges, setNodes, updateAgentConnections]);

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
      
      // Update connections in database if it's an agent
      if (targetNode.type === 'agent' && targetNode.data.agentId) {
        // Store the actual video/agent ID, not the node ID
        let connectionId = params.source as string;
        if (sourceNode.type === 'video' && sourceNode.data.videoId) {
          connectionId = sourceNode.data.videoId;
        } else if (sourceNode.type === 'agent' && sourceNode.data.agentId) {
          connectionId = sourceNode.data.agentId;
        }
        
        const newConnections = [...((targetNode.data.connections as string[]) || []), connectionId];
        updateAgentConnections({
          id: targetNode.data.agentId,
          connections: newConnections,
        }).catch((error) => {
          console.error("Failed to update agent connections:", error);
        });
      }
      
      // Inform user about generation readiness
      if (targetNode.type === 'agent' && !targetNode.data.draft) {
        if (sourceNode.type === 'video') {
          if (sourceNode.data.isTranscribing) {
            toast.info("Video is still being transcribed. Generate once complete.");
          } else if (sourceNode.data.hasTranscription) {
            toast.success("Connected! Click Generate to create content.");
          } else {
            toast.warning("Connected! No transcription available - content will be less accurate.");
          }
        } else {
          // Connected agent to agent
          toast.success("Connected! Click Generate to create content using connected agent's output.");
        }
      }
    },
    [setEdges, nodes, setNodes, handleGenerate, updateAgentConnections]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);
  
  // Handle content update from modal
  const handleContentUpdate = async (nodeId: string, newContent: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, draft: newContent } }
          : node
      )
    );
    
    // Save to database if it's an agent with an ID
    if (node.type === 'agent' && node.data.agentId) {
      try {
        await updateAgentDraft({
          id: node.data.agentId,
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
                  isTranscribing: true,
                },
              }
            : node
        )
      );
      
      toast.success("Video uploaded successfully!");
      
      // Step 5: Start transcription
      toast.info("Starting transcription...");
      transcribeVideo({
        videoId: video._id,
        storageId: storageId,
      }).then(() => {
        toast.success("Video transcribed successfully!");
        // Update node to show transcription is complete
        setNodes((nds) => 
          nds.map((node) => 
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
      }).catch((error) => {
        console.error("Transcription error:", error);
        // Show specific error message if available
        const errorMessage = error.message || "Failed to transcribe video";
        if (errorMessage.includes("too large")) {
          toast.error("Video is too large for transcription (max 25MB). You can still generate content without transcription.");
        } else if (errorMessage.includes("OPENAI_API_KEY")) {
          toast.error("OpenAI API key not configured. Content will be generated without transcription.");
        } else {
          toast.error(`Transcription failed: ${errorMessage}`);
        }
        // Update node to show transcription failed
        setNodes((nds) => 
          nds.map((node) => 
            node.id === `video_${video._id}`
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    isTranscribing: false,
                    hasTranscription: false,
                  },
                }
              : node
          )
        );
      });
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

      // Find the first video node to associate with this agent
      const videoNode = nodes.find(n => n.type === 'video' && n.data.videoId);
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
            onGenerate: () => {
              console.log("onGenerate callback triggered for:", nodeId);
              handleGenerate(nodeId);
            },
            onChat: () => setSelectedNodeForChat(nodeId),
          },
        };

        setNodes((nds) => nds.concat(newNode));
        
        // Automatically create edge from video to agent
        const edgeId = `e${videoNode.id}-${nodeId}`;
        const newEdge: Edge = {
          id: edgeId,
          source: videoNode.id,
          target: nodeId,
          animated: true,
        };
        setEdges((eds) => [...eds, newEdge]);
        
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
    [reactFlowInstance, setNodes, setEdges, handleVideoUpload, handleGenerate, nodes, createAgent, projectId, updateAgentConnections]
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
          status: agent.status,
          connections: agent.connections,
          onGenerate: () => {
            console.log("onGenerate callback triggered for loaded agent:", `agent_${agent.type}_${agent._id}`);
            handleGenerate(`agent_${agent.type}_${agent._id}`);
          },
          onChat: () => setSelectedNodeForChat(`agent_${agent.type}_${agent._id}`),
        },
      }));

      setNodes([...videoNodes, ...agentNodes]);
      
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
      
      // Load viewport if available from canvas state
      if (canvasState && reactFlowInstance && canvasState.viewport) {
        reactFlowInstance.setViewport(canvasState.viewport);
      }
      
      setHasLoadedFromDB(true);
    }
  }, [projectVideos, projectAgents, hasLoadedFromDB, setNodes, setEdges, canvasState, reactFlowInstance, handleGenerate, setSelectedNodeForChat]);

  // Auto-save canvas state periodically
  useEffect(() => {
    if (!reactFlowInstance || !hasLoadedFromDB) return;

    const saveState = () => {
      const viewport = reactFlowInstance.getViewport();
      // Temporarily disabled to debug persistence
      // saveCanvasState({
      //   projectId,
      //   nodes: nodes.map(n => ({
      //     id: n.id,
      //     type: n.type || "agent",
      //     position: n.position,
      //     data: n.data,
      //   })),
      //   edges: edges.map(e => ({
      //     id: e.id,
      //     source: e.source,
      //     target: e.target,
      //     sourceHandle: e.sourceHandle || undefined,
      //     targetHandle: e.targetHandle || undefined,
      //   })),
      //   viewport,
      // }).catch((error) => {
      //   console.error("Failed to save canvas state:", error);
      // });
    };

    const interval = setInterval(saveState, 5000); // Save every 5 seconds
    return () => clearInterval(interval);
  }, [nodes, edges, reactFlowInstance, projectId, saveCanvasState, hasLoadedFromDB]);

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

        <div className="mt-8">
          <Button 
            onClick={handleGenerateAll} 
            disabled={isGeneratingAll}
            className="w-full"
            variant="default"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {isGeneratingAll 
              ? `Generating ${generationProgress.current}/${generationProgress.total}...`
              : "Generate All Content"
            }
          </Button>
          <p className="mt-2 text-xs text-muted-foreground text-center">
            Connect all agents to video & generate content
          </p>
        </div>
      </aside>

      {/* Canvas */}
      <div className="flex-1" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes) => {
            // Handle node deletions
            changes.forEach((change) => {
              if (change.type === 'remove') {
                const nodeToDelete = nodes.find(n => n.id === change.id);
                if (nodeToDelete) {
                  // Delete from database
                  if (nodeToDelete.type === 'video' && nodeToDelete.data.videoId) {
                    deleteVideo({ id: nodeToDelete.data.videoId })
                      .then(() => toast.success("Video deleted"))
                      .catch((error) => {
                        console.error("Failed to delete video:", error);
                        toast.error("Failed to delete video");
                      });
                  } else if (nodeToDelete.type === 'agent' && nodeToDelete.data.agentId) {
                    deleteAgent({ id: nodeToDelete.data.agentId })
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