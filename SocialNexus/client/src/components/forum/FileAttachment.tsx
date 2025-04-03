import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, FileText, Image, File, UploadCloud, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFileUpload } from '../../hooks/useFileUpload';

interface FileAttachmentProps {
  onFileUploaded?: (fileUrl: string) => void;
  className?: string;
}

export function FileAttachment({ onFileUploaded, className }: FileAttachmentProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useFileUpload();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    
    if (file) {
      setSelectedFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleUploadClick = async () => {
    if (selectedFile) {
      const result = await uploadFile(selectedFile);
      
      if (result.success && result.fileUrl && onFileUploaded) {
        onFileUploaded(result.fileUrl);
        // Reset state after successful upload
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleAttachClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return <File className="h-5 w-5" />;
    
    if (selectedFile.type.startsWith('image/')) {
      return <Image className="h-5 w-5" />;
    } else if (selectedFile.type.includes('pdf') || selectedFile.type.includes('document')) {
      return <FileText className="h-5 w-5" />;
    } else {
      return <File className="h-5 w-5" />;
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*,application/pdf,.doc,.docx,.txt"
      />
      
      {!selectedFile ? (
        <Button 
          onClick={handleAttachClick} 
          variant="outline" 
          size="sm" 
          type="button" 
          className="flex gap-1 items-center"
        >
          <Paperclip className="h-4 w-4" />
          Attach file
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 p-2 border rounded-md bg-muted/30">
            {previewUrl && (
              <div className="relative">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="max-h-32 rounded object-cover mx-auto" 
                />
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm">
                {getFileIcon()}
                <span className="truncate max-w-[150px]">{selectedFile.name}</span>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleRemoveFile} 
                className="h-6 w-6 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Button 
            onClick={handleUploadClick} 
            disabled={isUploading} 
            variant="default" 
            size="sm" 
            type="button"
            className="mt-1"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}