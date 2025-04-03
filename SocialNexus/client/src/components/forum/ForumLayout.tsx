import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import Sidebar from './Sidebar';
import ThreadList from './ThreadList';
import ThreadView from './ThreadView';
import { LoginModal } from '../auth/LoginModal';
import { RegisterModal } from '../auth/RegisterModal';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Menu, X, MessageCircle, Bell, User, Plus } from 'lucide-react';
import { useIsMobile as useMobile } from '@/hooks/use-mobile';

type ForumView = 'threads' | 'thread';

export function ForumLayout() {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [mobileView, setMobileView] = useState<ForumView>('threads');
  const { user, isAuthenticated, logout } = useAuth();
  const isMobile = useMobile();
  const [, setLocation] = useLocation();

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (isMobile && sidebarOpen && !(e.target as Element).closest('#sidebar')) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isMobile, sidebarOpen]);

  const handleThreadSelect = (threadId: number) => {
    setSelectedThreadId(threadId);
    if (isMobile) {
      setMobileView('thread');
    }
  };

  const handleBackToThreads = () => {
    if (isMobile) {
      setMobileView('threads');
    }
  };

  const handleTopicSelect = (topicId: number) => {
    setSelectedTopicId(topicId);
    setSelectedThreadId(null);
    setSidebarOpen(false);
    if (isMobile) {
      setMobileView('threads');
    }
  };

  const handleLoginClick = () => {
    setLoginModalOpen(true);
  };

  const handleRegisterClick = () => {
    setRegisterModalOpen(true);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex flex-col h-screen lg:flex-row bg-gray-100">
      {/* Mobile Header */}
      <header className="bg-white shadow-sm py-3 px-4 flex items-center justify-between lg:hidden">
        <button
          className="text-gray-500"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold text-black">Forum</h1>
        {isAuthenticated ? (
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setLocation('/profile')}
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.displayName}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <User className="h-5 w-5" />
              )}
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLoginClick}
          >
            Login
          </Button>
        )}
      </header>

      {/* Sidebar */}
      <div
        id="sidebar"
        className={`fixed inset-0 z-40 lg:relative lg:inset-auto lg:z-0 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } transition-transform duration-300 ease-in-out lg:flex lg:flex-col w-full lg:w-80 bg-white h-screen border-r border-gray-200 lg:fixed left-0`}
      >
        <Sidebar
          onClose={() => setSidebarOpen(false)}
          onLoginClick={handleLoginClick}
          onLogoutClick={handleLogout}
          onTopicSelect={handleTopicSelect}
          selectedTopicId={selectedTopicId}
        />
      </div>

      {/* Main Content - Thread List and Thread View */}
      <div className="flex-1 flex flex-col lg:flex-row lg:pl-80">
        {/* Thread List */}
        <div
          className={`w-full lg:w-96 bg-white lg:h-screen lg:border-r border-gray-200 flex flex-col ${
            isMobile && mobileView === 'thread' ? 'hidden' : 'flex'
          }`}
        >
          <ThreadList
            topicId={selectedTopicId}
            onThreadSelect={handleThreadSelect}
            selectedThreadId={selectedThreadId}
          />
        </div>

        {/* Thread View */}
        <div
          className={`${
            isMobile && mobileView === 'threads' ? 'hidden' : 'flex'
          } flex-1 flex-col h-screen`}
        >
          <ThreadView
            threadId={selectedThreadId}
            onBackClick={handleBackToThreads}
            isMobile={isMobile}
          />
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-2 lg:hidden">
        <Button variant="ghost" size="icon" className="text-primary">
          <MessageCircle className="h-6 w-6" />
        </Button>
        <Button variant="ghost" size="icon" className="text-gray-500">
          <Bell className="h-6 w-6" />
        </Button>
        <Button variant="ghost" size="icon" className="text-gray-500">
          <User className="h-6 w-6" />
        </Button>
      </div>

      {/* Floating New Thread Button (Mobile) */}
      {isAuthenticated && selectedTopicId && isMobile && (
        <Button
          size="icon"
          className="fixed right-4 bottom-16 bg-primary text-white rounded-full p-3 shadow-lg lg:hidden"
          onClick={() => {
            // This is handled in ThreadList component
            document.getElementById('new-thread-button')?.click();
          }}
        >
          <Plus className="h-5 w-5" />
        </Button>
      )}

      {/* Auth Modals */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onShowRegister={() => {
          setLoginModalOpen(false);
          setRegisterModalOpen(true);
        }}
      />

      <RegisterModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onShowLogin={() => {
          setRegisterModalOpen(false);
          setLoginModalOpen(true);
        }}
      />
    </div>
  );
}

export default ForumLayout;
