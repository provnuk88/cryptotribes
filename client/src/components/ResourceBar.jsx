function ResourceBar({ user, economy }) {
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toLocaleString() || '0';
  };

  return (
    <div className="fixed top-16 left-80 right-96 h-12 bg-secondary-800/95 border-b border-secondary-700 flex items-center justify-between px-6 z-40">
      {/* Left - Income */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-gold">💰</span>
          <span className="font-bold text-lg">{formatNumber(user?.gold)}</span>
          {economy?.netIncomePerHour !== undefined && (
            <span
              className={`text-sm ${
                economy.netIncomePerHour >= 0 ? 'text-success' : 'text-danger'
              }`}
            >
              {economy.netIncomePerHour >= 0 ? '+' : ''}
              {formatNumber(economy.netIncomePerHour)}/h
            </span>
          )}
        </div>

        <div className="w-px h-6 bg-secondary-600" />

        <div className="flex items-center gap-2">
          <span className="text-vp">⭐</span>
          <span className="font-bold text-lg text-vp">
            {formatNumber(user?.statistics?.vp?.total)}
          </span>
          {economy?.income?.vp > 0 && (
            <span className="text-sm text-success">
              +{formatNumber(economy.income.vp)}/h
            </span>
          )}
        </div>
      </div>

      {/* Right - Economy breakdown */}
      {economy && (
        <div className="flex items-center gap-4 text-sm text-secondary-400">
          <div>
            <span className="text-secondary-500">Base:</span>{' '}
            <span className="text-white">+{economy.income?.base || 0}</span>
          </div>
          <div>
            <span className="text-secondary-500">Territory:</span>{' '}
            <span className="text-white">+{economy.income?.territory || 0}</span>
          </div>
          <div>
            <span className="text-secondary-500">Upkeep:</span>{' '}
            <span className="text-danger">-{economy.upkeep?.total || 0}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResourceBar;
