/**
 * navItems.ts — Shared Navigation Items
 *
 * Single source of truth for navigation used by Sidebar.tsx and MobileNav.tsx.
 */

import { Home, Search, Library, type LucideIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
}

export const navItems: NavItem[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'library', icon: Library, label: 'Your Library' },
];
