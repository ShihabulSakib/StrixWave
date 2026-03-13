import React, { useState, useEffect, useMemo } from 'react';
import { Play, Cloud, Music2, Plus } from 'lucide-react';
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
            providerId: t.providerId,
            providerPath: t.providerPath,
          }));
          
          setLibraryTracks(mapped);
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

  const recentlyAdded = useMemo(() => 
    [...libraryTracks].sort((a, b) => 
      new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime()
    ).slice(0, 10),
  [libraryTracks]);
  
  const shuffleMix = useMemo(() => 
    [...libraryTracks].sort(() => Math.random() - 0.5).slice(0, 10),
  [libraryTracks]);

  // Memoize greeting to prevent recalculation on every render
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 18) return 'Good Afternoon';
    if (hour >= 18 && hour < 22) return 'Good Evening';
    return 'Good Night';
  }, []);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-white/[0.03] to-transparent">
      <TopNav />

      <div className="px-6 pb-32 pt-4">
        {/* Header Section */}
        <header className="mb-12">
          <h1 className="text-4xl md:text-6xl font-black text-text-primary tracking-tighter mb-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {greeting}
          </h1>
          <p className="text-text-secondary font-medium text-lg opacity-60 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100">
            Your personal auditory space, refined.
          </p>
        </header>

        {libraryTracks.length > 0 ? (
          <div className="space-y-16">
            {/* Quick Mix Section (The 'visionary' grid) */}
            <section>
              <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2 px-1">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                Quick Discovery
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentlyAdded.slice(0, 6).map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => setQueue(recentlyAdded, idx)}
                    className="group relative bg-white/[0.02] hover:bg-white/[0.07] border border-white/5 rounded-2xl overflow-hidden flex items-center transition-all duration-500 cursor-pointer shadow-sm hover:shadow-2xl hover:-translate-y-0.5"
                  >
                    <div className="w-20 h-20 flex-shrink-0">
                      <TrackCover
                        coverUrl={item.coverUrl}
                        coverBlob={item.coverBlob}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 px-4">
                      <p className="text-text-primary font-bold text-sm truncate group-hover:text-accent transition-colors">
                        {item.title}
                      </p>
                      <p className="text-text-secondary text-[10px] truncate uppercase tracking-widest font-bold opacity-40 mt-0.5">
                        {item.artist}
                      </p>
                    </div>
                    <div className="pr-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-x-2 group-hover:translate-x-0">
                      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-lg">
                        <Play size={14} className="fill-primary text-primary ml-0.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Jump Back In Section */}
            <section>
              <div className="flex items-center justify-between mb-6 px-1">
                <h2 className="text-2xl font-black text-text-primary tracking-tight">
                  Jump Back In
                </h2>
                <button 
                  className="text-xs font-bold text-accent uppercase tracking-widest hover:opacity-80 transition-opacity"
                  onClick={() => onNavigate?.('library')}
                >
                  View Library
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {shuffleMix.map((item, idx) => (
                  <AlbumCard
                    key={item.id}
                    title={item.title}
                    subtitle={item.artist}
                    coverUrl={item.coverUrl || ''}
                    coverBlob={item.coverBlob}
                    showDescription={false}
                    onClick={() => setQueue(shuffleMix, idx)}
                    onPlay={(e) => {
                      e.stopPropagation();
                      setQueue(shuffleMix, idx);
                    }}
                  />
                ))}
              </div>
            </section>
          </div>
        ) : (
          /* ===== Empty State with CTA ===== */
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-1000">
            <div className="relative mb-10">
              <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full" />
              <div className="relative w-32 h-32 bg-white/[0.03] border border-white/10 rounded-[2.5rem] flex items-center justify-center rotate-6 shadow-2xl backdrop-blur-xl">
                <Music2 size={56} className="text-accent -rotate-6" />
              </div>
            </div>
            <h3 className="text-3xl font-black text-text-primary mb-4 tracking-tighter">Start Your Journey</h3>
            <p className="text-text-secondary font-medium max-w-md mb-10 leading-relaxed opacity-70 px-4">
              Connect your cloud architecture to orchestrate your personal auditory library. Supporting Google Drive and Dropbox.
            </p>
            <button
              onClick={() => setShowConnectionManager(true)}
              className="group relative flex items-center gap-4 px-10 py-5 rounded-2xl bg-accent text-primary font-black transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-accent/20 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <Cloud size={24} className="relative z-10" />
              <span className="relative z-10 text-lg">Initialize Sources</span>
            </button>
          </div>
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
