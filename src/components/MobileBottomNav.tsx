import React from 'react';
import { navItems } from '../lib/navItems';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-[calc(4rem+env(safe-area-inset-bottom,0px))] bg-surface/95 backdrop-blur-md border-t border-divider flex items-center justify-around px-2 z-50 md:hidden pb-[env(safe-area-inset-bottom,0px)]">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onTabChange(item.id)}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-200 ${
            activeTab === item.id
              ? 'text-accent'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <item.icon size={22} className={activeTab === item.id ? 'fill-current' : ''} />
          <span className="text-[10px] font-medium tracking-tight truncate max-w-full">
            {item.label === 'Your Library' ? 'Library' : item.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default MobileBottomNav;
