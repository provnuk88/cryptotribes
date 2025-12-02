import { useState } from 'react';
import api from '../services/api';
import { useUIStore } from '../stores/uiStore';

const UNIT_TYPES = [
  {
    key: 'militia',
    name: 'Militia',
    icon: '🗡️',
    power: 1,
    cost: 10,
    time: '30s',
    color: 'militia',
  },
  {
    key: 'spearman',
    name: 'Spearman',
    icon: '🔱',
    power: 2,
    cost: 25,
    time: '1m',
    color: 'spearman',
    counter: 'Cavalry',
  },
  {
    key: 'archer',
    name: 'Archer',
    icon: '🏹',
    power: 3,
    cost: 40,
    time: '2m',
    color: 'archer',
    counter: 'Spearman',
  },
  {
    key: 'cavalry',
    name: 'Cavalry',
    icon: '🐴',
    power: 4,
    cost: 60,
    time: '3m',
    color: 'cavalry',
    counter: 'Archer',
  },
];

function ArmyPanel({ user }) {
  const [selectedUnit, setSelectedUnit] = useState('militia');
  const [quantity, setQuantity] = useState(1);
  const [training, setTraining] = useState(false);
  const { showSuccess, showError } = useUIStore();

  const handleTrain = async () => {
    try {
      setTraining(true);
      await api.post('/api/units/train', {
        unitType: selectedUnit,
        quantity,
      });
      showSuccess(`Training ${quantity} ${selectedUnit}!`);
      setQuantity(1);
    } catch (error) {
      showError(error.response?.data?.message || 'Training failed');
    } finally {
      setTraining(false);
    }
  };

  const getUnitCount = (key) => {
    return user?.army?.[key] || 0;
  };

  const getTotalPower = () => {
    let power = 0;
    for (const unit of UNIT_TYPES) {
      power += getUnitCount(unit.key) * unit.power;
    }
    return power;
  };

  const selectedUnitData = UNIT_TYPES.find((u) => u.key === selectedUnit);
  const trainCost = (selectedUnitData?.cost || 0) * quantity;
  const canAfford = (user?.gold || 0) >= trainCost;

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>⚔️</span>
          <span>Army</span>
        </div>
        <span className="text-sm text-secondary-400">
          Power: <span className="text-white font-bold">{getTotalPower()}</span>
        </span>
      </div>
      <div className="p-3">
        {/* Unit counts */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {UNIT_TYPES.map((unit) => (
            <div
              key={unit.key}
              onClick={() => setSelectedUnit(unit.key)}
              className={`p-2 rounded-lg cursor-pointer transition-all ${
                selectedUnit === unit.key
                  ? 'bg-primary-600/30 border border-primary-500'
                  : 'bg-secondary-700/50 hover:bg-secondary-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{unit.icon}</span>
                <div>
                  <p className="text-sm font-medium">{unit.name}</p>
                  <p className="text-lg font-bold">{getUnitCount(unit.key)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Training controls */}
        <div className="p-3 bg-secondary-700/50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{selectedUnitData?.icon}</span>
            <span className="font-medium">Train {selectedUnitData?.name}</span>
          </div>

          <div className="flex gap-2 mb-3">
            <input
              type="number"
              min="1"
              max="100"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="input w-20 text-center"
            />
            <div className="flex gap-1">
              {[1, 5, 10, 25].map((n) => (
                <button
                  key={n}
                  onClick={() => setQuantity(n)}
                  className={`btn-secondary text-xs py-1 px-2 ${
                    quantity === n ? 'bg-secondary-600' : ''
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center text-sm text-secondary-400 mb-3">
            <span>Cost: <span className={canAfford ? 'text-gold' : 'text-danger'}>{trainCost} gold</span></span>
            <span>Time: {selectedUnitData?.time}</span>
          </div>

          <button
            onClick={handleTrain}
            disabled={training || !canAfford}
            className={`btn w-full ${canAfford ? 'btn-primary' : 'btn-secondary opacity-50'}`}
          >
            {training ? 'Training...' : 'Train Units'}
          </button>
        </div>

        {/* Training queue */}
        {user?.trainingQueue?.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-secondary-400 mb-2">Training Queue</p>
            <div className="space-y-1">
              {user.trainingQueue.slice(0, 3).map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs p-2 bg-secondary-700/50 rounded"
                >
                  <span>
                    {UNIT_TYPES.find((u) => u.key === item.unitType)?.icon} {item.quantity}x{' '}
                    {item.unitType}
                  </span>
                  <span className="text-secondary-400">
                    {new Date(item.completesAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ArmyPanel;
