import { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';

// Territory layout positions (50 territories)
// Center: 1-5 (castle)
// Ring: 6-20 (mixed)
// Edge: 21-50 (mostly plains)
const TERRITORY_POSITIONS = generateTerritoryPositions();

function generateTerritoryPositions() {
  const positions = {};
  const centerX = 400;
  const centerY = 350;

  // Center territories (1-5) - pentagon in center
  const centerRadius = 60;
  for (let i = 0; i < 5; i++) {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    positions[i + 1] = {
      x: centerX + Math.cos(angle) * centerRadius,
      y: centerY + Math.sin(angle) * centerRadius,
      tier: 'center',
    };
  }

  // Ring territories (6-20) - 15 territories in a ring
  const ringRadius = 150;
  for (let i = 0; i < 15; i++) {
    const angle = (i * 2 * Math.PI) / 15 - Math.PI / 2;
    positions[i + 6] = {
      x: centerX + Math.cos(angle) * ringRadius,
      y: centerY + Math.sin(angle) * ringRadius,
      tier: 'ring',
    };
  }

  // Edge territories (21-50) - 30 territories in outer ring
  const edgeRadius = 270;
  for (let i = 0; i < 30; i++) {
    const angle = (i * 2 * Math.PI) / 30 - Math.PI / 2;
    positions[i + 21] = {
      x: centerX + Math.cos(angle) * edgeRadius,
      y: centerY + Math.sin(angle) * edgeRadius,
      tier: 'edge',
    };
  }

  return positions;
}

// Terrain colors
const TERRAIN_COLORS = {
  castle: { fill: '#7c3aed', stroke: '#9333ea' },
  plains: { fill: '#166534', stroke: '#15803d' },
  forest: { fill: '#14532d', stroke: '#166534' },
  hills: { fill: '#78716c', stroke: '#a8a29e' },
};

// Tribe colors
const TRIBE_COLORS = {
  default: '#64748b',
  wolves: '#64748b',
  eagles: '#3b82f6',
  bears: '#d97706',
  serpents: '#10b981',
};

function GameMap({ territories, selectedTerritory, tribe }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 700 });
  const [hoveredTerritory, setHoveredTerritory] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const { selectTerritory } = useGameStore();

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Draw map
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(offset.x + dimensions.width / 2, offset.y + dimensions.height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-400, -350);

    // Draw connections first (under territories)
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;

    // Draw connections between adjacent territories
    drawConnections(ctx);

    // Draw territories
    for (const territory of territories) {
      const pos = TERRITORY_POSITIONS[territory.territoryId];
      if (!pos) continue;

      drawTerritory(ctx, territory, pos);
    }

    ctx.restore();
  }, [territories, selectedTerritory, hoveredTerritory, offset, scale, dimensions]);

  // Draw connections between territories
  const drawConnections = (ctx) => {
    // Center to center
    for (let i = 1; i <= 5; i++) {
      for (let j = i + 1; j <= 5; j++) {
        drawLine(ctx, TERRITORY_POSITIONS[i], TERRITORY_POSITIONS[j]);
      }
    }

    // Center to ring
    for (let i = 1; i <= 5; i++) {
      const ringStart = 6 + (i - 1) * 3;
      for (let j = 0; j < 3; j++) {
        const ringIdx = ((ringStart - 6 + j) % 15) + 6;
        drawLine(ctx, TERRITORY_POSITIONS[i], TERRITORY_POSITIONS[ringIdx]);
      }
    }

    // Ring to ring (adjacent)
    for (let i = 6; i <= 20; i++) {
      const next = i === 20 ? 6 : i + 1;
      drawLine(ctx, TERRITORY_POSITIONS[i], TERRITORY_POSITIONS[next]);
    }

    // Ring to edge
    for (let i = 6; i <= 20; i++) {
      const edgeStart = 21 + (i - 6) * 2;
      for (let j = 0; j < 2; j++) {
        const edgeIdx = ((edgeStart - 21 + j) % 30) + 21;
        drawLine(ctx, TERRITORY_POSITIONS[i], TERRITORY_POSITIONS[edgeIdx]);
      }
    }

    // Edge to edge (adjacent)
    for (let i = 21; i <= 50; i++) {
      const next = i === 50 ? 21 : i + 1;
      drawLine(ctx, TERRITORY_POSITIONS[i], TERRITORY_POSITIONS[next]);
    }
  };

  const drawLine = (ctx, from, to) => {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const drawTerritory = (ctx, territory, pos) => {
    const radius = pos.tier === 'center' ? 30 : pos.tier === 'ring' ? 25 : 20;
    const terrain = TERRAIN_COLORS[territory.terrain] || TERRAIN_COLORS.plains;
    const isSelected = selectedTerritory?.territoryId === territory.territoryId;
    const isHovered = hoveredTerritory === territory.territoryId;
    const isOwned = territory.controlledBy?.tribeId?._id === tribe?._id;

    // Get tribe color
    let tribeColor = TERRAIN_COLORS.default;
    if (territory.controlledBy?.tribeId?.tag) {
      const tag = territory.controlledBy.tribeId.tag.toLowerCase();
      tribeColor = TRIBE_COLORS[tag] || TRIBE_COLORS.default;
    }

    // Territory hexagon
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 6;
      const x = pos.x + Math.cos(angle) * radius;
      const y = pos.y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    // Fill with terrain color, overlay with tribe color if controlled
    ctx.fillStyle = territory.controlledBy?.tribeId ? tribeColor : terrain.fill;
    ctx.fill();

    // Border
    ctx.strokeStyle = isSelected
      ? '#fbbf24'
      : isHovered
      ? '#ffffff'
      : terrain.stroke;
    ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1;
    ctx.stroke();

    // Shield indicator
    if (territory.shield?.active) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Territory ID
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(territory.territoryId.toString(), pos.x, pos.y);

    // Tribe tag (if controlled)
    if (territory.controlledBy?.tribeId?.tag) {
      ctx.font = '8px Inter';
      ctx.fillText(territory.controlledBy.tribeId.tag, pos.x, pos.y + 12);
    }
  };

  // Mouse event handlers
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x - dimensions.width / 2) / scale + 400;
    const y = (e.clientY - rect.top - offset.y - dimensions.height / 2) / scale + 350;
    return { x, y };
  };

  const findTerritoryAtPos = (mousePos) => {
    for (const territory of territories) {
      const pos = TERRITORY_POSITIONS[territory.territoryId];
      if (!pos) continue;

      const radius = pos.tier === 'center' ? 30 : pos.tier === 'ring' ? 25 : 20;
      const distance = Math.sqrt(
        Math.pow(mousePos.x - pos.x, 2) + Math.pow(mousePos.y - pos.y, 2)
      );

      if (distance <= radius) {
        return territory;
      }
    }
    return null;
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    const mousePos = getMousePos(e);
    const territory = findTerritoryAtPos(mousePos);
    setHoveredTerritory(territory?.territoryId || null);
  };

  const handleMouseDown = (e) => {
    if (e.button === 1 || e.button === 2) {
      // Middle or right click
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = (e) => {
    if (isDragging) return;

    const mousePos = getMousePos(e);
    const territory = findTerritoryAtPos(mousePos);
    if (territory) {
      selectTerritory(territory.territoryId);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.max(0.5, Math.min(2, prev * delta)));
  };

  // Draw on changes
  useEffect(() => {
    drawMap();
  }, [drawMap]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-secondary-900 cursor-crosshair"
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="block"
      />

      {/* Map Controls */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={() => setScale((s) => Math.min(2, s * 1.2))}
          className="btn-secondary p-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
          </svg>
        </button>
        <button
          onClick={() => setScale((s) => Math.max(0.5, s / 1.2))}
          className="btn-secondary p-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={() => {
            setScale(1);
            setOffset({ x: 0, y: 0 });
          }}
          className="btn-secondary p-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-secondary-800/90 p-3 rounded-lg text-xs">
        <h4 className="font-bold mb-2">Map Legend</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TERRAIN_COLORS.castle.fill }} />
            <span>Castle (+50% def)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TERRAIN_COLORS.forest.fill }} />
            <span>Forest (+25% def)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TERRAIN_COLORS.hills.fill }} />
            <span>Hills (+25% archer)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TERRAIN_COLORS.plains.fill }} />
            <span>Plains (neutral)</span>
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredTerritory && (
        <div className="absolute top-4 right-4 bg-secondary-800/90 p-3 rounded-lg text-sm">
          {(() => {
            const t = territories.find((t) => t.territoryId === hoveredTerritory);
            return t ? (
              <>
                <h4 className="font-bold">Territory {t.territoryId}</h4>
                <p className="text-secondary-400 capitalize">{t.terrain} · {t.tier}</p>
                {t.controlledBy?.tribeId && (
                  <p className="text-primary-400 mt-1">
                    [{t.controlledBy.tribeId.tag}] {t.controlledBy.tribeId.name}
                  </p>
                )}
              </>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}

export default GameMap;
