import { useState, useEffect, memo } from 'react';
import { PlayerProvider } from './context/PlayerContext';
import { PlaylistProvider, usePlaylists } from './context/PlaylistContext';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import MobileNav from './components/MobileNav';
import MobileBottomNav from './components/MobileBottomNav';
import MobilePlayerDrawer from './components/MobilePlayerDrawer';
import HomeView from './components/HomeView';
import SearchView from './components/SearchView';
import PlaylistView from './components/PlaylistView';
import YourLibrary from './components/YourLibrary';
import Queue from './components/Queue';
import { useNavigationHistory } from './hooks/useHistoryHook';

const AppContent = memo(() => {
  const [activeTab, setActiveTab] = useState('home');
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  const { allPlaylists } = usePlaylists();

  useNavigationHistory(
    activeTab,
    selectedPlaylistId,
    (tab, playlistId) => {
      setActiveTab(tab);
      setSelectedPlaylistId(playlistId);
    }
  );

  useEffect(() => {
    // If we're viewing a playlist and it was deleted, go back to library
    if (activeTab === 'playlist' && selectedPlaylistId) {
      const exists = allPlaylists.some(p => p.id === selectedPlaylistId);
      if (!exists) {
        setActiveTab('library');
        setSelectedPlaylistId(null);
      }
    }
  }, [allPlaylists, activeTab, selectedPlaylistId]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarExpanded(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTabChange = (tab: string) => {
    if (tab === activeTab && tab !== 'playlist') return;
    setActiveTab(tab);
    setSelectedPlaylistId(null);
  };

  const handlePlaylistSelect = (id: string) => {
    if (id === selectedPlaylistId && activeTab === 'playlist') return;
    setSelectedPlaylistId(id);
    setActiveTab('playlist');
  };

  const renderContent = () => {
    let content;
    switch (activeTab) {
      case 'home':
        content = <HomeView onNavigate={handleTabChange} />;
        break;
      case 'search':
        content = <SearchView />;
        break;
      case 'library':
        content = <YourLibrary onPlaylistSelect={handlePlaylistSelect} />;
        break;
      case 'playlist':
        content = <PlaylistView playlistId={selectedPlaylistId} />;
        break;
      default:
        content = <HomeView onNavigate={handleTabChange} />;
    }

    return (
      <div key={`${activeTab}-${selectedPlaylistId}`} className="flex-1 flex flex-col min-h-0 overflow-y-auto animate-fade-in">
        {content}
      </div>
    );
  };

  return (
    <div className="h-[100dvh] w-screen bg-primary flex flex-col overflow-hidden relative">
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar - Hidden on mobile */}
        {!isMobile && (
          <Sidebar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onPlaylistSelect={handlePlaylistSelect}
            selectedPlaylistId={selectedPlaylistId}
          />
        )}

        {/* Content */}
        <main className="flex-1 flex flex-col overflow-hidden bg-primary relative">
          {renderContent()}
        </main>
      </div>

      {/* Desktop Player Bar */}
      {!isMobile && <PlayerBar isMobile={false} />}

      {/* Mobile: Player + BottomNav stacked flex footer — eliminates fixed-position gap (U01) */}
      {isMobile && (
        <div className="flex-shrink-0">
          <PlayerBar isMobile={true} />
          <MobileBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      )}

      {/* Mobile Sidebar/Drawer */}
      <MobileNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Desktop/Tablet Queue Drawer */}
      <Queue />

      {/* Mobile Player Drawer - Full screen overlay */}
      <MobilePlayerDrawer />
    </div>
  );
});

AppContent.displayName = 'AppContent';

import { NotificationProvider } from './components/NotificationProvider';

function App() {
  return (
    <NotificationProvider>
      <PlayerProvider>
        <PlaylistProvider>
          <AppContent />
        </PlaylistProvider>
      </PlayerProvider>
    </NotificationProvider>
  );
}

export default App;
