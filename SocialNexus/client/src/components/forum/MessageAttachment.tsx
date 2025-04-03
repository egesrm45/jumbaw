import { useState } from 'react';
import { FileText, Image, ExternalLink, Download, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface MessageAttachmentProps {
  fileUrl: string;
  className?: string;
}

export function MessageAttachment({ fileUrl, className }: MessageAttachmentProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Determine file type based on URL extension
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);
  const isPdf = /\.pdf$/i.test(fileUrl);
  const isDocument = /\.(doc|docx|txt)$/i.test(fileUrl);
  
  const fileName = fileUrl.split('/').pop() || 'file';
  const displayName = fileName.length > 25 
    ? fileName.substring(0, 20) + '...' + fileName.substring(fileName.lastIndexOf('.'))
    : fileName;
  
  // Extract timestamp from filename (if it follows our format)
  const fileDate = (() => {
    const match = fileName.match(/^(\d+)_/);
    if (match && match[1]) {
      return new Date(parseInt(match[1]));
    }
    return null;
  })();
  
  const getFileIcon = () => {
    if (isImage) return <Image className="h-5 w-5" />;
    if (isPdf || isDocument) return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };
  
  const renderAttachmentContent = () => {
    if (isImage) {
      return (
        <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
          <DialogTrigger asChild>
            <div className="cursor-pointer">
              <img 
                src={fileUrl} 
                alt={fileName} 
                className="max-h-[180px] max-w-[300px] rounded object-cover" 
              />
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl p-2 bg-transparent border-none">
            <img 
              src={fileUrl} 
              alt={fileName} 
              className="max-h-[80vh] max-w-[80vw] object-contain" 
            />
          </DialogContent>
        </Dialog>
      );
    }
    
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md border">
        {getFileIcon()}
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm font-medium truncate">{displayName}</span>
          {fileDate && (
            <span className="text-xs text-muted-foreground">
              {fileDate.toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex gap-1 ml-auto">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            asChild
          >
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            asChild
          >
            <a href={fileUrl} download={fileName}>
              <Download className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    );
  };
  
  return (
    <div className={cn("my-2", className)}>
      {renderAttachmentContent()}
    </div>
  );
}