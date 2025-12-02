import { create } from 'zustand';
import api from '../services/api';

export const useGameStore = create((set, get) => ({
  // Territory state
  territories: [],
  selectedTerritory: null,
  territoriesLoading: false,

  // Tribe state
  tribe: null,
  tribeMembers: [],
  tribeLoading: false,

  // Battle state
  battles: [],
  activeBattle: null,
  battlesLoading: false,

  // Leaderboard
  tribeLeaderboard: [],
  playerLeaderboard: [],
  leaderboardLoading: false,

  // Economy
  economy: null,

  // Error handling
  error: null,

  // Territory actions
  fetchTerritories: async () => {
    try {
      set({ territoriesLoading: true, error: null });
      const { data } = await api.get('/api/territories');
      set({ territories: data.territories, territoriesLoading: false });
    } catch (error) {
      set({
        territoriesLoading: false,
        error: error.response?.data?.message || 'Failed to fetch territories',
      });
    }
  },

  selectTerritory: (territoryId) => {
    const territory = get().territories.find((t) => t.territoryId === territoryId);
    set({ selectedTerritory: territory });
  },

  clearSelectedTerritory: () => {
    set({ selectedTerritory: null });
  },

  attackTerritory: async (territoryId, units, formation) => {
    try {
      set({ battlesLoading: true, error: null });
      const { data } = await api.post(`/api/territories/${territoryId}/attack`, {
        units,
        formation,
      });
      set({ activeBattle: data.battle, battlesLoading: false });
      // Refresh territories after attack
      get().fetchTerritories();
      return data;
    } catch (error) {
      set({
        battlesLoading: false,
        error: error.response?.data?.message || 'Attack failed',
      });
      throw error;
    }
  },

  reinforceTerritory: async (territoryId, units) => {
    try {
      set({ territoriesLoading: true, error: null });
      const { data } = await api.post(`/api/territories/${territoryId}/reinforce`, {
        units,
      });
      set({ territoriesLoading: false });
      get().fetchTerritories();
      return data;
    } catch (error) {
      set({
        territoriesLoading: false,
        error: error.response?.data?.message || 'Reinforcement failed',
      });
      throw error;
    }
  },

  withdrawFromTerritory: async (territoryId, units) => {
    try {
      set({ territoriesLoading: true, error: null });
      const { data } = await api.post(`/api/territories/${territoryId}/withdraw`, {
        units,
      });
      set({ territoriesLoading: false });
      get().fetchTerritories();
      return data;
    } catch (error) {
      set({
        territoriesLoading: false,
        error: error.response?.data?.message || 'Withdrawal failed',
      });
      throw error;
    }
  },

  activateShield: async (territoryId) => {
    try {
      const { data } = await api.post(`/api/territories/${territoryId}/shield`);
      get().fetchTerritories();
      return data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Shield activation failed' });
      throw error;
    }
  },

  // Tribe actions
  fetchTribe: async () => {
    try {
      set({ tribeLoading: true, error: null });
      const { data } = await api.get('/api/tribes/my');
      set({
        tribe: data.tribe,
        tribeMembers: data.members || [],
        tribeLoading: false,
      });
    } catch (error) {
      set({
        tribeLoading: false,
        tribe: null,
        error: error.response?.status === 404 ? null : error.response?.data?.message,
      });
    }
  },

  joinTribe: async (tribeId) => {
    try {
      set({ tribeLoading: true, error: null });
      const { data } = await api.post(`/api/tribes/${tribeId}/join`);
      set({ tribe: data.tribe, tribeLoading: false });
      return data;
    } catch (error) {
      set({
        tribeLoading: false,
        error: error.response?.data?.message || 'Failed to join tribe',
      });
      throw error;
    }
  },

  leaveTribe: async () => {
    try {
      set({ tribeLoading: true, error: null });
      await api.post('/api/tribes/leave');
      set({ tribe: null, tribeMembers: [], tribeLoading: false });
    } catch (error) {
      set({
        tribeLoading: false,
        error: error.response?.data?.message || 'Failed to leave tribe',
      });
      throw error;
    }
  },

  // Battle actions
  fetchBattles: async () => {
    try {
      set({ battlesLoading: true, error: null });
      const { data } = await api.get('/api/battles');
      set({ battles: data.battles, battlesLoading: false });
    } catch (error) {
      set({
        battlesLoading: false,
        error: error.response?.data?.message || 'Failed to fetch battles',
      });
    }
  },

  fetchBattleById: async (battleId) => {
    try {
      set({ battlesLoading: true, error: null });
      const { data } = await api.get(`/api/battles/${battleId}`);
      set({ activeBattle: data.battle, battlesLoading: false });
      return data.battle;
    } catch (error) {
      set({
        battlesLoading: false,
        error: error.response?.data?.message || 'Failed to fetch battle',
      });
      throw error;
    }
  },

  // Leaderboard actions
  fetchLeaderboard: async () => {
    try {
      set({ leaderboardLoading: true, error: null });
      const [tribeRes, playerRes] = await Promise.all([
        api.get('/api/leaderboard/tribes'),
        api.get('/api/leaderboard/players'),
      ]);
      set({
        tribeLeaderboard: tribeRes.data.leaderboard,
        playerLeaderboard: playerRes.data.leaderboard,
        leaderboardLoading: false,
      });
    } catch (error) {
      set({
        leaderboardLoading: false,
        error: error.response?.data?.message || 'Failed to fetch leaderboard',
      });
    }
  },

  // Economy actions
  fetchEconomy: async () => {
    try {
      const { data } = await api.get('/api/economy/overview');
      set({ economy: data });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch economy' });
    }
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Reset game state
  resetGameState: () => {
    set({
      territories: [],
      selectedTerritory: null,
      tribe: null,
      tribeMembers: [],
      battles: [],
      activeBattle: null,
      tribeLeaderboard: [],
      playerLeaderboard: [],
      economy: null,
      error: null,
    });
  },
}));
