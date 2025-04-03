import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Thread, Message } from '@/types/forum';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';

// Threads 
export function useThreadsByTopicId(topicId: number | null) {
  return useQuery({
    queryKey: topicId ? [`/api/topics/${topicId}/threads`] : null,
    enabled: !!topicId,
  });
}

export function useThread(threadId: number | null) {
  return useQuery({
    queryKey: threadId ? [`/api/threads/${threadId}`] : null,
    enabled: !!threadId,
  });
}

export function useCreateThread() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (threadData: { 
      topicId: number; 
      title: string;
      content: string;
      tag?: string;
    }) => {
      const response = await apiRequest('POST', '/api/threads', threadData);
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate the threads query
      queryClient.invalidateQueries({ queryKey: [`/api/topics/${variables.topicId}/threads`] });
      
      toast({
        title: "Thread created",
        description: "Your thread has been created successfully.",
      });
      
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating thread",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}

// Messages
export function useMessagesByThreadId(threadId: number | null) {
  return useQuery({
    queryKey: threadId ? [`/api/threads/${threadId}/messages`] : null,
    enabled: !!threadId,
  });
}

export function useCreateMessage() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (messageData: { threadId: number; content: string }) => {
      if (!user) {
        throw new Error("You must be logged in to send a message");
      }
      
      const completeMessageData = {
        ...messageData,
        userId: user.id
      };
      
      const response = await apiRequest('POST', '/api/messages', completeMessageData);
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate the messages query
      queryClient.invalidateQueries({ queryKey: [`/api/threads/${variables.threadId}/messages`] });
      
      // Also invalidate the threads query to update the reply count
      queryClient.invalidateQueries({ queryKey: [`/api/topics`] });
      
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}

export function useUpdateMessage() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ messageId, content }: { messageId: number; content: string }) => {
      const response = await apiRequest('PATCH', `/api/messages/${messageId}`, { content });
      return response.json();
    },
    onSuccess: (data) => {
      // Get the threadId from the response
      const threadId = data.threadId;
      
      // Invalidate the messages query
      queryClient.invalidateQueries({ queryKey: [`/api/threads/${threadId}/messages`] });
      
      toast({
        title: "Message updated",
        description: "Your message has been updated successfully.",
      });
      
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating message",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}

export function useDeleteMessage() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ messageId, threadId }: { messageId: number; threadId: number }) => {
      const response = await apiRequest('DELETE', `/api/messages/${messageId}`, {});
      if (response.ok) {
        return { messageId, threadId };
      }
      const errorData = await response.json();
      throw new Error(errorData.message || 'Could not delete message');
    },
    onSuccess: (data) => {
      // Invalidate the messages query
      queryClient.invalidateQueries({ queryKey: [`/api/threads/${data.threadId}/messages`] });
      
      toast({
        title: "Message deleted",
        description: "Your message has been deleted successfully.",
      });
      
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting message",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}

export function useLikeMessage() {
  return useMutation({
    mutationFn: async ({ messageId, threadId }: { messageId: number; threadId: number }) => {
      const response = await apiRequest('POST', `/api/messages/${messageId}/like`, {});
      if (response.ok) {
        return { messageId, threadId };
      }
      const errorData = await response.json();
      throw new Error(errorData.message || 'Could not like message');
    },
    onSuccess: (data) => {
      // Invalidate the messages query
      queryClient.invalidateQueries({ queryKey: [`/api/threads/${data.threadId}/messages`] });
      
      return data;
    }
  });
}
