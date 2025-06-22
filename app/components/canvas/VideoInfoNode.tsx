import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "./ReactFlowComponents";
import { 
  Info, 
  Film, 
  Clock, 
  HardDrive,
  MonitorPlay,
  Volume2,
  Image,
  ChevronDown,
  ChevronRight,
  Copy,
  CheckCircle2
} from "lucide-react";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { formatDuration, formatFileSize, formatBitRate } from "~/lib/video-metadata";
import { toast } from "sonner";

export interface VideoInfoNodeData {
  videoId: string;
  title?: string;
  duration?: number;
  fileSize?: number;
  resolution?: {
    width: number;
    height: number;
  };
  frameRate?: number;
  bitRate?: number;
  format?: string;
  codec?: string;
  audioInfo?: {
    codec: string;
    sampleRate: number;
    channels: number;
    bitRate: number;
  };
  thumbnails?: string[];
  isLoading?: boolean;
  error?: boolean;
  errorMessage?: string;
}

export const VideoInfoNode = memo(({ data, selected }: NodeProps<VideoInfoNodeData>) => {
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    video: true,
    audio: true,
    thumbnails: false
  });
  const [copied, setCopied] = useState(false);
  
  const infoData = data as VideoInfoNodeData;
  
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const copyMetadata = () => {
    const metadata = `Video Metadata:
Title: ${infoData.title || 'Unknown'}
Duration: ${infoData.duration ? formatDuration(infoData.duration) : 'Unknown'}
File Size: ${infoData.fileSize ? formatFileSize(infoData.fileSize) : 'Unknown'}
Resolution: ${infoData.resolution ? `${infoData.resolution.width}x${infoData.resolution.height}` : 'Unknown'}
Frame Rate: ${infoData.frameRate ? `${infoData.frameRate} fps` : 'Unknown'}
Video Codec: ${infoData.codec || 'Unknown'}
Video Bitrate: ${infoData.bitRate ? formatBitRate(infoData.bitRate) : 'Unknown'}
Audio Codec: ${infoData.audioInfo?.codec || 'Unknown'}
Audio Sample Rate: ${infoData.audioInfo?.sampleRate ? `${infoData.audioInfo.sampleRate} Hz` : 'Unknown'}
Audio Channels: ${infoData.audioInfo?.channels || 'Unknown'}`;
    
    navigator.clipboard.writeText(metadata);
    setCopied(true);
    toast.success("Metadata copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };
  
  if (infoData.isLoading) {
    return (
      <Card className={`w-80 p-4 ${selected ? "ring-2 ring-primary" : ""}`}>
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-5 w-5 text-primary animate-pulse" />
          <h3 className="font-semibold">Extracting Video Info...</h3>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-muted animate-pulse rounded" />
          <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
        </div>
        <Handle
          type="target"
          position={Position.Left}
          id="info-input"
          style={{ background: "#555" }}
        />
      </Card>
    );
  }
  
  if (infoData.error) {
    return (
      <Card className={`w-80 p-4 ${selected ? "ring-2 ring-primary" : ""}`}>
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-5 w-5 text-destructive" />
          <h3 className="font-semibold">Video Info Error</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {infoData.errorMessage || "Failed to extract video metadata"}
        </p>
        <Handle
          type="target"
          position={Position.Left}
          id="info-input"
          style={{ background: "#555" }}
        />
      </Card>
    );
  }
  
  return (
    <Card className={`w-80 ${selected ? "ring-2 ring-primary" : ""}`}>
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Video Info</h3>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={copyMetadata}
          >
            {copied ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Basic Info Section */}
        <div className="space-y-2">
          <button
            onClick={() => toggleSection('basic')}
            className="flex items-center gap-1 text-sm font-medium w-full hover:text-primary transition-colors"
          >
            {expandedSections.basic ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Basic Information
          </button>
          
          {expandedSections.basic && (
            <div className="pl-4 space-y-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Duration: {infoData.duration ? formatDuration(infoData.duration) : 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <HardDrive className="h-3 w-3" />
                <span>Size: {infoData.fileSize ? formatFileSize(infoData.fileSize) : 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Film className="h-3 w-3" />
                <span>Format: {infoData.format || 'Unknown'}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Video Info Section */}
        <div className="space-y-2 mt-3">
          <button
            onClick={() => toggleSection('video')}
            className="flex items-center gap-1 text-sm font-medium w-full hover:text-primary transition-colors"
          >
            {expandedSections.video ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Video Details
          </button>
          
          {expandedSections.video && (
            <div className="pl-4 space-y-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MonitorPlay className="h-3 w-3" />
                <span>
                  Resolution: {infoData.resolution ? `${infoData.resolution.width}x${infoData.resolution.height}` : 'Unknown'}
                </span>
              </div>
              <div className="text-muted-foreground">
                Frame Rate: {infoData.frameRate ? `${infoData.frameRate} fps` : 'Unknown'}
              </div>
              <div className="text-muted-foreground">
                Codec: {infoData.codec || 'Unknown'}
              </div>
              <div className="text-muted-foreground">
                Bitrate: {infoData.bitRate ? formatBitRate(infoData.bitRate) : 'Unknown'}
              </div>
            </div>
          )}
        </div>
        
        {/* Audio Info Section */}
        {infoData.audioInfo && infoData.audioInfo.codec && (
          <div className="space-y-2 mt-3">
            <button
              onClick={() => toggleSection('audio')}
              className="flex items-center gap-1 text-sm font-medium w-full hover:text-primary transition-colors"
            >
              {expandedSections.audio ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Audio Details
            </button>
            
            {expandedSections.audio && (
              <div className="pl-4 space-y-1 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Volume2 className="h-3 w-3" />
                  <span>Codec: {infoData.audioInfo.codec}</span>
                </div>
                {infoData.audioInfo.sampleRate > 0 && (
                  <div className="text-muted-foreground">
                    Sample Rate: {infoData.audioInfo.sampleRate} Hz
                  </div>
                )}
                {infoData.audioInfo.channels > 0 && (
                  <div className="text-muted-foreground">
                    Channels: {infoData.audioInfo.channels === 2 ? 'Stereo' : 'Mono'}
                  </div>
                )}
                {infoData.audioInfo.bitRate > 0 && (
                  <div className="text-muted-foreground">
                    Bitrate: {formatBitRate(infoData.audioInfo.bitRate)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Thumbnails Section */}
        {infoData.thumbnails && infoData.thumbnails.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => toggleSection('thumbnails')}
              className="flex items-center gap-1 text-sm font-medium w-full hover:text-primary transition-colors"
            >
              {expandedSections.thumbnails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <Image className="h-3 w-3" />
              Key Frames ({infoData.thumbnails.length})
            </button>
            
            {expandedSections.thumbnails && (
              <div className="grid grid-cols-3 gap-1 mt-2">
                {infoData.thumbnails.map((thumb, index) => (
                  <img
                    key={index}
                    src={thumb}
                    alt={`Frame ${index + 1}`}
                    className="w-full h-auto rounded border border-muted"
                  />
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Quality Badges */}
        {infoData.resolution && (
          <div className="flex gap-1 mt-3">
            {infoData.resolution.height >= 2160 && <Badge variant="default">4K</Badge>}
            {infoData.resolution.height >= 1080 && infoData.resolution.height < 2160 && <Badge variant="default">HD</Badge>}
            {infoData.frameRate && infoData.frameRate >= 60 && <Badge variant="secondary">60fps</Badge>}
            {infoData.audioInfo?.channels === 2 && <Badge variant="outline">Stereo</Badge>}
          </div>
        )}
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        id="info-input"
        style={{ background: "#555" }}
      />
    </Card>
  );
});

VideoInfoNode.displayName = "VideoInfoNode";