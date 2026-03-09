import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Settings, User } from 'lucide-react';

interface TopNavProps {
  title?: string;
}

export const TopNav: React.FC<TopNavProps> = ({ title }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-30 flex items-center justify-between px-4 py-3 transition-all duration-300 ${
        scrolled ? 'bg-primary/95 backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      {/* Navigation Arrows */}
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 rounded-full bg-surface/80 flex items-center justify-center text-text-secondary hover:text-text-primary hover:scale-105 transition-all">
          <ChevronLeft size={20} />
        </button>
        <button className="w-8 h-8 rounded-full bg-surface/80 flex items-center justify-center text-text-secondary hover:text-text-primary hover:scale-105 transition-all">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        <button className="px-4 py-1.5 bg-text-primary text-primary text-sm font-semibold rounded-full hover:scale-105 transition-transform">
          Explore Premium
        </button>
        <button className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-text-secondary hover:text-text-primary hover:scale-105 transition-all">
          <Settings size={18} />
        </button>
        <button className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-primary font-semibold hover:scale-105 transition-transform">
          <User size={16} />
        </button>
      </div>
    </nav>
  );
};

export default TopNav;
