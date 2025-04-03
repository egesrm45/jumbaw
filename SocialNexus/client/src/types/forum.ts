export interface User {
  id: number;
  username: string;
  displayName: string;
  avatar?: string;
  isOnline: boolean;
  tcVerified?: boolean;
  tcoins?: number;
  theme?: string;
  language?: string;
  timezone?: string;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Topic {
  id: number;
  categoryId: number;
  name: string;
  description?: string;
}

export interface Thread {
  id: number;
  topicId: number;
  userId: number;
  title: string;
  createdAt: Date;
  lastActivityAt: Date;
  replyCount: number;
  tag?: string;
  user?: User;
  preview?: string;
}

export interface Message {
  id: number;
  threadId: number;
  userId: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
  likes: number;
  user?: User;
}

export interface EnrichedThread extends Thread {
  topic?: Topic;
  category?: Category;
}
