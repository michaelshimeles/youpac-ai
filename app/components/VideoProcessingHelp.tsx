import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { AlertCircle, HelpCircle, Video, FileAudio, Image, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

export function VideoProcessingHelp() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          Help
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Video Processing Guide</DialogTitle>
          <DialogDescription>
            Learn about video processing, common issues, and solutions
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* File Size Limits */}
          <Card className="p-4">
            <div className="flex gap-3">
              <Video className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold">Video Size Limits</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Under 25MB:</strong> Direct transcription (fastest)</li>
                  <li>• <strong>25MB - 100MB:</strong> Audio extraction required (slower)</li>
                  <li>• <strong>Over 100MB:</strong> Not supported</li>
                </ul>
                <p className="text-sm">
                  For best results, compress videos to under 25MB or trim to ~10 minutes.
                </p>
              </div>
            </div>
          </Card>

          {/* Supported Formats */}
          <Card className="p-4">
            <div className="flex gap-3">
              <FileAudio className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold">Supported Formats</h3>
                <p className="text-sm text-muted-foreground">
                  MP4, MOV, AVI, WebM • H.264/H.265 codecs • AAC/MP3 audio
                </p>
                <p className="text-sm">
                  If your video won't upload, try converting it to MP4 format.
                </p>
              </div>
            </div>
          </Card>

          {/* Common Errors */}
          <Card className="p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold">Common Issues & Solutions</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium">Transcription Failed</p>
                    <p className="text-muted-foreground">
                      • Check if video has audio track<br/>
                      • Ensure audio isn't muted or empty<br/>
                      • Try a shorter video clip
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Upload Failed</p>
                    <p className="text-muted-foreground">
                      • Check your internet connection<br/>
                      • Verify file isn't corrupted<br/>
                      • Try a smaller file size
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Thumbnail Generation Failed</p>
                    <p className="text-muted-foreground">
                      • Upload a custom thumbnail instead<br/>
                      • Ensure video content is appropriate<br/>
                      • Try with different video frames
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Tips */}
          <Card className="p-4 bg-primary/5">
            <div className="flex gap-3">
              <Image className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold">Pro Tips</h3>
                <ul className="text-sm space-y-1">
                  <li>✓ Upload videos during off-peak hours for faster processing</li>
                  <li>✓ Use clear audio for better transcription accuracy</li>
                  <li>✓ Keep videos under 10 minutes for optimal performance</li>
                  <li>✓ Upload custom thumbnails for guaranteed results</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}