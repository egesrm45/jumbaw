import React, { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useCategoriesWithTopics } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, X, Hash, Settings, LogOut } from 'lucide-react';

interface SidebarProps {
  onClose: () => void;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onTopicSelect: (topicId: number) => void;
  selectedTopicId: number | null;
}

export function Sidebar({
  onClose,
  onLoginClick,
  onLogoutClick,
  onTopicSelect,
  selectedTopicId
}: SidebarProps) {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  
  const { categoriesWithTopics, isLoading, error } = useCategoriesWithTopics();

  const filteredCategories = categoriesWithTopics?.filter(category => 
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.topics.some(topic => 
      topic.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
  
  return (
    <>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Forums</h2>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden mr-2"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5 text-gray-500" />
          </Button>
        </div>
      </div>
      
      {/* Search */}
      <div className="p-3">
        <div className="bg-gray-100 rounded-full flex items-center px-3 py-1.5">
          <Search className="h-4 w-4 text-gray-500 mr-2" />
          <Input 
            type="text" 
            placeholder="Search topics..." 
            className="bg-transparent border-none focus:ring-0 text-sm p-0 h-auto"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {/* User Profile or Login */}
      <div className="p-3 flex items-center border-b border-gray-200">
        {isAuthenticated && user ? (
          <>
            <img 
              src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=0084FF&color=fff`} 
              alt={user.displayName} 
              className="w-10 h-10 rounded-full mr-3" 
            />
            <div>
              <p className="font-medium text-black">{user.displayName}</p>
              <p className="text-xs text-gray-500">
                {user.isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </>
        ) : (
          <Button 
            variant="default" 
            className="w-full"
            onClick={onLoginClick}
          >
            Log in
          </Button>
        )}
      </div>

      {/* Categories */}
      <div className="overflow-y-auto flex-1 scrollbar-hide">
        <div className="p-3">
          <h3 className="text-sm uppercase font-semibold text-gray-500 mb-2">Categories</h3>
          
          {isLoading ? (
            // Loading skeletons
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="mb-4">
                  <Skeleton className="h-5 w-1/2 mb-2" />
                  <div className="space-y-2 pl-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-red-500 p-2">
              Error loading categories. Please try again.
            </div>
          ) : (
            filteredCategories?.map((category) => (
              <div key={category.id} className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{category.name}</h4>
                  <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5">
                    {category.topics.length} topics
                  </span>
                </div>
                
                {category.isTopicsLoading ? (
                  <div className="space-y-2 pl-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : (
                  category.topics.map((topic) => (
                    <div 
                      key={topic.id}
                      className={`pl-3 py-2 hover:bg-gray-100 rounded-md transition cursor-pointer flex items-center ${
                        selectedTopicId === topic.id ? 'text-primary bg-blue-50' : 'text-gray-700'
                      }`}
                      onClick={() => onTopicSelect(topic.id)}
                    >
                      <Hash className={`mr-2 h-3 w-3 ${selectedTopicId === topic.id ? 'text-primary' : 'text-gray-500'}`} />
                      <span className="text-sm">{topic.name}</span>
                    </div>
                  ))
                )}
              </div>
            ))
          )}
          
          {filteredCategories?.length === 0 && !isLoading && (
            <div className="text-gray-500 text-center p-4">
              No categories or topics found for "{searchQuery}"
            </div>
          )}
        </div>
      </div>
      
      {/* Log out */}
      {isAuthenticated && (
        <div className="p-3 border-t border-gray-200">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-gray-700 hover:text-red-600 transition"
            onClick={onLogoutClick}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </Button>
        </div>
      )}
    </>
  );
}

export default Sidebar;
