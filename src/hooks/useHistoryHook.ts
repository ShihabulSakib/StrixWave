import { useEffect } from 'react';

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
  // Push state whenever navigation happens internally
  useEffect(() => {
    const currentState = window.history.state;
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
        onNavigate(state.tab, state.playlistId || null);
      } else {
        // If we hit the beginning of our pushed history, default to home
        onNavigate('home', null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onNavigate]);
}

/**
 * useOverlayHistory
 * 
 * Specialized hook for drawers/modals to ensure the back button 
 * closes the overlay before navigating away from the page.
 */
export function useOverlayHistory(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    // Push a temporary state to "capture" the next back button press
    window.history.pushState({ overlayOpen: true }, '');

    const handlePopState = (event: PopStateEvent) => {
      // If the back button is pressed, close the overlay
      onClose();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // If closed via UI, clean up the dummy state
      if (window.history.state?.overlayOpen) {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);
}
