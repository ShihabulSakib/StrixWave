import { useEffect, useRef } from 'react';

/**
 * useNavigationHistory
 * 
 * Synchronizes app state with browser history to enable smooth back-button 
 * navigation across all devices.
 */
export function useNavigationHistory(
  activeTab: string,
  selectedPlaylistId: string | null,
  onNavigate: (tab: string, playlistId: string | null) => void
) {
  const onNavigateRef = useRef(onNavigate);

  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  // Push state whenever navigation happens internally
  useEffect(() => {
    const currentState = window.history.state;
    
    // CRITICAL: If an overlay is open, we REPLACE the current state 
    // instead of pushing a new one or doing nothing.
    // This prevents the drawer from "reverting" to the old tab 
    // when it calls history.back() on close.
    if (currentState?.overlayOpen) {
      window.history.replaceState(
        { tab: activeTab, playlistId: selectedPlaylistId },
        ''
      );
      return;
    }

    const isSameState = 
      currentState?.tab === activeTab && 
      currentState?.playlistId === selectedPlaylistId;

    if (!isSameState) {
      window.history.pushState(
        { tab: activeTab, playlistId: selectedPlaylistId },
        ''
      );
    }
  }, [activeTab, selectedPlaylistId]);

  // Listen for back/forward button presses
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state && state.tab) {
        // Navigate to the state stored in history
        onNavigateRef.current(state.tab, state.playlistId || null);
      } else if (state && state.overlayOpen) {
        // Overlay handled by its own component
      } else {
        // If we hit the beginning of our pushed history, default to home
        onNavigateRef.current('home', null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
}

/**
 * useOverlayHistory
 * 
 * Specialized hook for drawers/modals to ensure the back button 
 * closes the overlay before navigating away from the page.
 */
export function useOverlayHistory(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  const isOpenRef = useRef(isOpen);
  
  useEffect(() => {
    onCloseRef.current = onClose;
    isOpenRef.current = isOpen;
  }, [onClose, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // Check if we already have an overlayOpen state at the top 
    // to prevent duplicate pushes in nested situations.
    if (window.history.state?.overlayOpen) {
      // Already captured
    } else {
      window.history.pushState({ overlayOpen: true }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
      // If we're still supposed to be open, and user pressed back
      if (isOpenRef.current) {
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      
      // CRITICAL FIX: Only call history.back() if the current state 
      // is still the overlayOpen state we pushed.
      // We also do this on unmount regardless of whether it was closed via UI
      // to ensure we don't leave 'overlayOpen: true' states in the history 
      // if the component is suddenly unmounted (e.g. during navigation).
      if (window.history.state?.overlayOpen) {
        window.history.back();
      }
    };
  }, [isOpen]);
}
