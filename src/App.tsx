import { useState, useEffect } from 'react';
import { PlayerProvider } from './context/PlayerContext';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import MobileNav from './components/MobileNav';
import MobilePlayerDrawer from './components/MobilePlayerDrawer';
import HomeView from './components/HomeView';
import SearchView from './components/SearchView';
import PlaylistView from './components/PlaylistView';

import Queue from './components/Queue';

function AppContent() {
// ... existing states
  const [activeTab, setActiveTab] = useState('home');
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

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

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeView onNavigate={setActiveTab} />;
      case 'search':
        return <SearchView />;
      case 'library':
        return <PlaylistView />;
      case 'playlist':
        return <PlaylistView />;
      default:
        return <HomeView onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="h-screen w-screen bg-primary flex flex-col overflow-hidden relative">
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar - Hidden on mobile */}
        {!isMobile && (
          <Sidebar
            isExpanded={sidebarExpanded}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}

        {/* Content */}
        <main className="flex-1 flex flex-col overflow-hidden bg-primary relative">
          {renderContent()}
        </main>
      </div>

      {/* Player Bar - Adjusts based on screen size */}
      <PlayerBar isMobile={isMobile} />

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />}

      {/* Desktop/Tablet Queue Drawer */}
      <Queue />

      {/* Mobile Player Drawer - Full screen overlay */}
      <MobilePlayerDrawer />
    </div>
  );
}

function App() {
  return (
    <PlayerProvider>
      <AppContent />
    </PlayerProvider>
  );
}

export default App;
