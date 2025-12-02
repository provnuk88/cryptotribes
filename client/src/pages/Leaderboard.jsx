import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';

function Leaderboard() {
  const {
    tribeLeaderboard,
    playerLeaderboard,
    fetchLeaderboard,
    leaderboardLoading,
  } = useGameStore();
  const [activeTab, setActiveTab] = useState('tribes');

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const getRankBadge = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getUnderdogBonus = (rank) => {
    if (rank >= 1 && rank <= 3) return '1.0x';
    if (rank >= 4 && rank <= 6) return '1.25x';
    if (rank >= 7 && rank <= 10) return '1.5x';
    return '2.0x';
  };

  return (
    <div className="min-h-screen pt-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-display font-bold text-center mb-2">
          Leaderboard
        </h1>
        <p className="text-secondary-400 text-center mb-8">
          Season 1 Rankings - $5,000 Prize Pool
        </p>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => setActiveTab('tribes')}
            className={`btn ${activeTab === 'tribes' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Tribes
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`btn ${activeTab === 'players' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Players
          </button>
        </div>

        {leaderboardLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
          </div>
        ) : (
          <>
            {/* Tribe Leaderboard */}
            {activeTab === 'tribes' && (
              <div className="card">
                <div className="card-header flex justify-between items-center">
                  <span>Tribe Rankings</span>
                  <span className="text-sm text-secondary-400">
                    {tribeLeaderboard.length} tribes
                  </span>
                </div>
                <div className="divide-y divide-secondary-700">
                  {tribeLeaderboard.map((tribe) => (
                    <div
                      key={tribe._id}
                      className={`p-4 flex items-center gap-4 ${
                        tribe.rank <= 3 ? 'bg-primary-900/20' : ''
                      }`}
                    >
                      <div className="w-12 text-center text-xl font-bold">
                        {getRankBadge(tribe.rank)}
                      </div>
                      <div className="w-12 h-12 bg-secondary-700 rounded-lg flex items-center justify-center text-2xl">
                        {tribe.banner || '🏰'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold">{tribe.name}</h3>
                          <span className="text-secondary-400">[{tribe.tag}]</span>
                        </div>
                        <div className="flex gap-4 text-sm text-secondary-400">
                          <span>{tribe.memberCount} members</span>
                          <span>{tribe.territoryCount} territories</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-vp">
                          {tribe.victoryPoints?.total?.toLocaleString() || 0}
                        </p>
                        <p className="text-xs text-secondary-400">VP</p>
                      </div>
                      <div className="text-right">
                        <span className={`badge ${tribe.rank > 3 ? 'badge-gold' : 'bg-secondary-700'}`}>
                          {getUnderdogBonus(tribe.rank)} bonus
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Player Leaderboard */}
            {activeTab === 'players' && (
              <div className="card">
                <div className="card-header flex justify-between items-center">
                  <span>Player Rankings</span>
                  <span className="text-sm text-secondary-400">
                    Top {playerLeaderboard.length} players
                  </span>
                </div>
                <div className="divide-y divide-secondary-700">
                  {playerLeaderboard.map((player) => (
                    <div
                      key={player.id}
                      className={`p-4 flex items-center gap-4 ${
                        player.rank <= 3 ? 'bg-primary-900/20' : ''
                      }`}
                    >
                      <div className="w-12 text-center text-xl font-bold">
                        {getRankBadge(player.rank)}
                      </div>
                      <div className="w-10 h-10 bg-secondary-700 rounded-full flex items-center justify-center text-xl">
                        {player.avatar || '⚔️'}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold">{player.displayName}</h3>
                        {player.tribe && (
                          <p className="text-sm text-secondary-400">
                            [{player.tribe.tag}] {player.tribe.name}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-vp">
                          {player.vp?.toLocaleString() || 0}
                        </p>
                        <p className="text-xs text-secondary-400">VP</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Prize Pool Info */}
        <div className="mt-8 card">
          <div className="card-header">Prize Distribution</div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                <p className="text-3xl mb-1">🥇</p>
                <p className="text-2xl font-bold text-yellow-400">$2,500</p>
                <p className="text-sm text-secondary-400">1st Place</p>
              </div>
              <div className="p-4 bg-gray-500/10 rounded-lg border border-gray-500/30">
                <p className="text-3xl mb-1">🥈</p>
                <p className="text-2xl font-bold text-gray-400">$1,500</p>
                <p className="text-sm text-secondary-400">2nd Place</p>
              </div>
              <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/30">
                <p className="text-3xl mb-1">🥉</p>
                <p className="text-2xl font-bold text-orange-400">$1,000</p>
                <p className="text-sm text-secondary-400">3rd Place</p>
              </div>
            </div>
            <p className="text-center text-secondary-400 text-sm mt-4">
              Prizes distributed to tribe members proportionally based on VP contribution
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;
