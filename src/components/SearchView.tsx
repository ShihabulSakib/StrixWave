import React, { useState, useMemo, useEffect } from 'react';
import { Search as SearchIcon, Play, Clock, Loader2, Music2, Heart, ListMusic } from 'lucide-react';
import TopNav from './TopNav';
import TrackCover from './TrackCover';
import { usePlayer, type Track } from '../context/PlayerContext';
import { usePlaylists } from '../context/PlaylistContext';
import { getAllTracks, getTracksByIds } from '../services/db';

// --- Standalone PlaylistCover Component (Moved outside to prevent flickering) ---
const PlaylistCover = React.memo(({ playlist }: { playlist: any }) => {
  const isLikedSongs = playlist.id === 'liked-songs';
  const [firstTrackArt, setFirstTrackArt] = useState<{ url?: string, blob?: Blob } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isLikedSongs || playlist.trackIds.length === 0) {
      setIsLoaded(true);
      return;
    }
    
    const loadFirstArt = async () => {
      try {
        const tracks = await getTracksByIds([playlist.trackIds[0]]);
        if (tracks.length > 0) {
          setFirstTrackArt({ url: tracks[0].coverUrl, blob: tracks[0].coverBlob });
        }
      } catch (err) {
        console.error('[PlaylistCover] Failed to load art:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadFirstArt();
  }, [playlist.id, playlist.trackIds, isLikedSongs]);

  // Gradient based on name (stable)
  const gradientStyle = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < playlist.name.length; i++) {
      hash = playlist.name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h1 = Math.abs(hash % 360);
    const h2 = (h1 + 60) % 360;
    return {
      background: `linear-gradient(135deg, hsl(${h1}, 60%, 50%) 0%, hsl(${h2}, 70%, 30%) 100%)`,
    };
  }, [playlist.name]);

  const hasArt = firstTrackArt?.url || firstTrackArt?.blob;

  return (
    <div className={`aspect-square w-full rounded-lg mb-4 overflow-hidden shadow-lg flex items-center justify-center relative transition-transform group-hover:scale-105 duration-500 ${
      isLikedSongs ? 'bg-gradient-to-br from-indigo-600 to-purple-400' : ''
    }`} style={!isLikedSongs && !hasArt ? gradientStyle : {}}>
      
      {!isLoaded ? (
        <div className="absolute inset-0 bg-white/5 animate-pulse" />
      ) : isLikedSongs ? (
        <Heart size={40} className="text-white drop-shadow-md" fill="currentColor" />
      ) : hasArt ? (
        <TrackCover 
          coverUrl={firstTrackArt?.url} 
          coverBlob={firstTrackArt?.blob} 
          alt={playlist.name} 
          className="w-full h-full object-cover" 
        />
      ) : (
        <div className="flex flex-col items-center gap-2 opacity-60">
          <Music2 size={40} className="text-white/80" />
        </div>
      )}

      {/* Play Overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-accent shadow-xl flex items-center justify-center scale-90 group-hover:scale-100 transition-transform duration-300">
          <Play size={20} className="fill-primary text-primary ml-1" />
        </div>
      </div>
    </div>
  );
});

PlaylistCover.displayName = 'PlaylistCover';

export const SearchView: React.FC = () => {
  const { searchQuery, setSearchQuery, currentTrack, isPlaying, setQueue } = usePlayer();
  const { allPlaylists } = usePlaylists();
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
        } else {
          setLibraryTracks([]);
        }
      } catch (err) {
        console.error('[SearchView] Failed to load library:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadLibrary();

    // Listen for library sync events to refresh search
    window.addEventListener('library-synced', loadLibrary);
    return () => window.removeEventListener('library-synced', loadLibrary);
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

  // Filter playlists based on search query
  const filteredPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allPlaylists.filter((p) => p.name.toLowerCase().includes(query));
  }, [searchQuery, allPlaylists]);

  const handleTrackClick = (track: Track, results: Track[], index: number) => {
    setQueue(results, index);
    setShowResults(true);
  };

  const handleSearchFocus = () => {
    setShowResults(true);
  };

  const handleSearchBlur = () => {
    setTimeout(() => {
      if (!searchQuery) {
        setShowResults(false);
      }
    }, 200);
  };

  // Helper to find which playlists a track belongs to
  const getTrackPlaylists = (trackId: string) => {
    return allPlaylists.filter(p => p.trackIds.includes(trackId));
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <TopNav />

      <div className="px-6 pb-24">
        {/* Search Bar - Added top spacing and removed amber glow */}
        <div className="mt-8 mb-10">
          <div className="relative max-w-xl mx-auto">
            <SearchIcon
              size={20}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <input
              type="text"
              placeholder="Songs, artists, or playlists"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              className="w-full bg-white/[0.03] text-text-primary placeholder-text-secondary/60 pl-14 pr-6 py-4 rounded-full focus:outline-none focus:bg-white/10 transition-all text-lg border border-white/5 shadow-inner"
            />
          </div>
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="space-y-10 animate-fade-in">
            {/* Playlist Results */}
            {filteredPlaylists.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-text-primary mb-4 px-2 flex items-center gap-2">
                  <ListMusic size={20} className="text-accent" />
                  Playlists
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                  {filteredPlaylists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className="group cursor-pointer bg-white/[0.02] border border-white/5 p-4 rounded-2xl transition-all duration-500 hover:bg-white/[0.06] hover:border-white/10 hover:-translate-y-1 shadow-sm hover:shadow-2xl"
                    >
                      <PlaylistCover playlist={playlist} />
                      <h3 className="font-bold text-text-primary truncate text-base mb-1 tracking-tight">
                        {playlist.name}
                      </h3>
                      <p className="text-xs text-text-secondary truncate font-bold uppercase tracking-widest opacity-40">
                        {playlist.trackIds.length} tracks
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Track Results */}
            <section>
              <h2 className="text-xl font-bold text-text-primary mb-4 px-2 flex items-center gap-2">
                <Music2 size={20} className="text-accent" />
                Songs
              </h2>
              {filteredTracks.length === 0 ? (
                <div className="text-center py-12 bg-white/[0.02] rounded-2xl border border-white/5">
                  <p className="text-text-secondary text-lg">
                    No songs found for <span className="text-accent">"{searchQuery}"</span>
                  </p>
                </div>
              ) : (
                <div className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden">
                  <div className="hidden md:grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-6 py-3 text-text-secondary text-[11px] font-bold uppercase tracking-wider border-b border-white/5">
                    <span className="w-8 text-center">#</span>
                    <span>Title / Playlists</span>
                    <span>Album</span>
                    <span className="text-right pr-4"><Clock size={14} /></span>
                  </div>

                  <div className="divide-y divide-white/5">
                    {filteredTracks.map((track, index) => {
                      const trackPlaylists = getTrackPlaylists(track.id);
                      return (
                        <div
                          key={track.id}
                          onClick={() => handleTrackClick(track, filteredTracks, index)}
                          className={`group grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_1fr_auto] gap-4 px-4 md:px-6 py-3 hover:bg-white/[0.05] transition-all cursor-pointer items-center ${
                            currentTrack?.id === track.id ? 'bg-white/[0.08]' : ''
                          }`}
                        >
                          <div className="w-8 flex items-center justify-center text-text-secondary text-xs">
                            {currentTrack?.id === track.id && isPlaying ? (
                              <div className="flex items-center gap-0.5 h-3">
                                <div className="w-0.5 h-full bg-accent animate-music-bar" style={{ animationDelay: '0ms' }} />
                                <div className="w-0.5 h-full bg-accent animate-music-bar" style={{ animationDelay: '150ms' }} />
                                <div className="w-0.5 h-full bg-accent animate-music-bar" style={{ animationDelay: '300ms' }} />
                              </div>
                            ) : (
                              <span className="group-hover:hidden">{index + 1}</span>
                            )}
                            <Play size={12} className="hidden group-hover:block fill-current text-accent" />
                          </div>

                          <div className="flex items-center gap-4 min-w-0">
                            <TrackCover
                              coverUrl={track.coverUrl}
                              coverBlob={track.coverBlob}
                              alt={track.title}
                              size="sm"
                              className="w-10 h-10 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p className={`font-semibold truncate ${currentTrack?.id === track.id ? 'text-accent' : 'text-text-primary'}`}>
                                {track.title}
                              </p>
                              <div className="text-[11px] text-text-secondary truncate mt-0.5 flex flex-wrap items-center gap-x-1">
                                <span className="font-medium">{track.artist}</span>
                                {trackPlaylists.length > 0 && (
                                  <>
                                    <span className="opacity-30">•</span>
                                    <span className="text-accent/80 font-bold bg-accent/10 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                      {trackPlaylists.map(p => p.name).join(', ')}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="hidden md:flex items-center text-text-secondary text-sm truncate opacity-70">
                            {track.album}
                          </div>

                          <div className="flex items-center justify-end text-text-secondary text-xs font-mono pr-2">
                            {track.duration}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Playlists View - Show when no search query */}
        {!searchQuery && (
          <section className="animate-fade-in">
            <div className="flex items-center justify-between mb-8 px-1">
              <h1 className="text-3xl font-black text-text-primary tracking-tighter flex items-center gap-3">
                <div className="w-2 h-8 bg-accent rounded-full" />
                Library Architecture
              </h1>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {allPlaylists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="group cursor-pointer bg-white/[0.02] border border-white/5 p-4 rounded-2xl transition-all duration-500 hover:bg-white/[0.06] hover:border-white/10 hover:-translate-y-1 shadow-sm hover:shadow-2xl"
                >
                  <PlaylistCover playlist={playlist} />
                  <h3 className="font-bold text-text-primary truncate text-base mb-1 tracking-tight">
                    {playlist.name}
                  </h3>
                  <p className="text-xs text-text-secondary truncate font-bold uppercase tracking-widest opacity-40">
                    {playlist.trackIds.length} tracks
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default SearchView;
