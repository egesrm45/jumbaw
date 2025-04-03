import React, { useState } from 'react';
import { useThreadsByTopicId, useThread } from '@/hooks/useForum';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Plus, MessageSquare } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import NewThreadModal from './NewThreadModal';
import { Thread } from '@/types/forum';

interface ThreadListProps {
  topicId: number | null;
  onThreadSelect: (threadId: number) => void;
  selectedThreadId: number | null;
}

export function ThreadList({ topicId, onThreadSelect, selectedThreadId }: ThreadListProps) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'following'>('all');
  const [isNewThreadModalOpen, setIsNewThreadModalOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  
  const { data: threads, isLoading, error } = useThreadsByTopicId(topicId);
  const { data: selectedTopic } = useThread(selectedThreadId);
  
  const openNewThreadModal = () => {
    if (isAuthenticated) {
      setIsNewThreadModalOpen(true);
    } else {
      // TODO: Show login modal
      alert("Please log in to create a new thread");
    }
  };
  
  // Get topic name
  const topicName = selectedTopic?.topic?.name || 'Select a Topic';
  
  // Format thread count
  const threadCount = threads?.length || 0;
  const newThreadsToday = 0; // This would need real calculation
  
  return (
    <>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{topicName}</h2>
          <p className="text-xs text-gray-500">{threadCount} threads, {newThreadsToday} new today</p>
        </div>
        {topicId && (
          <Button 
            id="new-thread-button"
            variant="ghost" 
            size="icon" 
            className="text-primary hover:bg-blue-50 rounded-full"
            onClick={openNewThreadModal}
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>
      
      {/* Thread Filter */}
      {topicId && (
        <div className="px-4 py-2 border-b border-gray-200">
          <div className="flex space-x-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'} 
              size="sm"
              className="text-sm rounded-full"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'} 
              size="sm"
              className="text-sm rounded-full"
              onClick={() => setFilter('unread')}
            >
              Unread
            </Button>
            <Button
              variant={filter === 'following' ? 'default' : 'outline'} 
              size="sm"
              className="text-sm rounded-full"
              onClick={() => setFilter('following')}
            >
              Following
            </Button>
          </div>
        </div>
      )}
      
      {/* Thread List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {!topicId ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a topic to view threads
          </div>
        ) : isLoading ? (
          // Loading skeletons
          <div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 border-b border-gray-200">
                <div className="flex space-x-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full mt-2" />
                    <div className="flex items-center mt-2 space-x-2">
                      <Skeleton className="h-4 w-16 rounded-full" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-red-500">
            Error loading threads. Please try again.
          </div>
        ) : threads?.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mb-2 opacity-20" />
            <p>No threads in this topic yet</p>
            {isAuthenticated && (
              <Button 
                variant="outline"
                className="mt-4"
                onClick={openNewThreadModal}
              >
                Create the first thread
              </Button>
            )}
          </div>
        ) : (
          threads?.map((thread: Thread) => {
            const isSelected = thread.id === selectedThreadId;
            
            // Format the date
            const createdDate = new Date(thread.createdAt);
            const timeAgo = formatDistanceToNow(createdDate, { addSuffix: true });
            
            // Tag color classes
            const getTagColorClasses = (tag?: string) => {
              switch (tag?.toLowerCase()) {
                case 'question':
                  return 'bg-blue-100 text-blue-700';
                case 'discussion':
                  return 'bg-green-100 text-green-700';
                case 'bug':
                  return 'bg-red-100 text-red-700';
                case 'announcement':
                  return 'bg-purple-100 text-purple-700';
                case 'best practices':
                  return 'bg-purple-100 text-purple-700';
                default:
                  return 'bg-gray-100 text-gray-700';
              }
            };
            
            return (
              <div 
                key={thread.id}
                className={`p-3 border-b border-gray-200 hover:bg-gray-50 transition cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
                onClick={() => onThreadSelect(thread.id)}
              >
                <div className="flex space-x-3">
                  <img 
                    src={thread.user?.avatar || `https://ui-avatars.com/api/?name=User&background=0084FF&color=fff`}
                    alt={thread.user?.displayName || 'User'}
                    className="w-10 h-10 rounded-full" 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium text-black truncate">{thread.title}</h3>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                        {timeAgo}
                      </span>
                    </div>
                    <div className="flex items-center mt-1">
                      <span className="text-sm text-gray-500 truncate">
                        {thread.preview}
                      </span>
                    </div>
                    <div className="flex items-center mt-1 space-x-2">
                      {thread.tag && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getTagColorClasses(thread.tag)}`}>
                          {thread.tag}
                        </span>
                      )}
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="h-3 w-3 text-gray-500" />
                        <span className="text-xs text-gray-500">{thread.replyCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* New Thread Modal */}
      <NewThreadModal 
        isOpen={isNewThreadModalOpen}
        onClose={() => setIsNewThreadModalOpen(false)}
        topicId={topicId}
      />
    </>
  );
}

export default ThreadList;
