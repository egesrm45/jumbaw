import React, { useState, useRef, useEffect } from 'react';
import { useThread, useMessagesByThreadId, useCreateMessage, useUpdateMessage, useDeleteMessage, useLikeMessage } from '@/hooks/useForum';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageSquare, ThumbsUp, Bookmark, MoreHorizontal, Send, Image, Smile, Paperclip, Edit, Trash, X, Settings } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Message } from '@/types/forum';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { FileAttachment } from './FileAttachment';
import { MessageAttachment } from './MessageAttachment';
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input"; // Added Input component import


interface ThreadViewProps {
  threadId: number | null;
  onBackClick: () => void;
  isMobile: boolean;
}

export function ThreadView({ threadId, onBackClick, isMobile }: ThreadViewProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileAttachment, setShowFileAttachment] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated } = useAuth();
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null); // Added state for cover preview

  // Handle clicking outside the emoji picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle emoji selection
  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const { data: thread, isLoading: isThreadLoading } = useThread(threadId);
  const { data: messages, isLoading: isMessagesLoading } = useMessagesByThreadId(threadId);
  const createMessageMutation = useCreateMessage();
  const updateMessageMutation = useUpdateMessage();
  const deleteMessageMutation = useDeleteMessage();
  const likeMessageMutation = useLikeMessage();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages && messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea as content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [newMessage]);

  const handleSendMessage = async () => {
    if (!threadId || !newMessage.trim() || !isAuthenticated) return;

    try {
      await createMessageMutation.mutateAsync({
        threadId,
        content: newMessage.trim()
      });
      setNewMessage('');
      setAttachmentUrl(null);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const handleUpdateMessage = async () => {
    if (!editingMessageId || !editContent.trim()) return;

    try {
      await updateMessageMutation.mutateAsync({
        messageId: editingMessageId,
        content: editContent.trim()
      });
      setEditingMessageId(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to update message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!threadId) return;

    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await deleteMessageMutation.mutateAsync({
          messageId,
          threadId
        });
      } catch (error) {
        console.error('Failed to delete message:', error);
      }
    }
  };

  const handleLikeMessage = async (messageId: number) => {
    if (!threadId || !isAuthenticated) return;

    try {
      await likeMessageMutation.mutateAsync({
        messageId,
        threadId
      });
    } catch (error) {
      console.error('Failed to like message:', error);
    }
  };

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
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Helper function to render message content with attachments
  const renderMessageContent = (content: string) => {
    // Check if message has file attachments
    if (content.includes('[dosya:')) {
      // Split content by newlines to process each line
      const lines = content.split('\n');

      return (
        <>
          {lines.map((line, index) => {
            // Check if line contains attachment reference
            if (line.includes('[dosya:')) {
              // Extract file URL from [dosya:url] format
              const fileUrlMatch = line.match(/\[dosya:(.*?)\]/);
              if (fileUrlMatch && fileUrlMatch[1]) {
                const fileUrl = fileUrlMatch[1];
                return <MessageAttachment key={index} fileUrl={fileUrl} className="my-2" />;
              }
              return <span key={index}>{line}</span>;
            }
            // Regular text content
            return <span key={index}>{line}{index < lines.length - 1 && <br />}</span>;
          })}
        </>
      );
    }

    // If no attachments, just return the text content
    return content;
  };

  if (!threadId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 p-8 text-center">
        <div>
          <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <h3 className="text-xl font-semibold mb-2 text-orange-500">Henüz bir konu seçilmedi</h3>
          <p className="text-gray-600">Soldaki listeden bir konu seçerek konuşmayı görüntüleyebilirsiniz</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Thread Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
        {isMobile && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2"
            onClick={onBackClick}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <div className="flex items-center flex-1 min-w-0">
          {isThreadLoading ? (
            <Skeleton className="h-5 w-48" />
          ) : (
            <>
              <h2 className="text-lg font-semibold truncate">{thread?.title}</h2>
              {thread?.tag && (
                <Badge 
                  variant="outline" 
                  className={`ml-2 ${getTagColorClasses(thread.tag)}`}
                >
                  {thread.tag}
                </Badge>
              )}
            </>
          )}
        </div>
        <div className="flex space-x-3">
          <Button variant="ghost" size="icon">
            <Bookmark className="h-5 w-5 text-gray-500" />
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-orange-600">Profil Ayarları</DialogTitle>
              </DialogHeader>
              <div className="h-[600px] pt-4">
                <Tabs defaultValue="profile" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="profile">Profil</TabsTrigger>
                    <TabsTrigger value="notifications">Bildirimler</TabsTrigger>
                    <TabsTrigger value="security">Güvenlik</TabsTrigger>
                  </TabsList>
                  <TabsContent value="profile" className="space-y-6">
                    <div className="relative w-full h-32 mb-16 group">
                      <div className="w-full h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-t-lg overflow-hidden">
                        {(coverPreviewUrl || user?.coverPhoto) && (
                          <img src={(coverPreviewUrl || user?.coverPhoto)} alt="Cover" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <label className="cursor-pointer p-2 hover:bg-white/20 rounded-full">
                          <input 
                            type="file" 
                            className="hidden" 
                            onChange={(e) => {
                              // Handle cover photo upload - needs implementation
                              if (e.target.files && e.target.files[0]) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target && event.target.result) {
                                    setCoverPreviewUrl(event.target.result as string);
                                  }
                                };
                                reader.readAsDataURL(e.target.files[0]);
                              }
                            }}
                          />
                          <span className="text-white">Cover Fotoğrafı Değiştir</span>
                        </label>
                      </div>
                      {/* Profile picture */}
                      <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
                        <div className="relative">
                          <img 
                            src={user?.avatar || "https://ui-avatars.com/api/?name=User&background=0084FF&color=fff"} 
                            alt="Profile" 
                            className="w-24 h-24 rounded-full border-4 border-white"
                          />
                          <label className="cursor-pointer absolute bottom-0 right-0 rounded-full bg-white h-8 w-8 p-0">
                            <input type="file" className="hidden" onChange={(e) => {
                              // Handle profile image upload - needs implementation
                            }} />
                            <span>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9"></path>
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                              </svg>
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* TC Kimlik Doğrulanmış Göstergesi */}
                      {user?.tcNo && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 border border-green-200 rounded-md">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                          </svg>
                          <div>
                            <div className="font-medium">TC Kimlik Doğrulanmış</div>
                            <div className="text-xs text-green-600">Bu hesabın kimlik bilgileri doğrulanmıştır</div>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Kullanıcı Adı</label>
                        <Input defaultValue={user?.username} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">E-posta</label>
                        <Input defaultValue={user?.email} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Biyografi</label>
                        <textarea 
                          className="w-full p-2 border rounded-md" 
                          rows={3} 
                          defaultValue={user?.bio || ""}
                        />
                      </div>

                      <Button className="w-full">Değişiklikleri Kaydet</Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="notifications" className="space-y-4">
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">Bildirim Ayarları</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Yeni Mesajlar</span>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Özel Mesaj Bildirimleri</span> 
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Bahsedilme Bildirimleri</span>
                        <Switch />
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="security" className="space-y-4">
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">Güvenlik Ayarları</h4>
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full">Şifre Değiştir</Button>
                        <Button variant="outline" className="w-full">İki Faktörlü Doğrulama</Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Thread Content */}
      <div 
        ref={messageListRef}
        className="flex-1 overflow-y-auto p-4 bg-gray-100"
      >
        {isThreadLoading || isMessagesLoading ? (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm mb-4 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center mb-3">
                  <Skeleton className="w-10 h-10 rounded-full mr-3" />
                  <div>
                    <Skeleton className="w-32 h-5 mb-1" />
                    <Skeleton className="w-24 h-4" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="w-full h-4" />
                  <Skeleton className="w-full h-4" />
                  <Skeleton className="w-3/4 h-4" />
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-2 border-t border-gray-100">
                <Skeleton className="w-24 h-4" />
              </div>
            </div>

            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start mb-3">
                <Skeleton className="w-8 h-8 rounded-full mr-2" />
                <div className="max-w-3xl">
                  <Skeleton className="w-64 h-16 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Thread Original Post */}
            {messages && messages.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm mb-4 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center mb-3">
                    <img 
                      src={messages[0].user?.avatar || `https://ui-avatars.com/api/?name=User&background=0084FF&color=fff`} 
                      alt={messages[0].user?.displayName || 'User'} 
                      className="w-10 h-10 rounded-full mr-3"
                    />
                    <div>
                      <div className="flex items-center">
                        <span className="font-medium">{messages[0].user?.displayName || 'Unknown User'}</span>
                        <span className="text-xs text-gray-500 ml-2">Topic Starter</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        Posted {formatDistanceToNow(new Date(messages[0].createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="prose max-w-none">
                    {editingMessageId === messages[0].id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full min-h-[100px]"
                        />
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingMessageId(null)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            size="sm"
                            onClick={handleUpdateMessage}
                            disabled={updateMessageMutation.isPending}
                          >
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{renderMessageContent(messages[0].content)}</div>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex justify-between items-center">
                  <div className="flex space-x-4">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-gray-500 hover:text-primary"
                      onClick={() => handleLikeMessage(messages[0].id)}
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      <span className="text-sm">{messages[0].likes}</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-gray-500 hover:text-primary"
                      onClick={() => {
                        if (textareaRef.current) {
                          textareaRef.current.focus();
                        }
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      <span className="text-sm">Reply</span>
                    </Button>
                  </div>
                  {messages[0].isEdited && (
                    <span className="text-xs text-gray-500">Edited</span>
                  )}
                </div>
              </div>
            )}

            {/* Thread Replies */}
            {messages && messages.length > 1 && (
              <div className="space-y-3">
                {messages.slice(1).map((message) => {
                  const isCurrentUser = message.user?.id === user?.id;

                  return (
                    <div 
                      key={message.id} 
                      className={`group flex ${isCurrentUser ? 'flex-row-reverse' : 'items-start'}`}
                    >
                      {!isCurrentUser && (
                        <img 
                          src={message.user?.avatar || `https://ui-avatars.com/api/?name=User&background=0084FF&color=fff`} 
                          alt={message.user?.displayName || 'User'} 
                          className="w-8 h-8 rounded-full mr-2" 
                        />
                      )}
                      <div className="max-w-3xl">
                        {editingMessageId === message.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full min-h-[100px]"
                            />
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setEditingMessageId(null)}
                              >
                                Cancel
                              </Button>
                              <Button 
                                size="sm"
                                onClick={handleUpdateMessage}
                                disabled={updateMessageMutation.isPending}
                              >
                                Save Changes
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div 
                              className={`${
                                isCurrentUser 
                                  ? 'message-bubble-mine bg-primary text-white' 
                                  : 'message-bubble-others bg-white'
                              } px-4 py-2 shadow-sm`}
                              style={{
                                borderRadius: isCurrentUser 
                                  ? '18px 18px 4px 18px' 
                                  : '18px 18px 18px 4px'
                              }}
                            >
                              {!isCurrentUser && (
                                <div className="flex items-center mb-1">
                                  <span className="font-medium text-sm">{message.user?.displayName || 'Unknown User'}</span>
                                  <span className="text-xs text-gray-500 ml-2">
                                    {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                                  </span>
                                </div>
                              )}
                              <p className="text-sm whitespace-pre-wrap">{renderMessageContent(message.content)}</p>
                            </div>

                            <div 
                              className={`flex items-center mt-1 ${
                                isCurrentUser ? 'justify-end mr-2' : 'ml-2'
                              } opacity-0 group-hover:opacity-100 transition`}
                            >
                              {isCurrentUser ? (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-auto p-1 text-xs text-gray-500 hover:text-primary"
                                    onClick={() => handleEditMessage(message)}
                                  >
                                    Edit
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-auto p-1 text-xs text-gray-500 hover:text-red-600"
                                    onClick={() => handleDeleteMessage(message.id)}
                                  >
                                    Delete
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-auto p-1 text-xs text-gray-500 hover:text-primary mr-2"
                                    onClick={() => handleLikeMessage(message.id)}
                                  >
                                    Like{message.likes > 0 && ` (${message.likes})`}
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-auto p-1 text-xs text-gray-500 hover:text-primary"
                                    onClick={() => {
                                      if (textareaRef.current) {
                                        setNewMessage(prev => `@${message.user?.displayName || 'User'} ${prev}`);
                                        textareaRef.current.focus();
                                      }
                                    }}
                                  >
                                    Reply
                                  </Button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Reply Box */}
      <div className="p-3 bg-white border-t border-gray-200">
        <div className="flex items-start">
          <div className="flex-1 bg-gray-100 rounded-2xl px-3 py-2">
            <Textarea
              ref={textareaRef}
              placeholder={isAuthenticated ? "Type a message..." : "Login to join the conversation"}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={!isAuthenticated || createMessageMutation.isPending}
              className="min-h-[40px] max-h-32 resize-none border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-transparent"
            />
          </div>
          <Button 
            size="icon"
            className="ml-2 bg-primary text-white rounded-full flex items-center justify-center"
            disabled={!isAuthenticated || !newMessage.trim() || createMessageMutation.isPending}
            onClick={handleSendMessage}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center mt-2 relative">
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-primary">
            <Image className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-500 hover:text-primary"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Smile className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-500 hover:text-primary"
            onClick={() => setShowFileAttachment(!showFileAttachment)}
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          {showEmojiPicker && (
            <div 
              ref={emojiPickerRef}
              className="absolute bottom-12 left-0 z-50"
            >
              <div className="bg-white p-1 rounded-lg shadow-lg flex items-center justify-between">
                <h4 className="text-sm font-medium px-2">Emojiler</h4>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 rounded-full"
                  onClick={() => setShowEmojiPicker(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <EmojiPicker 
                onEmojiClick={onEmojiClick} 
                theme={Theme.LIGHT}
                width={320}
                height={400}
              />
            </div>
          )}

          {showFileAttachment && (
            <div className="absolute bottom-12 left-0 z-50">
              <div className="bg-white p-4 rounded-lg shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Dosya Ekle</h4>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-full"
                    onClick={() => setShowFileAttachment(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <FileAttachment 
                  onFileUploaded={(fileUrl) => {
                    setAttachmentUrl(fileUrl);
                    setShowFileAttachment(false);
                    // Add file URL to message
                    setNewMessage(prev => prev + `\n[dosya:${fileUrl}]`);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ThreadView;