import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface FileUploadResult {
  success: boolean;
  fileName?: string;
  filePath?: string;
  fileUrl?: string;
  message?: string;
  error?: any;
}

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const { toast } = useToast();

  // Function to upload a file
  const uploadFile = async (file: File): Promise<FileUploadResult> => {
    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header as browser will set it with boundary
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        toast({
          title: "Upload Failed",
          description: errorData.message || "Failed to upload file",
          variant: "destructive",
        });
        return { 
          success: false, 
          message: errorData.message || "Failed to upload file" 
        };
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Upload Successful",
          description: "File uploaded successfully",
        });
      }
      
      return data;
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.message || "An unexpected error occurred during upload",
        variant: "destructive",
      });
      return { 
        success: false, 
        message: error.message || "An unexpected error occurred", 
        error 
      };
    } finally {
      setIsUploading(false);
    }
  };
  
  return { uploadFile, isUploading };
}