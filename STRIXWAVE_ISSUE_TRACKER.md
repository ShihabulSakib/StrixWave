# STRIXWAVE TECHNICAL AUDIT REPORT

## 1. CRITICAL BUGS (LOGICAL/FUNCTIONAL)
| ID | Component | Description | Impact | Priority |
|:---|:---|:---|:---|:---|
| L01 | Audio Engine | **Buffer Bloat / Memory Leak**: `SourceBuffer` in `useAudioEngine.ts` is never cleared via `remove()`. Long tracks or multi-hour sessions will exceed the browser's MSE buffer limit (QuotaExceededError), causing the player to crash or the tab to hang. | High | P0 |
| L02 | AuthService | **Token Refresh Race Condition**: `getAccessToken()` lacks an atomic locking mechanism. Concurrent API requests (e.g., fetching multiple track chunks) during token expiry trigger multiple redundant `fetch` calls to `/oauth2/token`, wasting bandwidth and risking 429/401 errors. | Medium | P1 |
| L03 | Player Context | **Liked Songs Synchronization**: `likedTrackIds` is stored in `localStorage` independent of the IndexedDB `tracks` store. If a track is deleted from the database, its ID remains "orphaned" in the Liked list, causing UI ghosting or null-pointer errors in the Library view. | Medium | P2 |
| L04 | Dropbox Service | **Link Expiration Race**: `isLinkFresh` check happens before `playTrack`, but a link could expire *during* a long track's buffering cycle. The engine does not handle 403 Forbidden errors mid-stream to re-fetch the temporary link automatically. | High | P1 |

## 2. UI/UX BOTTLENECKS (MOBILE & DESKTOP)
| ID | Platform | Issue | Visual Evidence/Description |
|:---|:---|:---|:---|
| U01 | Mobile | **Mini-Player Floating Gap** | `PlayerBar.tsx` uses a fixed `bottom: calc(4rem + ...)` offset. On devices with non-standard `safe-area-inset-bottom` or if `MobileBottomNav` is toggled, a visible 1-2px gap or overlap occurs between the player and the navigation bar. |
| U02 | Mobile | **Your Library Scroll Trap** | The main `App.tsx` container is `overflow-hidden` while `YourLibrary.tsx` is `overflow-y-auto`. On Android Chrome, this results in "Scroll-Jitter" where the browser address bar refuses to hide because the scroll event is trapped in an inner container. |
| U03 | Both | **Glassmorphism Performance Junk** | High `backdrop-blur-lg` (16px+) on `TopNav` and `MobileBottomNav` causes GPU spikes and "Jank" (frame drops) during rapid scrolling on mid-range Android devices. Blur should be reduced to `sm` or `md`. |
| U04 | Desktop | **Queue Drawer Z-Index Collision** | The `Queue` drawer and `MobilePlayerDrawer` both share `z-50`. While they are theoretically viewport-split, a resize event can cause the Queue to overlap the Player controls in tablet mode. |

## 3. REDUNDANCY & BLOAT
- **"Explore Premium" CTA**: Found in `TopNav.tsx` (Line 52). Since Strixwave is a private, self-hosted streaming client, a "Premium" tier is architecturally irrelevant and creates UX confusion.
- **Greeting Logic Overhead**: `getGreeting()` in `HomeView.tsx` recalculates on every render. While cheap, it should be memoized via `useMemo` to prevent unnecessary string operations during library sync updates.
- **Redundant `window.alert`**: (Audit Note: No `window.alert` found, successfully replaced by `NotificationProvider`).
- **Unused Props**: `Sidebar` component accepts `isExpanded` but does not utilize it for width transitions, leading to "dead code" in the styling logic.

## 4. PERFORMANCE & PWA COMPLIANCE
- **Android Back Button**: Correctly implemented via `useOverlayHistory`. However, if the `MobilePlayerDrawer` is closed via a swipe gesture (if implemented later), the history stack will be misaligned as `window.history.back()` is only called on unmount.
- **Lighthouse Scores**: Expected hits on "Accessibility" due to the `VolumeSlider` using raw `input range` without descriptive `aria-label` tags.
- **Metadata Worker**: The worker parses the entire `ArrayBuffer`. For 20MB+ FLAC files, this causes a momentary UI lockup while the main thread waits for the initial `postMessage` handshake.

## 5. RECOMMENDED FIXES
1. **Remediate L01 (Buffer Management)**:
   - Implement a `SourceBuffer.remove(0, currentTime - 30)` call in `useAudioEngine.ts` every 60 seconds to purge played data.
   - Set a hard 50MB limit on the internal `offset` tracker before forcing a buffer reset.
2. **Remediate L02 (Auth Atomic Lock)**:
   - Wrap `refreshAccessToken` in a Promise-based lock:
     ```typescript
     private refreshPromise: Promise<void> | null = null;
     async getAccessToken() {
       if (this.refreshPromise) await this.refreshPromise;
       // ... existing logic
     }
     ```
3. **Remediate U03 (Styling)**:
   - Replace `backdrop-blur-lg` with `backdrop-blur-md` and increase opacity from `/70` to `/85` for better contrast-to-performance ratio.
4. **Remediate U01 (Layout)**:
   - Change `fixed bottom-[calc(4rem+...)]` to a flex-based layout where the `PlayerBar` and `MobileBottomNav` are sibling elements in a vertical flex container, eliminating the need for hardcoded pixel offsets.
