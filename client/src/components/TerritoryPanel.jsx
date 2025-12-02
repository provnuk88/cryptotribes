import { useUIStore } from '../stores/uiStore';

const TERRAIN_INFO = {
  plains: { name: 'Plains', bonus: 'No bonuses', icon: '🌾' },
  forest: { name: 'Forest', bonus: '+25% defense, -25% cavalry', icon: '🌲' },
  hills: { name: 'Hills', bonus: '+25% archer damage', icon: '⛰️' },
  castle: { name: 'Castle', bonus: '+50% defense', icon: '🏰' },
};

const TIER_INFO = {
  center: { name: 'Center', goldPerHour: 100, vpPerHour: 20 },
  ring: { name: 'Ring', goldPerHour: 50, vpPerHour: 10 },
  edge: { name: 'Edge', goldPerHour: 20, vpPerHour: 5 },
};

function TerritoryPanel({ territory, tribe, user, onClose }) {
  const { openModal } = useUIStore();

  const terrainInfo = TERRAIN_INFO[territory.terrain] || TERRAIN_INFO.plains;
  const tierInfo = TIER_INFO[territory.tier] || TIER_INFO.edge;
  const isControlledByUs = territory.controlledBy?.tribeId?._id === tribe?._id;
  const isNpc = !territory.controlledBy?.tribeId;
  const hasShield = territory.shield?.active;

  const handleAttack = () => {
    openModal('attack', { territory });
  };

  const totalGarrison = territory.garrison?.total
    ? Object.values(territory.garrison.total).reduce((a, b) => a + b, 0)
    : 0;

  const npcGarrison = territory.npcGarrison
    ? Object.values(territory.npcGarrison).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-secondary-700 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">
            Territory {territory.territoryId}
          </h2>
          <p className="text-secondary-400 text-sm capitalize">
            {terrainInfo.icon} {terrainInfo.name} · {tierInfo.name}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-secondary-400 hover:text-white hover:bg-secondary-700 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Control Status */}
        <div className="p-4 bg-secondary-700/50 rounded-lg">
          <h3 className="text-sm text-secondary-400 mb-2">Controlled By</h3>
          {territory.controlledBy?.tribeId ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary-600 rounded-lg flex items-center justify-center text-xl">
                {territory.controlledBy.tribeId.banner || '🏰'}
              </div>
              <div>
                <p className="font-bold">
                  [{territory.controlledBy.tribeId.tag}] {territory.controlledBy.tribeId.name}
                </p>
                {isControlledByUs && (
                  <span className="badge badge-gold text-xs">Your Tribe</span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary-600 rounded-lg flex items-center justify-center text-xl">
                👹
              </div>
              <div>
                <p className="font-bold">NPC Garrison</p>
                <p className="text-sm text-secondary-400">Unclaimed territory</p>
              </div>
            </div>
          )}
        </div>

        {/* Shield Status */}
        {hasShield && (
          <div className="p-4 bg-accent-600/20 border border-accent-600/30 rounded-lg">
            <div className="flex items-center gap-2 text-accent-400">
              <span>🛡️</span>
              <span className="font-medium">Shield Active</span>
            </div>
            <p className="text-sm text-secondary-400 mt-1">
              Expires: {new Date(territory.shield.expiresAt).toLocaleString()}
            </p>
          </div>
        )}

        {/* Terrain Bonus */}
        <div className="p-4 bg-secondary-700/50 rounded-lg">
          <h3 className="text-sm text-secondary-400 mb-2">Terrain Bonus</h3>
          <p className="text-sm">{terrainInfo.bonus}</p>
        </div>

        {/* Generation Rates */}
        <div className="p-4 bg-secondary-700/50 rounded-lg">
          <h3 className="text-sm text-secondary-400 mb-2">Generation Rates</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-secondary-600/50 rounded">
              <p className="text-xl font-bold text-gold">+{tierInfo.goldPerHour}</p>
              <p className="text-xs text-secondary-400">Gold/hour</p>
            </div>
            <div className="text-center p-2 bg-secondary-600/50 rounded">
              <p className="text-xl font-bold text-vp">+{tierInfo.vpPerHour}</p>
              <p className="text-xs text-secondary-400">VP/hour</p>
            </div>
          </div>
        </div>

        {/* Garrison */}
        <div className="p-4 bg-secondary-700/50 rounded-lg">
          <h3 className="text-sm text-secondary-400 mb-2">
            {isNpc ? 'NPC Garrison' : 'Garrison'}
          </h3>
          {isNpc ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span>🗡️ Militia</span>
                <span>{territory.npcGarrison?.militia || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>🔱 Spearman</span>
                <span>{territory.npcGarrison?.spearman || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>🏹 Archer</span>
                <span>{territory.npcGarrison?.archer || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>🐴 Cavalry</span>
                <span>{territory.npcGarrison?.cavalry || 0}</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span>🗡️ Militia</span>
                <span>{territory.garrison?.total?.militia || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>🔱 Spearman</span>
                <span>{territory.garrison?.total?.spearman || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>🏹 Archer</span>
                <span>{territory.garrison?.total?.archer || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>🐴 Cavalry</span>
                <span>{territory.garrison?.total?.cavalry || 0}</span>
              </div>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-secondary-600 flex justify-between">
            <span className="text-secondary-400">Total</span>
            <span className="font-bold">{isNpc ? npcGarrison : totalGarrison} units</span>
          </div>
        </div>

        {/* Contributors (if owned by player tribe) */}
        {isControlledByUs && territory.garrison?.contributors?.length > 0 && (
          <div className="p-4 bg-secondary-700/50 rounded-lg">
            <h3 className="text-sm text-secondary-400 mb-2">Contributors</h3>
            <div className="space-y-2">
              {territory.garrison.contributors.map((contributor, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{contributor.userId?.profile?.displayName || 'Unknown'}</span>
                  <span className="text-secondary-400">
                    {contributor.percentage?.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-secondary-700 space-y-2">
        {!isControlledByUs && !hasShield && (
          <button onClick={handleAttack} className="btn-danger w-full">
            ⚔️ Attack Territory
          </button>
        )}
        {isControlledByUs && (
          <>
            <button className="btn-primary w-full">
              📦 Reinforce
            </button>
            <button className="btn-secondary w-full">
              🛡️ Activate Shield
            </button>
          </>
        )}
        {hasShield && !isControlledByUs && (
          <div className="text-center text-secondary-400 py-2">
            Territory is shielded from attacks
          </div>
        )}
      </div>
    </div>
  );
}

export default TerritoryPanel;
