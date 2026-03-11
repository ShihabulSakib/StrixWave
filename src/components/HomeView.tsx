import React, { useState, useEffect } from 'react';
import { Play, Cloud, Music2 } from 'lucide-react';
import TopNav from './TopNav';
import AlbumCard from './AlbumCard';
import TrackCover from './TrackCover';
import ConnectionManager from './ConnectionManager';
import { usePlayer, type Track } from '../context/PlayerContext';
import { getAllTracks } from '../services/db';

interface HomeViewProps {
  onNavigate?: (tab: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  const { playTrack, setQueue } = usePlayer();
  const [libraryTracks, setLibraryTracks] = useState<Track[]>([]);
  const [showConnectionManager, setShowConnectionManager] = useState(false);

  useEffect(() => {
    const loadLibrary = async () => {
      try {
        const stored = await getAllTracks();
        if (stored.length > 0) {
          const mapped: Track[] = stored.map((t) => ({
            id: t.id,
            title: t.title,
            artist: t.artist,
            album: t.album,
            duration: t.duration,
            durationSeconds: t.durationSeconds,
            addedDate: t.addedDate,
            coverUrl: t.coverUrl,
            coverBlob: t.coverBlob,
            dropboxPath: t.dropboxPath,
          }));
          
          // Shuffle a bit for "discovery" sections
          setLibraryTracks(mapped.sort(() => 0.5 - Math.random()));
        } else {
          setLibraryTracks([]);
        }
      } catch (err) {
        console.error('[HomeView] Failed to load library:', err);
      }
    };

    loadLibrary();

    // Listen for library sync events
    window.addEventListener('library-synced', loadLibrary);
    return () => window.removeEventListener('library-synced', loadLibrary);
  }, []);

  const recentlyAdded = [...libraryTracks].sort((a, b) => 
    new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime()
  ).slice(0, 8);
  
  const randomMix = [...libraryTracks].slice(0, 5);

  // Determine greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 18) return 'Good Afternoon';
    if (hour >= 18 && hour < 22) return 'Good Evening';
    return 'Good Night';
  };

  const greeting = getGreeting();

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <TopNav />

      <div className="px-6 pb-24 md:pb-8">
        {/* Hero Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-6">{greeting}</h1>

          {/* Recently Played Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {recentlyAdded.length > 0 ? recentlyAdded.slice(0, 6).map((item, idx) => (
              <div
                key={item.id}
                onClick={() => {
                  setQueue(recentlyAdded, idx);
                }}
                className="group bg-surface/40 hover:bg-surface-hover/60 rounded-lg overflow-hidden flex items-center gap-4 transition-all duration-300 cursor-pointer border border-white/5 backdrop-blur-sm"
              >
                <div className="relative w-16 h-16 flex-shrink-0">
                  <TrackCover
                    coverUrl={item.coverUrl}
                    coverBlob={item.coverBlob}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-text-primary font-bold text-sm truncate group-hover:text-accent transition-colors">
                    {item.title}
                  </p>
                  <p className="text-text-secondary text-[10px] truncate uppercase tracking-wider font-semibold opacity-60">
                    {item.artist}
                  </p>
                </div>
              </div>
            )) : (
              /* ===== Empty State with CTA ===== */
              <div className="col-span-full flex flex-col items-center py-12 text-center">
                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6">
                  <Music2 size={36} className="text-accent" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">Welcome to Strixwave</h3>
                <p className="text-text-secondary text-sm max-w-sm mb-6">
                  Connect your Dropbox account to sync and stream your personal music library.
                </p>
                <button
                  onClick={() => setShowConnectionManager(true)}
                  className="flex items-center gap-3 px-8 py-4 rounded-lg bg-accent hover:bg-accent-hover text-primary font-semibold transition-all hover:scale-105 shadow-lg"
                >
                  <Cloud size={22} />
                  <span>Connect & Sync Dropbox</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Made For You Section */}
        {randomMix.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-text-primary hover:underline cursor-pointer">
                Jump Back In
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {randomMix.map((item, idx) => (
                <AlbumCard
                  key={item.id}
                  title={item.title}
                  subtitle={item.artist}
                  coverUrl={item.coverUrl || ''}
                  coverBlob={item.coverBlob}
                  showDescription={false}
                  hidePlayButton={true}
                  onClick={() => setQueue(randomMix, idx)}
                  onPlay={(e) => {
                    e.stopPropagation();
                    setQueue(randomMix, idx);
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Connection Manager Modal */}
      <ConnectionManager
        isOpen={showConnectionManager}
        onClose={() => setShowConnectionManager(false)}
      />
    </div>
  );
};

export default HomeView;
