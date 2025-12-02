import { useState } from 'react';
import api from '../services/api';
import { useUIStore } from '../stores/uiStore';

const BUILDINGS = [
  {
    key: 'barracks',
    name: 'Barracks',
    icon: '🏛️',
    description: 'Train units faster',
    maxLevel: 5,
  },
  {
    key: 'warehouse',
    name: 'Warehouse',
    icon: '🏪',
    description: 'Generate passive gold',
    maxLevel: 5,
  },
  {
    key: 'workshop',
    name: 'Workshop',
    icon: '⚒️',
    description: 'Unlock advanced formations',
    maxLevel: 3,
  },
];

function BuildingPanel({ user }) {
  const [upgrading, setUpgrading] = useState(null);
  const { showSuccess, showError } = useUIStore();

  const handleUpgrade = async (buildingKey) => {
    try {
      setUpgrading(buildingKey);
      await api.post(`/api/buildings/${buildingKey}/upgrade`);
      showSuccess('Upgrade started!');
    } catch (error) {
      showError(error.response?.data?.message || 'Upgrade failed');
    } finally {
      setUpgrading(null);
    }
  };

  const getBuildingLevel = (key) => {
    return user?.buildings?.[key]?.level || 1;
  };

  const isUpgrading = (key) => {
    return user?.buildings?.[key]?.upgrading || false;
  };

  return (
    <div className="card">
      <div className="card-header flex items-center gap-2">
        <span>🏗️</span>
        <span>Buildings</span>
      </div>
      <div className="p-3 space-y-2">
        {BUILDINGS.map((building) => {
          const level = getBuildingLevel(building.key);
          const isMax = level >= building.maxLevel;
          const upgradeInProgress = isUpgrading(building.key);

          return (
            <div
              key={building.key}
              className="p-3 bg-secondary-700/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">{building.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{building.name}</h4>
                    <span className="badge bg-primary-500/20 text-primary-400 text-xs">
                      Lv {level}
                    </span>
                  </div>
                  <p className="text-xs text-secondary-400">{building.description}</p>
                </div>
                <button
                  onClick={() => handleUpgrade(building.key)}
                  disabled={isMax || upgradeInProgress || upgrading === building.key}
                  className={`btn text-xs py-1 px-3 ${
                    isMax
                      ? 'btn-secondary opacity-50 cursor-not-allowed'
                      : upgradeInProgress
                      ? 'btn-secondary animate-pulse'
                      : 'btn-primary'
                  }`}
                >
                  {isMax
                    ? 'MAX'
                    : upgradeInProgress
                    ? 'Building...'
                    : upgrading === building.key
                    ? '...'
                    : 'Upgrade'}
                </button>
              </div>

              {/* Progress bar for upgrades */}
              {upgradeInProgress && (
                <div className="mt-2">
                  <div className="h-1.5 bg-secondary-600 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 animate-pulse w-1/3" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BuildingPanel;
