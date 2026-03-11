import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Settings, User, Cloud, Menu } from 'lucide-react';
import ConnectionManager from './ConnectionManager';

interface TopNavProps {
  title?: string;
}

export const TopNav: React.FC<TopNavProps> = ({ title }) => {
  const [scrolled, setScrolled] = useState(false);
  const [showConnectionManager, setShowConnectionManager] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 transition-all duration-300 bg-[#0A192F]/70 backdrop-blur-md border-b border-white/10"
      >
        {/* Navigation Arrows & Mobile Menu */}
        <div className="flex items-center gap-2">
          <button 
            className="md:hidden w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary transition-all"
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-nav'))}
          >
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
              <User size={18} />
            </div>
          </button>
          <button className="hidden md:flex w-8 h-8 rounded-full bg-surface/80 items-center justify-center text-text-secondary hover:text-text-primary hover:scale-105 transition-all">
            <ChevronLeft size={20} />
          </button>
          <button className="hidden md:flex w-8 h-8 rounded-full bg-surface/80 items-center justify-center text-text-secondary hover:text-text-primary hover:scale-105 transition-all">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          <button className="hidden md:block px-4 py-1.5 bg-text-primary text-primary text-sm font-semibold rounded-full hover:scale-105 transition-transform">
            Explore Premium
          </button>
          {/* Sync button — visible on all viewports including mobile */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Small delay ensures no conflict with other active history listeners
              setTimeout(() => setShowConnectionManager(true), 50);
            }}
            className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-text-secondary hover:text-accent hover:scale-105 transition-all"
            title="Dropbox Sync"
          >
            <Cloud size={18} />
          </button>
          <button className="hidden md:flex w-8 h-8 rounded-full bg-surface items-center justify-center text-text-secondary hover:text-text-primary hover:scale-105 transition-all">
            <Settings size={18} />
          </button>
          <button className="hidden md:flex w-8 h-8 rounded-full bg-accent items-center justify-center text-primary font-semibold hover:scale-105 transition-transform">
            <User size={16} />
          </button>
        </div>
      </nav>

      {/* Connection Manager Modal */}
      <ConnectionManager
        isOpen={showConnectionManager}
        onClose={() => setShowConnectionManager(false)}
      />
    </>
  );
};

export default TopNav;
