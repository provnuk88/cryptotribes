import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

function TribeHub() {
  const { user } = useAuthStore();
  const { tribe, tribeMembers, fetchTribe, joinTribe, tribeLoading } = useGameStore();
  const [availableTribes, setAvailableTribes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTribe();
    loadAvailableTribes();
  }, [fetchTribe]);

  const loadAvailableTribes = async () => {
    try {
      const { data } = await api.get('/api/tribes');
      setAvailableTribes(data.tribes || []);
    } catch (error) {
      console.error('Failed to load tribes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTribe = async (tribeId) => {
    try {
      await joinTribe(tribeId);
      loadAvailableTribes();
    } catch (error) {
      console.error('Failed to join tribe:', error);
    }
  };

  if (loading || tribeLoading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  // If user has a tribe, show tribe dashboard
  if (tribe) {
    return (
      <div className="min-h-screen pt-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Tribe Header */}
          <div className="card mb-6">
            <div className="p-6 flex items-center gap-6">
              <div className="w-24 h-24 bg-secondary-700 rounded-xl flex items-center justify-center text-4xl">
                {tribe.banner || '🏰'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-display font-bold">{tribe.name}</h1>
                  <span className="badge badge-gold">[{tribe.tag}]</span>
                </div>
                <p className="text-secondary-400 mt-1">{tribe.description}</p>
                <div className="flex gap-6 mt-4">
                  <div>
                    <p className="text-sm text-secondary-400">Members</p>
                    <p className="text-xl font-bold">{tribe.memberCount}/50</p>
                  </div>
                  <div>
                    <p className="text-sm text-secondary-400">Territories</p>
                    <p className="text-xl font-bold">{tribe.territoryCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-secondary-400">Victory Points</p>
                    <p className="text-xl font-bold text-vp">{tribe.victoryPoints?.total || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Members List */}
            <div className="card">
              <div className="card-header">Tribe Members</div>
              <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                {tribeMembers.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center gap-3 p-3 bg-secondary-700/50 rounded-lg"
                  >
                    <div className="w-10 h-10 bg-secondary-600 rounded-full flex items-center justify-center">
                      {member.profile?.avatar || '⚔️'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{member.profile?.displayName}</p>
                      <p className="text-xs text-secondary-400 capitalize">
                        {member.currentSeason?.role || 'Member'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-vp">
                        {member.statistics?.vp?.total || 0} VP
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tribe Announcements */}
            <div className="card">
              <div className="card-header">Announcements</div>
              <div className="p-4">
                {tribe.announcements?.length > 0 ? (
                  <div className="space-y-3">
                    {tribe.announcements.slice(0, 5).map((announcement, i) => (
                      <div key={i} className="p-3 bg-secondary-700/50 rounded-lg">
                        <p className="text-sm">{announcement.content}</p>
                        <p className="text-xs text-secondary-500 mt-1">
                          {new Date(announcement.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-secondary-500 text-center py-8">
                    No announcements yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No tribe - show available tribes to join
  return (
    <div className="min-h-screen pt-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-display font-bold text-center mb-2">
          Choose Your Tribe
        </h1>
        <p className="text-secondary-400 text-center mb-8">
          Join a tribe to compete for territory and claim your share of the prize pool
        </p>

        <div className="grid gap-4">
          {availableTribes.map((t) => (
            <div key={t._id} className="card hover:border-primary-500/50 transition-all">
              <div className="p-4 flex items-center gap-4">
                <div className="w-16 h-16 bg-secondary-700 rounded-xl flex items-center justify-center text-3xl">
                  {t.banner || '🏰'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-display font-bold">{t.name}</h3>
                    <span className="text-secondary-400">[{t.tag}]</span>
                  </div>
                  <p className="text-secondary-400 text-sm mt-1">{t.description}</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span>
                      <span className="text-secondary-400">Members:</span>{' '}
                      {t.memberCount}/50
                    </span>
                    <span>
                      <span className="text-secondary-400">VP:</span>{' '}
                      <span className="text-vp">{t.victoryPoints?.total || 0}</span>
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleJoinTribe(t._id)}
                  disabled={t.memberCount >= 50}
                  className={`btn ${t.memberCount >= 50 ? 'btn-secondary opacity-50' : 'btn-primary'}`}
                >
                  {t.memberCount >= 50 ? 'Full' : 'Join'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {availableTribes.length === 0 && (
          <div className="text-center py-12 text-secondary-500">
            <p>No tribes available. Check back later or create your own!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TribeHub;
