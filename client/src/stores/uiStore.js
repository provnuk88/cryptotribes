import { create } from 'zustand';

export const useUIStore = create((set) => ({
  // Modal state
  activeModal: null,
  modalData: null,

  // Panel state
  activePanel: null,
  panelData: null,

  // Toast notifications
  toasts: [],

  // Loading states
  globalLoading: false,
  loadingMessage: null,

  // Sidebar
  sidebarOpen: true,

  // Battle animation
  showBattleAnimation: false,
  battleAnimationData: null,

  // Modal actions
  openModal: (modalType, data = null) => {
    set({ activeModal: modalType, modalData: data });
  },

  closeModal: () => {
    set({ activeModal: null, modalData: null });
  },

  // Panel actions
  openPanel: (panelType, data = null) => {
    set({ activePanel: panelType, panelData: data });
  },

  closePanel: () => {
    set({ activePanel: null, panelData: null });
  },

  // Toast actions
  addToast: (toast) => {
    const id = Date.now();
    const newToast = {
      id,
      type: 'info',
      duration: 5000,
      ...toast,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-remove toast after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, newToast.duration);
    }

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAllToasts: () => {
    set({ toasts: [] });
  },

  // Helper toast methods
  showSuccess: (message, title = 'Success') => {
    const { addToast } = useUIStore.getState();
    addToast({ type: 'success', title, message });
  },

  showError: (message, title = 'Error') => {
    const { addToast } = useUIStore.getState();
    addToast({ type: 'error', title, message, duration: 8000 });
  },

  showWarning: (message, title = 'Warning') => {
    const { addToast } = useUIStore.getState();
    addToast({ type: 'warning', title, message });
  },

  showInfo: (message, title = 'Info') => {
    const { addToast } = useUIStore.getState();
    addToast({ type: 'info', title, message });
  },

  // Loading actions
  setGlobalLoading: (loading, message = null) => {
    set({ globalLoading: loading, loadingMessage: message });
  },

  // Sidebar actions
  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setSidebarOpen: (open) => {
    set({ sidebarOpen: open });
  },

  // Battle animation actions
  playBattleAnimation: (data) => {
    set({ showBattleAnimation: true, battleAnimationData: data });
  },

  closeBattleAnimation: () => {
    set({ showBattleAnimation: false, battleAnimationData: null });
  },
}));
