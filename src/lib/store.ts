import { create } from 'zustand';

interface AgentUIState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  toggleSidebar: () => void;
  setMobileMenu: (open: boolean) => void;
}

export const useAgentUI = create<AgentUIState>((set) => ({
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileMenu: (open) => set({ mobileMenuOpen: open }),
}));
