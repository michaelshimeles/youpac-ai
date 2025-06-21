import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { cn } from "~/lib/utils";

interface ThumbnailUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (images: File[]) => void;
  isGenerating?: boolean;
}

export function ThumbnailUploadModal({ isOpen, onClose, onUpload, isGenerating }: ThumbnailUploadModalProps) {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Filter only image files
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    // Limit to 3 images
    const newImages = [...selectedImages, ...imageFiles].slice(0, 3);
    setSelectedImages(newImages);

    // Create preview URLs
    const newPreviewUrls = newImages.map(file => URL.createObjectURL(file));
    // Clean up old URLs
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls(newPreviewUrls);
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    
    // Clean up URL
    URL.revokeObjectURL(previewUrls[index]);
    const newPreviewUrls = previewUrls.filter((_, i) => i !== index);
    setPreviewUrls(newPreviewUrls);
  };

  const handleSubmit = () => {
    if (selectedImages.length === 0) return;
    onUpload(selectedImages);
  };

  const handleClose = () => {
    // Clean up URLs
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setSelectedImages([]);
    setPreviewUrls([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Images for Thumbnail</DialogTitle>
          <DialogDescription>
            Upload 1-3 images that will be used to generate your YouTube thumbnail. 
            These images will be analyzed along with your video title to create the perfect thumbnail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Area */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              "hover:border-primary hover:bg-muted/50",
              selectedImages.length >= 3 && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => selectedImages.length < 3 && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={selectedImages.length >= 3}
            />
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              {selectedImages.length === 0 
                ? "Click to upload images" 
                : selectedImages.length >= 3 
                ? "Maximum 3 images allowed" 
                : `Add more images (${3 - selectedImages.length} remaining)`}
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WEBP up to 10MB each
            </p>
          </div>

          {/* Preview Grid */}
          {selectedImages.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    Image {index + 1}
                  </div>
                </div>
              ))}
              {/* Empty slots */}
              {Array.from({ length: 3 - selectedImages.length }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center"
                >
                  <ImageIcon className="h-8 w-8 text-muted-foreground/25" />
                </div>
              ))}
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Tips for best results:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Use high-quality images related to your video content</li>
              <li>Include images with clear subjects or key visual elements</li>
              <li>Mix close-ups with wider shots for variety</li>
              <li>Avoid images with too much text</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={selectedImages.length === 0 || isGenerating}
          >
            {isGenerating ? "Generating..." : `Generate Thumbnail (${selectedImages.length} image${selectedImages.length !== 1 ? 's' : ''})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}