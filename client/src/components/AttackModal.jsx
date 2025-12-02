import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';

const UNIT_TYPES = ['militia', 'spearman', 'archer', 'cavalry'];
const UNIT_ICONS = {
  militia: '🗡️',
  spearman: '🔱',
  archer: '🏹',
  cavalry: '🐴',
};

const FORMATIONS = [
  { key: 'balanced', name: 'Balanced', desc: '+5% damage, +5% defense' },
  { key: 'offensive', name: 'Offensive', desc: '+15% damage, -10% defense' },
  { key: 'defensive', name: 'Defensive', desc: '-5% damage, +20% defense' },
];

function AttackModal() {
  const { user } = useAuthStore();
  const { attackTerritory } = useGameStore();
  const { modalData, closeModal, openModal, showSuccess, showError } = useUIStore();
  const territory = modalData?.territory;

  const [units, setUnits] = useState({
    militia: 0,
    spearman: 0,
    archer: 0,
    cavalry: 0,
  });
  const [formation, setFormation] = useState('balanced');
  const [attacking, setAttacking] = useState(false);

  const handleUnitChange = (type, value) => {
    const maxAvailable = user?.army?.[type] || 0;
    const newValue = Math.max(0, Math.min(maxAvailable, parseInt(value) || 0));
    setUnits((prev) => ({ ...prev, [type]: newValue }));
  };

  const handleMaxUnits = (type) => {
    const maxAvailable = user?.army?.[type] || 0;
    setUnits((prev) => ({ ...prev, [type]: maxAvailable }));
  };

  const handleAllMax = () => {
    const maxUnits = {};
    for (const type of UNIT_TYPES) {
      maxUnits[type] = user?.army?.[type] || 0;
    }
    setUnits(maxUnits);
  };

  const totalUnits = Object.values(units).reduce((a, b) => a + b, 0);

  const handleAttack = async () => {
    if (totalUnits === 0) {
      showError('Select at least one unit to attack');
      return;
    }

    try {
      setAttacking(true);
      const result = await attackTerritory(territory.territoryId, units, formation);
      closeModal();
      openModal('battleResult', { battle: result.battle });
      showSuccess('Attack launched!');
    } catch (error) {
      showError(error.message || 'Attack failed');
    } finally {
      setAttacking(false);
    }
  };

  if (!territory) return null;

  return (
    <div className="space-y-6">
      {/* Target info */}
      <div className="p-4 bg-secondary-700/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold">Territory {territory.territoryId}</h3>
            <p className="text-sm text-secondary-400 capitalize">
              {territory.terrain} · {territory.tier}
            </p>
          </div>
          {territory.controlledBy?.tribeId ? (
            <div className="text-right">
              <p className="font-medium text-danger">
                [{territory.controlledBy.tribeId.tag}]
              </p>
              <p className="text-sm text-secondary-400">Enemy Territory</p>
            </div>
          ) : (
            <div className="text-right">
              <p className="font-medium text-secondary-400">NPC</p>
              <p className="text-sm text-secondary-400">Unclaimed</p>
            </div>
          )}
        </div>
      </div>

      {/* Unit selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Select Units</h3>
          <button onClick={handleAllMax} className="btn-secondary text-xs py-1 px-2">
            Max All
          </button>
        </div>
        <div className="space-y-2">
          {UNIT_TYPES.map((type) => {
            const available = user?.army?.[type] || 0;
            return (
              <div key={type} className="flex items-center gap-3 p-3 bg-secondary-700/50 rounded-lg">
                <span className="text-2xl">{UNIT_ICONS[type]}</span>
                <div className="flex-1">
                  <p className="capitalize font-medium">{type}</p>
                  <p className="text-xs text-secondary-400">Available: {available}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={available}
                    value={units[type]}
                    onChange={(e) => handleUnitChange(type, e.target.value)}
                    className="input w-20 text-center"
                  />
                  <button
                    onClick={() => handleMaxUnits(type)}
                    className="btn-secondary text-xs py-1 px-2"
                  >
                    Max
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Formation selection */}
      <div>
        <h3 className="font-medium mb-3">Formation</h3>
        <div className="grid grid-cols-3 gap-2">
          {FORMATIONS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFormation(f.key)}
              className={`p-3 rounded-lg text-center transition-all ${
                formation === f.key
                  ? 'bg-primary-600 border-2 border-primary-400'
                  : 'bg-secondary-700 border-2 border-transparent hover:border-secondary-500'
              }`}
            >
              <p className="font-medium text-sm">{f.name}</p>
              <p className="text-xs text-secondary-400 mt-1">{f.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 bg-secondary-700/50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-secondary-400">Total Units</span>
          <span className="font-bold text-lg">{totalUnits}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button onClick={closeModal} className="btn-secondary flex-1">
          Cancel
        </button>
        <button
          onClick={handleAttack}
          disabled={attacking || totalUnits === 0}
          className="btn-danger flex-1"
        >
          {attacking ? 'Attacking...' : '⚔️ Launch Attack'}
        </button>
      </div>
    </div>
  );
}

export default AttackModal;
