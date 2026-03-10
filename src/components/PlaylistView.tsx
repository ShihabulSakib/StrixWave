import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  Pause,
  Heart,
  Clock,
  MoreHorizontal,
  Download,
  Loader2,
  Cloud,
  Music2,
} from 'lucide-react';
import { List } from 'react-window';
import TopNav from './TopNav';
import TrackCover from './TrackCover';
import ConnectionManager from './ConnectionManager';
import { usePlayer, type Track } from '../context/PlayerContext';
import { getAllTracks } from '../services/db';

// Playlist header data (inlined, no mockData dependency)
const playlistHeader = {
  coverUrl: 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300&h=300&fit=crop',
  title: 'Midnight Vibes',
  description: 'Chill beats for late night coding sessions',
  owner: 'Midnight Stream',
};

const ROW_HEIGHT = 56; // px per track row
const HEADER_THRESHOLD = 360; // px reserved for header/action bar before list

// Data props we pass through rowProps (react-window injects index, style, ariaAttributes)
interface TrackRowDataProps {
  displayTracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  hoveredTrack: string | null;
  handleTrackClick: (index: number) => void;
  setHoveredTrack: (id: string | null) => void;
}

const TrackRow = ({
  index,
  style,
  displayTracks,
  currentTrack,
  isPlaying,
  isBuffering,
  hoveredTrack,
  handleTrackClick,
  setHoveredTrack,
}: {
  index: number;
  style: React.CSSProperties;
  ariaAttributes: Record<string, unknown>;
} & TrackRowDataProps) => {
  const track = displayTracks[index];
  if (!track) return null;
  const isActive = currentTrack?.id === track.id;

  return (
    <div
      style={style}
      className={`group flex items-center md:grid md:grid-cols-[auto_1fr_1fr_auto] gap-3 md:gap-4 px-2 md:px-4 py-1.5 rounded-md hover:bg-surface-hover transition-colors cursor-pointer ${
        isActive ? 'bg-surface-hover' : ''
      }`}
      onClick={() => handleTrackClick(index)}
      onMouseEnter={() => setHoveredTrack(track.id)}
      onMouseLeave={() => setHoveredTrack(null)}
    >
      {/* Number / Play Icon */}
      <div className="hidden md:flex w-8 items-center justify-center text-text-secondary">
        {isActive && isBuffering ? (
          <Loader2 size={16} className="animate-spin text-accent" />
        ) : isActive && isPlaying ? (
          <div className="w-4 h-4 flex items-center justify-center gap-0.5">
            <div className="w-1 h-3 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-4 bg-accent rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        ) : hoveredTrack === track.id ? (
          <Play size={16} className="fill-current text-text-primary" />
        ) : (
          <span className={isActive ? 'text-accent' : ''}>{index + 1}</span>
        )}
      </div>

      {/* Title & Artist */}
      <div className="flex items-center gap-3 min-w-0 flex-1 md:flex-none">
        <TrackCover
          coverUrl={track.coverUrl}
          coverBlob={track.coverBlob}
          alt={track.title}
          className="w-12 h-12 md:w-10 md:h-10 rounded object-cover"
        />
        <div className="min-w-0">
          <p className={`font-medium truncate ${isActive ? 'text-accent' : 'text-text-primary'}`}>
            {track.title}
          </p>
          <p className="text-text-secondary text-sm truncate">
            {track.artist}
          </p>
        </div>
      </div>

      {/* Album */}
      <div className="hidden md:flex items-center text-text-secondary text-sm truncate">
        {track.album}
      </div>

      {/* Duration & Actions */}
      <div className="flex items-center justify-end gap-2 md:gap-4 text-text-secondary text-sm ml-auto">
        <button
          className="opacity-0 group-hover:opacity-100 text-text-primary hover:text-accent transition-all hidden md:block"
          onClick={(e) => e.stopPropagation()}
        >
          <Heart size={16} />
        </button>
        <span className="w-10 text-right hidden md:block">{track.duration}</span>
        <button
          className="text-text-secondary hover:text-text-primary transition-all p-2 md:p-0 md:opacity-0 md:group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal size={20} className="md:w-4 md:h-4" />
        </button>
      </div>
    </div>
  );
};

export const PlaylistView: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    togglePlay,
    playTrack,
    setQueue,
  } = usePlayer();

  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null);
  const [libraryTracks, setLibraryTracks] = useState<Track[]>([]);
  const [showConnectionManager, setShowConnectionManager] = useState(false);
  const [containerHeight, setContainerHeight] = useState(400);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load tracks from IndexedDB on mount
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
          setLibraryTracks(mapped);
        }
      } catch (err) {
        console.error('[PlaylistView] Failed to load library:', err);
      }
    };
    loadLibrary();
  }, []);

  // Measure available height for virtualized list
  useEffect(() => {
    const measure = () => {
      const vh = window.innerHeight;
      // Account for player bar (80px) + mobile nav (64px on mobile) + header area
      const isMobile = window.innerWidth < 768;
      const bottomOffset = isMobile ? 144 : 80;
      setContainerHeight(Math.max(200, vh - HEADER_THRESHOLD - bottomOffset));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const displayTracks = libraryTracks;

  const handleTrackClick = useCallback(
    (index: number) => {
      setQueue(displayTracks, index);
    },
    [displayTracks, setQueue]
  );

  const handlePlayAll = useCallback(() => {
    if (displayTracks.length > 0) {
      setQueue(displayTracks, 0);
    }
  }, [displayTracks, setQueue]);

  // Row props to pass to the virtualized list
  const rowProps = {
    displayTracks,
    currentTrack,
    isPlaying,
    isBuffering,
    hoveredTrack,
    handleTrackClick,
    setHoveredTrack,
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Playlist Header */}
      <div className="relative bg-gradient-to-b from-blue-900/50 to-primary">
        <TopNav />

        <div className="px-6 pb-8 pt-4 flex flex-col md:flex-row items-end gap-6">
          {/* Playlist Cover */}
          <div className="w-52 h-52 flex-shrink-0 shadow-2xl">
            <img
              src={playlistHeader.coverUrl}
              alt="My Library"
              className="w-full h-full object-cover rounded-md"
            />
          </div>

          {/* Playlist Info */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              Your Dropbox Library
            </span>
            <h1 className="text-5xl font-bold text-text-primary">
              My Library
            </h1>
            <p className="text-text-secondary">
              Synced from Dropbox
            </p>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span className="text-text-primary font-semibold">Strixwave</span>
              <span>•</span>
              <span>{displayTracks.length} songs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-6 py-6 flex items-center gap-6">
        <button
          onClick={handlePlayAll}
          className="w-14 h-14 rounded-full bg-accent flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
        >
          {isPlaying ? (
            <Pause size={28} className="fill-primary text-primary" />
          ) : (
            <Play size={28} className="fill-primary text-primary ml-1" />
          )}
        </button>
        <button className="text-text-secondary hover:text-text-primary transition-colors">
          <Heart size={28} />
        </button>
        <button className="text-text-secondary hover:text-text-primary transition-colors">
          <MoreHorizontal size={24} />
        </button>
        <button className="text-text-secondary hover:text-text-primary transition-colors ml-auto">
          <Download size={20} />
        </button>
      </div>

      {/* Track List */}
      <div className="px-6 pb-8" ref={containerRef}>
        {displayTracks.length > 0 ? (
          <>
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-4 py-2 text-text-secondary text-sm border-b border-divider mb-2">
              <span>#</span>
              <span>Title</span>
              <span>Album</span>
              <span className="text-right">
                <Clock size={16} />
              </span>
            </div>

            {/* Virtualized Track List */}
            <List<TrackRowDataProps>
              rowComponent={TrackRow}
              rowCount={displayTracks.length}
              rowHeight={ROW_HEIGHT}
              rowProps={rowProps}
              overscanCount={10}
              style={{ height: containerHeight, width: '100%' }}
            />
          </>
        ) : (
          /* ===== Empty State with CTA ===== */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6">
              <Music2 size={36} className="text-accent" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Your library is empty</h3>
            <p className="text-text-secondary max-w-sm mb-8">
              Connect your Dropbox account and sync your music to start streaming your personal library.
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

      {/* Connection Manager Modal */}
      <ConnectionManager
        isOpen={showConnectionManager}
        onClose={() => setShowConnectionManager(false)}
      />
    </div>
  );
};

export default PlaylistView;
