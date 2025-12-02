import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import { useUIStore } from '../stores/uiStore';
import GameMap from '../components/GameMap';
import BuildingPanel from '../components/BuildingPanel';
import ArmyPanel from '../components/ArmyPanel';
import TerritoryPanel from '../components/TerritoryPanel';
import ResourceBar from '../components/ResourceBar';
import Modal from '../components/Modal';
import AttackModal from '../components/AttackModal';
import BattleResultModal from '../components/BattleResultModal';

function Dashboard() {
  const { user } = useAuthStore();
  const {
    territories,
    selectedTerritory,
    tribe,
    economy,
    fetchTerritories,
    fetchTribe,
    fetchEconomy,
    clearSelectedTerritory,
  } = useGameStore();
  const { activeModal, closeModal } = useUIStore();

  // Load game data on mount
  useEffect(() => {
    fetchTerritories();
    fetchTribe();
    fetchEconomy();

    // Refresh data periodically
    const interval = setInterval(() => {
      fetchTerritories();
      fetchEconomy();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [fetchTerritories, fetchTribe, fetchEconomy]);

  return (
    <div className="min-h-screen bg-secondary-900 pt-16">
      {/* Resource Bar */}
      <ResourceBar user={user} economy={economy} />

      {/* Main Content */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Panel - Buildings & Army */}
        <div className="w-80 bg-secondary-800 border-r border-secondary-700 overflow-y-auto">
          <div className="p-4 space-y-4">
            <BuildingPanel user={user} />
            <ArmyPanel user={user} />
          </div>
        </div>

        {/* Center - Game Map */}
        <div className="flex-1 relative overflow-hidden">
          <GameMap
            territories={territories}
            selectedTerritory={selectedTerritory}
            tribe={tribe}
          />
        </div>

        {/* Right Panel - Territory Info */}
        <div className="w-96 bg-secondary-800 border-l border-secondary-700 overflow-y-auto">
          {selectedTerritory ? (
            <TerritoryPanel
              territory={selectedTerritory}
              tribe={tribe}
              user={user}
              onClose={clearSelectedTerritory}
            />
          ) : (
            <div className="p-6 text-center text-secondary-500">
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              <p className="text-lg font-medium mb-2">Select a Territory</p>
              <p className="text-sm">
                Click on any territory on the map to view details, attack, or
                reinforce.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'attack' && (
        <Modal onClose={closeModal} title="Launch Attack">
          <AttackModal />
        </Modal>
      )}

      {activeModal === 'battleResult' && (
        <Modal onClose={closeModal} title="Battle Results">
          <BattleResultModal />
        </Modal>
      )}
    </div>
  );
}

export default Dashboard;
