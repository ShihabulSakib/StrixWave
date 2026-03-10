import React, { useState, useEffect } from 'react';
import { X, Cloud, Loader2 } from 'lucide-react';
import { navItems } from '../lib/navItems';
import { useAuth } from '../hooks/useAuth';
import ConnectionManager from './ConnectionManager';
import { useOverlayHistory } from '../hooks/useHistoryHook';

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onTabChange }) => {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [showConnectionManager, setShowConnectionManager] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsNavOpen(prev => !prev);
    window.addEventListener('toggle-mobile-nav', handleToggle);
    return () => window.removeEventListener('toggle-mobile-nav', handleToggle);
  }, []);

  useOverlayHistory(isNavOpen, () => setIsNavOpen(false));

  if (!isNavOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-[#0A192F]/60 z-[60] md:hidden backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={() => setIsNavOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed top-0 left-0 bottom-0 w-72 bg-[#0A192F] z-[70] md:hidden flex flex-col border-r border-[#FFB100]/10 shadow-2xl animate-in slide-in-from-left duration-300 will-change-transform">
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-black/20">
          <span className="font-bold text-lg tracking-tight text-text-primary">Strixwave</span>
          <button 
            onClick={() => setIsNavOpen(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-[#FFB100] hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Navigation Links */}
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  onTabChange(item.id);
                  setIsNavOpen(false);
                }}
                className={`flex items-center gap-4 w-full px-4 py-3 rounded-md transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-[#FFB100]/10 text-[#FFB100] font-bold shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }`}
              >
                <item.icon size={22} className={activeTab === item.id ? 'text-[#FFB100]' : ''} />
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="border-t border-white/5 pt-6 space-y-3">
            <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.15em] pl-1">Storage</h3>
            {authLoading ? (
              <div className="flex items-center gap-3 px-4 py-3 text-text-secondary bg-white/5 rounded-md">
                <Loader2 size={18} className="animate-spin text-[#FFB100]" />
                <span className="text-sm font-medium">Connecting...</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsNavOpen(false);
                  setShowConnectionManager(true);
                }}
                className={`flex items-center gap-3 w-full px-4 py-4 rounded-xl transition-all duration-300 group ${
                  isAuthenticated
                    ? 'bg-[#FFB100]/10 border border-[#FFB100]/20 text-[#FFB100] hover:bg-[#FFB100]/20'
                    : 'bg-[#FFB100] hover:bg-[#FFB100]/90 text-[#0A192F] font-bold shadow-lg shadow-[#FFB100]/20'
                }`}
              >
                <Cloud size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-sm font-bold tracking-tight">
                  {isAuthenticated ? 'Sync Library' : 'Connect Dropbox'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      <ConnectionManager
        isOpen={showConnectionManager}
        onClose={() => setShowConnectionManager(false)}
      />
    </>
  );
};

export default MobileNav;
