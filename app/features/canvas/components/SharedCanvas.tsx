import { useCallback, useState, useEffect } from "react";
import { ReactFlowWrapper } from "./ReactFlowWrapper";
import { VideoNode } from "./VideoNode";
import { AgentNode } from "./AgentNode";
import type { NodeTypes } from "./ReactFlowComponents";
import { Button } from "~/shared/components/button";
import { ArrowLeft, Eye } from "lucide-react";
import { Link } from "react-router";
import { PreviewModal } from "~/features/sharing/components/PreviewModal";

const nodeTypes: NodeTypes = {
  video: VideoNode,
  agent: AgentNode,
};

interface SharedCanvasProps {
  data: {
    share: {
      shareId: string;
      canvasState: {
        nodes: any[];
        edges: any[];
        viewport?: {
          x: number;
          y: number;
          zoom: number;
        };
      };
      viewCount: number;
    };
    project: {
      name: string;
      thumbnail?: string;
    };
    video: {
      _id: string;
      title: string;
      url: string;
      duration: number;
      fileSize: number;
      transcription?: string;
    };
    agents: Array<{
      _id: string;
      type: string;
      draft: string;
      thumbnailUrl?: string;
      status: string;
    }>;
  };
}

export function SharedCanvas({ data }: SharedCanvasProps) {
  const { share, project, video, agents } = data;
  const [previewOpen, setPreviewOpen] = useState(true); // Open by default

  // Prepare content for preview
  const previewContent = {
    title: agents.find(a => a.type === 'title')?.draft || '',
    description: agents.find(a => a.type === 'description')?.draft || '',
    thumbnailUrl: agents.find(a => a.type === 'thumbnail')?.thumbnailUrl || '',
    tweets: agents.find(a => a.type === 'tweets')?.draft || '',
    videoUrl: video.url,
    videoTitle: video.title,
    channelName: project.name,
  };

  // Create node data with read-only handlers
  const preparedNodes = share.canvasState.nodes.map(node => {
    if (node.type === 'video') {
      return {
        ...node,
        data: {
          ...node.data,
          title: video.title,
          videoUrl: video.url,
          duration: video.duration,
          fileSize: video.fileSize,
          hasTranscription: !!video.transcription,
          onView: () => {}, // No-op for read-only view
        }
      };
    } else if (node.type === 'agent') {
      const agent = agents.find(a => node.data.agentId === a._id);
      return {
        ...node,
        data: {
          ...node.data,
          draft: agent?.draft || node.data.draft,
          thumbnailUrl: agent?.thumbnailUrl || node.data.thumbnailUrl,
          status: agent?.status || node.data.status,
          onGenerate: () => {}, // No-op
          onRegenerate: () => {}, // No-op
          onChat: () => {}, // No-op
          onView: () => {}, // No-op
        }
      };
    }
    return node;
  });

  return (
    <ReactFlowWrapper>
      {({ ReactFlow, ReactFlowProvider, Background, Controls, MiniMap }) => (
        <ReactFlowProvider>
          <div className="h-full w-full relative">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-b">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <Link to="/">
                    <Button variant="ghost" size="sm">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to App
                    </Button>
                  </Link>
                  <div>
                    <h1 className="text-lg font-semibold">{project.name}</h1>
                    <p className="text-sm text-muted-foreground">Read-only view</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Preview
                  </Button>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>{share.viewCount} views</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Canvas */}
            <div className="h-full pt-16">
              <ReactFlow
                nodes={preparedNodes}
                edges={share.canvasState.edges}
                nodeTypes={nodeTypes}
                defaultViewport={share.canvasState.viewport}
                fitView
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                zoomOnScroll={true}
                zoomOnPinch={true}
                panOnScroll={true}
                panOnDrag={true}
              >
                <Background 
                  variant="dots" 
                  gap={20} 
                  size={1} 
                  color="#888"
                  className="opacity-[0.03]"
                />
                <Controls 
                  showInteractive={false}
                  className="!bottom-4 !left-4"
                />
                <MiniMap 
                  className="!bottom-4 !right-4 !shadow-xl !border !border-border/50 !bg-background/95 !backdrop-blur-sm"
                  nodeColor={(node: any) => {
                    if (node.type === 'video') return '#3b82f6';
                    if (node.type === 'agent') {
                      const agentType = node.data?.type;
                      if (agentType === 'title') return '#3b82f6';
                      if (agentType === 'description') return '#10b981';
                      if (agentType === 'thumbnail') return '#a855f7';
                      if (agentType === 'tweets') return '#eab308';
                    }
                    return '#888';
                  }}
                />
              </ReactFlow>
            </div>
          </div>
          
          {/* Preview Modal - Open by default for shared views */}
          <PreviewModal
            isOpen={previewOpen}
            onClose={() => setPreviewOpen(false)}
            title={previewContent.title}
            description={previewContent.description}
            thumbnailUrl={previewContent.thumbnailUrl}
            tweets={previewContent.tweets}
            videoUrl={previewContent.videoUrl}
            duration={video.duration}
            channelName={previewContent.channelName}
          />
        </ReactFlowProvider>
      )}
    </ReactFlowWrapper>
  );
}