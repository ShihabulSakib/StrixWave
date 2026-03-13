import React, { useState, useMemo, useEffect } from 'react';
import { Search as SearchIcon, Play, Clock, Loader2 } from 'lucide-react';
import TopNav from './TopNav';
import TrackCover from './TrackCover';
import TrackRow from './shared/TrackRow';
import { usePlayer, type Track } from '../context/PlayerContext';
import { getAllTracks } from '../services/db';

// Browse categories (inlined — no mockData dependency)
const categories = [
  { id: '1', name: 'Pop', color: 'from-pink-500 to-rose-500' },
  { id: '2', name: 'Hip-Hop', color: 'from-orange-500 to-amber-600' },
  { id: '3', name: 'Electronic', color: 'from-cyan-500 to-blue-600' },
  { id: '4', name: 'Rock', color: 'from-red-600 to-orange-500' },
  { id: '5', name: 'Jazz', color: 'from-amber-400 to-yellow-600' },
  { id: '6', name: 'Classical', color: 'from-violet-500 to-purple-600' },
  { id: '7', name: 'Indie', color: 'from-teal-400 to-cyan-500' },
  { id: '8', name: 'R&B', color: 'from-fuchsia-500 to-pink-600' },
  { id: '9', name: 'Metal', color: 'from-slate-700 to-slate-900' },
  { id: '10', name: 'Country', color: 'from-amber-600 to-yellow-500' },
  { id: '11', name: 'Soul', color: 'from-purple-500 to-violet-600' },
  { id: '12', name: 'Reggae', color: 'from-green-500 to-emerald-600' },
];

export const SearchView: React.FC = () => {
  const { searchQuery, setSearchQuery, playTrack, currentTrack, isPlaying, setQueue, isBuffering } = usePlayer();
  const [showResults, setShowResults] = useState(false);
  const [libraryTracks, setLibraryTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load tracks from IndexedDB on mount
  useEffect(() => {
    const loadLibrary = async () => {
      setIsLoading(true);
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
        }
      } catch (err) {
        console.error('[SearchView] Failed to load library:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadLibrary();
  }, []);

  // Filter tracks based on search query
  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return libraryTracks.filter(
      (track) =>
        track.title.toLowerCase().includes(query) ||
        track.artist.toLowerCase().includes(query) ||
        track.album.toLowerCase().includes(query)
    );
  }, [searchQuery, libraryTracks]);

  const handleTrackClick = (track: Track, index: number) => {
    setQueue(filteredTracks, index);
    setShowResults(true);
  };

  const handleSearchFocus = () => {
    setShowResults(true);
  };

  const handleSearchBlur = () => {
    // Delay hiding to allow click on results
    setTimeout(() => {
      if (!searchQuery) {
        setShowResults(false);
      }
    }, 200);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <TopNav />

      <div className="px-6 pb-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <SearchIcon
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <input
              type="text"
              placeholder="What do you want to listen to?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              className="w-full bg-surface-hover text-text-primary placeholder-text-secondary pl-12 pr-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
            />
          </div>
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-text-primary mb-4">
              {filteredTracks.length > 0 ? 'Tracks' : 'Search Results'}
            </h2>

            {filteredTracks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-text-secondary text-lg">
                  No results found for{' '}
                  <span className="text-accent font-semibold">"{searchQuery}"</span>
                </p>
                <p className="text-text-secondary text-sm mt-2">
                  Please try searching with different keywords
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Table Header */}
                <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-4 py-2 text-text-secondary text-sm border-b border-divider">
                  <span>#</span>
                  <span>Title</span>
                  <span>Album</span>
                  <span className="text-right">
                    <Clock size={16} />
                  </span>
                </div>

                {/* Track Rows */}
                {filteredTracks.map((track, index) => (
                  <div
                    key={track.id}
                    onClick={() => handleTrackClick(track, index)}
                    className={`group grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-4 py-2 rounded-md hover:bg-surface-hover transition-colors cursor-pointer ${
                      currentTrack?.id === track.id ? 'bg-surface-hover' : ''
                    }`}
                  >
                    {/* Number / Play Icon */}
                    <div className="w-8 flex items-center justify-center text-text-secondary">
                      {currentTrack?.id === track.id && isPlaying ? (
                        <div className="w-4 h-4 flex items-center justify-center">
                          <div className="w-1 h-3 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                          <div className="w-1 h-4 bg-accent rounded-full animate-pulse mx-0.5" style={{ animationDelay: '150ms' }} />
                          <div className="w-1 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : (
                        <span className="group-hover:hidden">{index + 1}</span>
                      )}
                      {currentTrack?.id !== track.id && (
                        <Play size={14} className="hidden group-hover:block fill-current" />
                      )}
                    </div>

                    {/* Title & Artist */}
                    <div className="flex items-center gap-3 min-w-0">
                      <TrackCover
                        coverUrl={track.coverUrl}
                        coverBlob={track.coverBlob}
                        alt={track.title}
                        className="w-10 h-10 rounded object-cover"
                      />
                      <div className="min-w-0">
                        <p className={`font-medium truncate ${currentTrack?.id === track.id ? 'text-accent' : 'text-text-primary'}`}>
                          {track.title}
                        </p>
                        <p className="text-text-secondary text-sm truncate">{track.artist}</p>
                      </div>
                    </div>

                    {/* Album */}
                    <div className="flex items-center text-text-secondary text-sm truncate">
                      {track.album}
                    </div>

                    {/* Duration */}
                    <div className="flex items-center justify-end text-text-secondary text-sm">
                      {track.duration}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Browse All - Only show when no search query */}
        {!searchQuery && (
          <>
            <h1 className="text-3xl font-bold text-text-primary mb-6">Browse All</h1>

            {/* Category Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="group relative aspect-square rounded-md cursor-pointer overflow-hidden hover:scale-[1.02] transition-transform duration-300"
                >
                  {/* Background Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${category.color}`} />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />

                  {/* Title */}
                  <h2 className="absolute bottom-4 left-4 right-4 text-xl font-bold text-text-primary">
                    {category.name}
                  </h2>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SearchView;
