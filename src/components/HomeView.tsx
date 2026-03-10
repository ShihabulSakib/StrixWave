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
        }
      } catch (err) {
        console.error('[HomeView] Failed to load library:', err);
      }
    };
    loadLibrary();
  }, []);

  const recentlyAdded = [...libraryTracks].sort((a, b) => 
    new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime()
  ).slice(0, 8);
  
  const randomMix = [...libraryTracks].slice(0, 5);

  // Determine greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex-1 overflow-y-auto">
      <TopNav />

      <div className="px-6 pb-8">
        {/* Hero Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-6">{greeting}</h1>

          {/* Recently Played Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {recentlyAdded.length > 0 ? recentlyAdded.slice(0, 6).map((item, idx) => (
              <div
                key={item.id}
                onClick={() => {
                  setQueue(recentlyAdded, idx);
                }}
                className="group bg-surface/50 hover:bg-surface-hover rounded-md overflow-hidden flex items-center gap-3 transition-all duration-300 cursor-pointer"
              >
                <TrackCover
                  coverUrl={item.coverUrl}
                  coverBlob={item.coverBlob}
                  alt={item.title}
                  className="w-16 h-16 object-cover rounded-l-md"
                />
                <span className="text-text-primary font-medium text-sm pr-3 group-hover:text-accent transition-colors truncate">
                  {item.title}
                </span>
                <div 
                  className="w-10 h-10 rounded-full bg-accent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 mr-3 shadow-lg flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQueue(recentlyAdded, idx);
                  }}
                >
                  <Play size={18} className="fill-primary text-primary ml-0.5" />
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
