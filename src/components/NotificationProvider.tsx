import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, Info, AlertCircle, Loader2 } from 'lucide-react';

type NotificationType = 'success' | 'info' | 'error' | 'loading';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  showNotification: (message: string, type?: NotificationType) => void;
  success: (message: string) => void;
  info: (message: string) => void;
  error: (message: string) => void;
  loading: (message: string) => string;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);

    if (type !== 'loading') {
      setTimeout(() => dismiss(id), 4000);
    }
    return id;
  }, [dismiss]);

  const success = (message: string) => showNotification(message, 'success');
  const info = (message: string) => showNotification(message, 'info');
  const error = (message: string) => showNotification(message, 'error');
  const loading = (message: string) => showNotification(message, 'loading');

  return (
    <NotificationContext.Provider value={{ showNotification, success, info, error, loading, dismiss }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg border shadow-2xl backdrop-blur-md animate-in slide-in-from-top duration-300
              ${n.type === 'success' ? 'bg-[#0A192F]/80 border-[#FFB100]/40 text-text-primary' : ''}
              ${n.type === 'info' ? 'bg-[#0A192F]/80 border-white/10 text-text-primary' : ''}
              ${n.type === 'error' ? 'bg-red-950/80 border-red-500/40 text-red-200' : ''}
              ${n.type === 'loading' ? 'bg-[#0A192F]/80 border-[#FFB100]/20 text-text-primary' : ''}
            `}
          >
            <div className="flex-shrink-0">
              {n.type === 'success' && <CheckCircle size={18} className="text-[#FFB100]" />}
              {n.type === 'info' && <Info size={18} className="text-blue-400" />}
              {n.type === 'error' && <AlertCircle size={18} className="text-red-400" />}
              {n.type === 'loading' && <Loader2 size={18} className="text-[#FFB100] animate-spin" />}
            </div>
            <p className="flex-1 text-sm font-medium">{n.message}</p>
            <button
              onClick={() => dismiss(n.id)}
              className="p-1 hover:bg-white/5 rounded-full transition-colors text-text-secondary"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
