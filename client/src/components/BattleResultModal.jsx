import { useUIStore } from '../stores/uiStore';

const UNIT_ICONS = {
  militia: '🗡️',
  spearman: '🔱',
  archer: '🏹',
  cavalry: '🐴',
};

function BattleResultModal() {
  const { modalData, closeModal } = useUIStore();
  const battle = modalData?.battle;

  if (!battle) return null;

  const isVictory = battle.result === 'attacker_victory';

  return (
    <div className="space-y-6">
      {/* Result banner */}
      <div
        className={`p-6 rounded-lg text-center ${
          isVictory
            ? 'bg-success/20 border border-success/30'
            : 'bg-danger/20 border border-danger/30'
        }`}
      >
        <span className="text-5xl">{isVictory ? '🏆' : '💀'}</span>
        <h2 className={`text-2xl font-display font-bold mt-2 ${isVictory ? 'text-success' : 'text-danger'}`}>
          {isVictory ? 'VICTORY!' : 'DEFEAT'}
        </h2>
        <p className="text-secondary-400 mt-1">
          Territory {battle.territoryId}
          {isVictory ? ' Captured!' : ' Defense Holds'}
        </p>
      </div>

      {/* Battle stats */}
      <div className="grid grid-cols-2 gap-4">
        {/* Attacker */}
        <div className="p-4 bg-secondary-700/50 rounded-lg">
          <h3 className="text-sm text-secondary-400 mb-2">Your Forces</h3>
          <div className="space-y-1 text-sm">
            {Object.entries(battle.attacker?.casualties || {}).map(([unit, count]) => {
              if (unit === 'total' || count === 0) return null;
              return (
                <div key={unit} className="flex justify-between">
                  <span>{UNIT_ICONS[unit]} {unit}</span>
                  <span className="text-danger">-{count}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-secondary-600 flex justify-between font-medium">
            <span>Casualties</span>
            <span className="text-danger">
              -{battle.attacker?.casualties?.total || 0}
            </span>
          </div>
        </div>

        {/* Defender */}
        <div className="p-4 bg-secondary-700/50 rounded-lg">
          <h3 className="text-sm text-secondary-400 mb-2">Enemy Forces</h3>
          <div className="space-y-1 text-sm">
            {Object.entries(battle.defender?.casualties || {}).map(([unit, count]) => {
              if (unit === 'total' || count === 0) return null;
              return (
                <div key={unit} className="flex justify-between">
                  <span>{UNIT_ICONS[unit]} {unit}</span>
                  <span className="text-danger">-{count}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-secondary-600 flex justify-between font-medium">
            <span>Casualties</span>
            <span className="text-danger">
              -{battle.defender?.casualties?.total || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Survivors */}
      {isVictory && (
        <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
          <h3 className="text-sm text-success mb-2">Surviving Units (Now Garrisoned)</h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            {Object.entries(battle.attacker?.survivors || {}).map(([unit, count]) => (
              <div key={unit}>
                <span className="text-xl">{UNIT_ICONS[unit]}</span>
                <p className="font-bold">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rewards */}
      {isVictory && (
        <div className="p-4 bg-gold/10 border border-gold/30 rounded-lg">
          <h3 className="text-sm text-gold mb-2">Rewards</h3>
          <div className="flex justify-around text-center">
            <div>
              <span className="text-2xl">💰</span>
              <p className="font-bold text-gold">+{battle.rewards?.goldLooted || 0}</p>
              <p className="text-xs text-secondary-400">Gold Looted</p>
            </div>
            <div>
              <span className="text-2xl">⭐</span>
              <p className="font-bold text-vp">+{battle.rewards?.vpGained || 0}</p>
              <p className="text-xs text-secondary-400">VP Gained</p>
            </div>
          </div>
        </div>
      )}

      {/* Combat log preview */}
      {battle.combatLog && battle.combatLog.length > 0 && (
        <div className="p-4 bg-secondary-700/50 rounded-lg max-h-40 overflow-y-auto">
          <h3 className="text-sm text-secondary-400 mb-2">Battle Log</h3>
          <div className="space-y-1 text-xs font-mono text-secondary-300">
            {battle.combatLog.slice(0, 10).map((log, i) => (
              <p key={i}>{log}</p>
            ))}
          </div>
        </div>
      )}

      {/* Close button */}
      <button onClick={closeModal} className="btn-primary w-full">
        Continue
      </button>
    </div>
  );
}

export default BattleResultModal;
