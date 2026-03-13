import React, { useState, useEffect } from 'react';
import { Cloud, Menu } from 'lucide-react';
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
        {/* Navigation & Mobile Menu */}
        <div className="flex items-center gap-2">
          <button 
            className="md:hidden w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary transition-all"
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-nav'))}
          >
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
              <Menu size={18} />
            </div>
          </button>
          {title && <h1 className="text-lg font-bold text-text-primary ml-2">{title}</h1>}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Manage Sources button — visible on all viewports */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setTimeout(() => setShowConnectionManager(true), 50);
            }}
            className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-text-secondary hover:text-accent hover:scale-105 transition-all"
            title="Manage Cloud Sources"
          >
            <Cloud size={18} />
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
