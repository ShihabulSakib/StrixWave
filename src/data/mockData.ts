// Mock data for the Midnight Stream UI
// Contains 12+ tracks for search and playlist functionality

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  durationSeconds: number;
  addedDate: string;
  coverUrl: string;
  audioUrl?: string;
}

export const playlists = [
  {
    id: '1',
    title: 'Midnight Vibes',
    description: 'Chill beats for late night coding sessions',
    coverUrl: 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300&h=300&fit=crop',
    owner: 'Midnight Stream'
  },
  {
    id: '2',
    title: 'Amber Dreams',
    description: 'Smooth jazz and ambient soundscapes',
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
    owner: 'Amber Dreams'
  },
  {
    id: '3',
    title: 'Cobalt Nights',
    description: 'Electronic beats to fuel your workflow',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
    owner: 'Cobalt Beats'
  },
  {
    id: '4',
    title: 'Focus Flow',
    description: 'Deep concentration playlist',
    coverUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
    owner: 'Focus Lab'
  },
  {
    id: '5',
    title: 'Synthwave Mix',
    description: 'Retro futurism vibes',
    coverUrl: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=300&h=300&fit=crop',
    owner: 'Retro Sound'
  },
  {
    id: '6',
    title: 'Lo-Fi Chill',
    description: 'Relaxing beats to study to',
    coverUrl: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=300&h=300&fit=crop',
    owner: 'Lo-Fi Studio'
  }
];

export const madeForYou = [
  {
    id: '1',
    title: 'Daily Mix 1',
    subtitle: 'Midnight Vibes, Amber Dreams and more',
    coverUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=300&h=300&fit=crop'
  },
  {
    id: '2',
    title: 'Daily Mix 2',
    subtitle: 'Cobalt Nights, Focus Flow and more',
    coverUrl: 'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=300&h=300&fit=crop'
  },
  {
    id: '3',
    title: 'Discover Weekly',
    subtitle: 'New music curated for you',
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&h=300&fit=crop'
  },
  {
    id: '4',
    title: 'Release Radar',
    subtitle: 'New releases from artists you follow',
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop'
  },
  {
    id: '5',
    title: 'On Repeat',
    subtitle: 'Songs you love in one place',
    coverUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop'
  }
];

export const recentlyPlayed = [
  {
    id: '1',
    title: 'Chill Lofi',
    description: 'Relaxing beats',
    coverUrl: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=300&h=300&fit=crop'
  },
  {
    id: '2',
    title: 'Electronic Essentials',
    description: 'Best of electronic music',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop'
  },
  {
    id: '3',
    title: 'Jazz Classics',
    description: 'Timeless jazz tracks',
    coverUrl: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=300&h=300&fit=crop'
  },
  {
    id: '4',
    title: 'Ambient Dreams',
    description: 'Atmospheric soundscapes',
    coverUrl: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=300&h=300&fit=crop'
  },
  {
    id: '5',
    title: 'Indie Mix',
    description: 'Fresh indie discoveries',
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop'
  },
  {
    id: '6',
    title: 'Techno Bunker',
    description: 'Dark techno vibes',
    coverUrl: 'https://images.unsplash.com/photo-1574169208507-84376144848b?w=300&h=300&fit=crop'
  }
];

// Enhanced tracks array with 12+ tracks for search and filtering
export const tracks: Track[] = [
  {
    id: '1',
    title: 'Midnight City',
    artist: 'M83',
    album: 'Hurry Up, We\'re Dreaming',
    duration: '4:03',
    durationSeconds: 243,
    addedDate: '2 days ago',
    coverUrl: 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300&h=300&fit=crop',
    audioUrl: 'https://example.com/audio/midnight-city.mp3'
  },
  {
    id: '2',
    title: 'Electric Feel',
    artist: 'MGMT',
    album: 'Oracular Spectacular',
    duration: '4:00',
    durationSeconds: 240,
    addedDate: '3 days ago',
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
    audioUrl: 'https://example.com/audio/electric-feel.mp3'
  },
  {
    id: '3',
    title: 'Neon Lights',
    artist: 'Kraftwerk',
    album: 'The Man-Machine',
    duration: '3:54',
    durationSeconds: 234,
    addedDate: '5 days ago',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
    audioUrl: 'https://example.com/audio/neon-lights.mp3'
  },
  {
    id: '4',
    title: 'Nightcall',
    artist: 'Kavinsky',
    album: 'OutRun',
    duration: '4:18',
    durationSeconds: 258,
    addedDate: '1 week ago',
    coverUrl: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=300&h=300&fit=crop',
    audioUrl: 'https://example.com/audio/nightcall.mp3'
  },
  {
    id: '5',
    title: 'Midnight Sunset',
    artist: 'FM-84',
    album: 'Atlas',
    duration: '4:32',
    durationSeconds: 272,
    addedDate: '1 week ago',
    coverUrl: 'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=300&h=300&fit=crop',
    audioUrl: 'https://example.com/audio/midnight-sunset.mp3'
  },
  {
    id: '6',
    title: 'Crystal Waves',
    artist: 'Bullard',
    album: 'Midnight Memory',
    duration: '3:45',
    durationSeconds: 225,
    addedDate: '2 weeks ago',
    coverUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
    audioUrl: 'https://example.com/audio/crystal-waves.mp3'
  },
  {
    id: '7',
    title: 'Digital Dreams',
    artist: 'Gunship',
    album: 'Gunship',
    duration: '4:21',
    durationSeconds: 261,
    addedDate: '2 weeks ago',
    coverUrl: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=300&h=300&fit=crop',
    audioUrl: 'https://example.com/audio/digital-dreams.mp3'
  },
  {
    id: '8',
    title: 'Amber Glow',
    artist: 'The Midnight',
    album: 'Endless Summer',
    duration: '3:58',
    durationSeconds: 238,
    addedDate: '3 weeks ago',
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
    audioUrl: 'https://example.com/audio/amber-glow.mp3'
  },
  {
    id: '9',
    title: 'Starlight',
    artist: 'Muse',
    album: 'Black Holes',
    duration: '4:09',
    durationSeconds: 249,
    addedDate: '1 month ago',
    coverUrl: 'https://images.unsplash.com/photo-1574169208507-84376144848b?w=300&h=300&fit=crop',
    audioUrl: 'https://example.com/audio/starlight.mp3'
  },
  {
    id: '10',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    album: 'A Night at the Opera',
    duration: '5:55',
    durationSeconds: 355,
    addedDate: '1 month ago',
    coverUrl: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=300&h=300&fit=crop',
    audioUrl: 'https://example.com/audio/bohemian-rhapsody.mp3'
  },
  {
    id: '11',
    title: 'Starboy',
    artist: 'The Weeknd',
    album: 'Starboy',
    duration: '3:50',
    durationSeconds: 230,
    addedDate: '2 months ago',
    coverUrl: 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=300&h=300&fit=crop',
    audioUrl: 'https://example.com/audio/starboy.mp3'
  },
  {
    id: '12',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    duration: '3:20',
    durationSeconds: 200,
    addedDate: '2 months ago',
    coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&h=300&fit=crop',
    audioUrl: 'https://example.com/audio/blinding-lights.mp3'
  }
];

export const categories = [
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
  { id: '12', name: 'Reggae', color: 'from-green-500 to-emerald-600' }
];

// Helper function to filter tracks
export const filterTracks = (query: string): Track[] => {
  if (!query.trim()) return tracks;
  const lowerQuery = query.toLowerCase();
  return tracks.filter(
    track =>
      track.title.toLowerCase().includes(lowerQuery) ||
      track.artist.toLowerCase().includes(lowerQuery) ||
      track.album.toLowerCase().includes(lowerQuery)
  );
};
