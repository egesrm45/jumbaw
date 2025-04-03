import React from 'react';
import { useCreateThread } from '@/hooks/useForum';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { DialogTitle, DialogContent, Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const threadSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
  tag: z.string().optional(),
  content: z.string().min(10, 'Content must be at least 10 characters'),
});

type ThreadFormValues = z.infer<typeof threadSchema>;

interface NewThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: number | null;
}

export function NewThreadModal({ isOpen, onClose, topicId }: NewThreadModalProps) {
  const createThreadMutation = useCreateThread();
  
  const form = useForm<ThreadFormValues>({
    resolver: zodResolver(threadSchema),
    defaultValues: {
      title: '',
      tag: 'Discussion',
      content: '',
    },
  });
  
  const onSubmit = async (data: ThreadFormValues) => {
    if (!topicId) return;
    
    try {
      await createThreadMutation.mutateAsync({
        topicId,
        title: data.title,
        content: data.content,
        tag: data.tag
      });
      
      form.reset();
      onClose();
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="text-xl font-semibold">New Thread</DialogTitle>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Thread title" 
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="tag"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tag</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tag" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Question">Question</SelectItem>
                      <SelectItem value="Discussion">Discussion</SelectItem>
                      <SelectItem value="Bug">Bug</SelectItem>
                      <SelectItem value="Announcement">Announcement</SelectItem>
                      <SelectItem value="Best Practices">Best Practices</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="What would you like to discuss?" 
                      className="w-full min-h-[150px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-3 pt-2">
              <Button 
                type="button" 
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createThreadMutation.isPending}
              >
                {createThreadMutation.isPending ? 'Creating...' : 'Create Thread'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default NewThreadModal;
