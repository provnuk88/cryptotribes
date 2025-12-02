import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';

function Header() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { tribe } = useGameStore();

  const navLinks = [
    { path: '/dashboard', label: 'Map', icon: '🗺️' },
    { path: '/tribe', label: 'Tribe', icon: '⚔️' },
    { path: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-secondary-800 border-b border-secondary-700 z-50">
      <div className="h-full flex items-center justify-between px-4">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">⚔️</span>
          <span className="font-display text-xl font-bold text-white">CryptoTribes</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                location.pathname === link.path
                  ? 'bg-primary-600 text-white'
                  : 'text-secondary-400 hover:bg-secondary-700 hover:text-white'
              }`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* User Info */}
        <div className="flex items-center gap-4">
          {/* Resources */}
          <div className="flex items-center gap-4 px-4 py-1.5 bg-secondary-700 rounded-lg">
            <div className="flex items-center gap-1.5">
              <span className="text-gold">💰</span>
              <span className="font-medium">{user?.gold?.toLocaleString() || 0}</span>
            </div>
            <div className="w-px h-5 bg-secondary-600" />
            <div className="flex items-center gap-1.5">
              <span className="text-vp">⭐</span>
              <span className="font-medium text-vp">
                {user?.statistics?.vp?.total || 0}
              </span>
            </div>
          </div>

          {/* Tribe badge */}
          {tribe && (
            <div className="px-3 py-1.5 bg-secondary-700 rounded-lg">
              <span className="text-primary-400">[{tribe.tag}]</span>
            </div>
          )}

          {/* User dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-secondary-700 rounded-lg hover:bg-secondary-600 transition-colors">
              <span className="text-xl">{user?.profile?.avatar || '⚔️'}</span>
              <span className="font-medium">{user?.profile?.displayName || 'Commander'}</span>
              <svg
                className="w-4 h-4 text-secondary-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown menu */}
            <div className="absolute right-0 top-full mt-2 w-48 bg-secondary-800 border border-secondary-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <div className="p-2">
                <div className="px-3 py-2 text-xs text-secondary-500 truncate">
                  {user?.walletAddress?.slice(0, 6)}...{user?.walletAddress?.slice(-4)}
                </div>
                <hr className="border-secondary-700 my-1" />
                <button
                  onClick={logout}
                  className="w-full px-3 py-2 text-left text-danger hover:bg-secondary-700 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
