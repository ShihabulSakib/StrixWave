import React, { useState, useEffect, useCallback } from 'react';
import { X, User, Settings, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useOverlayHistory } from '../hooks/useHistoryHook';

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onTabChange }) => {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const handleToggle = () => setIsNavOpen(prev => !prev);
    window.addEventListener('toggle-mobile-nav', handleToggle);
    return () => window.removeEventListener('toggle-mobile-nav', handleToggle);
  }, []);

  const closeNav = useCallback(() => setIsNavOpen(false), []);

  useOverlayHistory(isNavOpen, closeNav);

  if (!isNavOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-[#0A192F]/60 z-[60] md:hidden backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={closeNav}
      />

      {/* Drawer */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="fixed top-0 left-0 bottom-0 w-72 bg-[#0A192F] z-[70] md:hidden flex flex-col border-r border-[#FFB100]/10 shadow-2xl animate-in slide-in-from-left duration-300 will-change-transform pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-black/20 pt-[calc(1.25rem+env(safe-area-inset-top,0px))]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FFB100] flex items-center justify-center text-[#0A192F]">
              <User size={18} />
            </div>
            <span className="font-bold text-lg tracking-tight text-text-primary">Account</span>
          </div>
          <button 
            onClick={closeNav}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-[#FFB100] hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-8">
          {/* User Profile Section */}
          <div className="space-y-4">
            <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/5">
              <p className="text-xs text-text-secondary uppercase tracking-wider font-bold mb-1">Account Status</p>
              <p className="text-text-primary font-medium truncate">
                {isAuthenticated ? 'Authenticated' : 'Guest Mode'}
              </p>
            </div>
            
            <div className="space-y-1">
              <button className="flex items-center gap-4 w-full px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-lg transition-colors">
                <ShieldCheck size={20} />
                <span className="text-sm">Security & Privacy</span>
              </button>
              <button className="flex items-center gap-4 w-full px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-lg transition-colors">
                <Settings size={20} />
                <span className="text-sm">App Settings</span>
              </button>
            </div>
          </div>

          {/* Logout Section */}
          <div className="pt-4 border-t border-white/5">
            <button 
              onClick={() => {
                logout();
                closeNav();
              }}
              className="flex items-center gap-4 w-full px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
        
        <div className="p-6 border-t border-white/5 bg-black/10">
          <p className="text-[10px] text-text-secondary text-center uppercase tracking-widest">Strixwave v1.0.4</p>
        </div>
      </div>
    </>
  );
};

export default MobileNav;
