'use client';

import { useState, useMemo, useRef } from 'react';
import { formatXOF } from '@/lib/format';

interface EvolutionPoint {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface DashboardChartProps {
  evolution: EvolutionPoint[];
}

export default function DashboardChart({ evolution }: DashboardChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeSeries, setActiveSeries] = useState<'all' | 'revenue' | 'profit'>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Format date to local French format: "09 juil."
  const formatDateLabel = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch (e) {
      return dateStr;
    }
  };

  // Format date to full French: "Jeudi 9 juillet"
  const formatDateFull = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    } catch (e) {
      return dateStr;
    }
  };

  const hasData = evolution && evolution.length > 0;

  // Determine global min and max values to dynamically scale the Y-axis
  const bounds = useMemo(() => {
    if (!hasData) return { min: 0, max: 1000 };
    
    let maxVal = 1000;
    let minVal = 0; // standard floor

    evolution.forEach((d) => {
      const highest = Math.max(d.revenue, d.expenses, d.profit);
      const lowest = Math.min(0, d.profit); // profit can be negative

      if (highest > maxVal) maxVal = highest;
      if (lowest < minVal) minVal = lowest;
    });

    // Add padding
    return {
      max: maxVal * 1.15,
      min: minVal < 0 ? minVal * 1.15 : 0
    };
  }, [evolution, hasData]);

  const svgWidth = 800;
  const svgHeight = 300;
  const paddingLeft = 95; // Prevent cutting off text
  const paddingRight = 30;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Y Coordinate scale mapper
  const getY = (val: number) => {
    const range = bounds.max - bounds.min;
    if (range === 0) return paddingTop + chartHeight / 2;
    return paddingTop + chartHeight - ((val - bounds.min) * chartHeight) / range;
  };

  // Compute coordinate points
  const points = useMemo(() => {
    if (!hasData) return [];

    const numPoints = evolution.length;
    return evolution.map((d, index) => {
      const x = numPoints > 1 
        ? paddingLeft + (index * chartWidth) / (numPoints - 1)
        : paddingLeft + chartWidth / 2;

      return {
        x,
        yRevenue: getY(d.revenue),
        yExpenses: getY(d.expenses),
        yProfit: getY(d.profit),
        raw: d,
      };
    });
  }, [evolution, bounds, chartWidth, chartHeight, hasData]);

  // SVG Paths
  const revenuePath = useMemo(() => {
    if (points.length < 2) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yRevenue}`).join(' ');
  }, [points]);

  const revenueAreaPath = useMemo(() => {
    if (points.length < 2) return '';
    const line = revenuePath;
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const baseY = getY(0); // Area extends to the 0 baseline
    return `${line} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  }, [points, revenuePath]);

  const profitPath = useMemo(() => {
    if (points.length < 2) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yProfit}`).join(' ');
  }, [points]);

  const profitAreaPath = useMemo(() => {
    if (points.length < 2) return '';
    const line = profitPath;
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const baseY = getY(0); // Closes the path on the 0 baseline
    return `${line} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  }, [points, profitPath]);

  // Y-axis labels and grid lines
  const gridLines = useMemo(() => {
    const lines = [];
    const ticks = 4;
    const range = bounds.max - bounds.min;
    
    for (let i = 0; i <= ticks; i++) {
      const val = bounds.min + (range * i) / ticks;
      if (Math.abs(val) > range * 0.05 || val === 0 || i === 0 || i === ticks) {
        lines.push({ y: getY(val), val });
      }
    }
    return lines;
  }, [bounds]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!hasData || points.length < 2 || !containerRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX * svgWidth) / rect.width;

    let closestIdx = 0;
    let minDiff = Infinity;
    points.forEach((p, idx) => {
      const diff = Math.abs(p.x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    setHoveredIndex(closestIdx);

    const p = points[closestIdx];
    const tooltipX = (p.x * rect.width) / svgWidth;
    const tooltipY = (Math.min(p.yRevenue, p.yProfit, p.yExpenses) * rect.height) / svgHeight - 85;

    setTooltipPos({ 
      x: Math.max(10, Math.min(tooltipX, rect.width - 240)), 
      y: Math.max(10, tooltipY)
    });
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  // Single Day Bar representation
  const renderSingleDayChart = () => {
    if (!hasData) return null;
    const day = evolution[0];
    
    const maxVal = Math.max(day.revenue, day.expenses, Math.abs(day.profit), 1000);
    const hCA = (day.revenue / maxVal) * 160;
    const hExp = (day.expenses / maxVal) * 160;
    const hProf = (Math.max(day.profit, 0) / maxVal) * 160;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '20px 40px 10px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: 180, gap: 40, borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          {/* Chiffre d'Affaires Column */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 80 }}>
            <div style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 13, marginBottom: 8 }}>{formatXOF(day.revenue)}</div>
            <div style={{ 
              width: 44, 
              height: Math.max(hCA, 6), 
              background: 'linear-gradient(180deg, var(--accent) 0%, rgba(250, 204, 21, 0.3) 100%)', 
              borderRadius: '6px 6px 0 0',
              boxShadow: '0 0 15px rgba(250, 204, 21, 0.2)',
              transition: 'height 0.5s ease'
            }} />
            <div style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700, marginTop: 12 }}>C.A. Encaissé</div>
          </div>

          {/* Dépenses Column */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 80 }}>
            <div style={{ color: 'var(--danger)', fontWeight: 800, fontSize: 13, marginBottom: 8 }}>{formatXOF(day.expenses)}</div>
            <div style={{ 
              width: 44, 
              height: Math.max(hExp, 6), 
              background: 'linear-gradient(180deg, var(--danger) 0%, rgba(239, 68, 68, 0.3) 100%)', 
              borderRadius: '6px 6px 0 0',
              boxShadow: '0 0 15px rgba(239, 68, 68, 0.2)',
              transition: 'height 0.5s ease'
            }} />
            <div style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700, marginTop: 12 }}>Charges</div>
          </div>

          {/* Profit Net Column */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 80 }}>
            <div style={{ color: day.profit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 800, fontSize: 13, marginBottom: 8 }}>{formatXOF(day.profit)}</div>
            <div style={{ 
              width: 44, 
              height: Math.max(hProf, day.profit < 0 ? 0 : 6), 
              background: day.profit >= 0
                ? 'linear-gradient(180deg, var(--success) 0%, rgba(16, 185, 129, 0.3) 100%)'
                : 'linear-gradient(180deg, var(--danger) 0%, rgba(239, 68, 68, 0.3) 100%)', 
              borderRadius: '6px 6px 0 0',
              boxShadow: day.profit >= 0 ? '0 0 15px rgba(16, 185, 129, 0.2)' : 'none',
              transition: 'height 0.5s ease'
            }} />
            <div style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700, marginTop: 12 }}>Profit Net</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', marginTop: 14, fontWeight: 600 }}>
          Activité du {formatDateFull(day.date)}
        </div>
      </div>
    );
  };

  // Compute baseline Y coordinate
  const yZero = getY(0);

  return (
    <div ref={containerRef} style={{
      position: 'relative',
      background: 'radial-gradient(100% 100% at 0% 0%, rgba(250, 204, 21, 0.03) 0%, rgba(0, 0, 0, 0) 100%), #101013',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '28px',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '340px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.8px' }}>
            📡 Analyse Graphique de l'Activité
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 2 }}>
            Courbe de Surplus (Profit) et Déficit (Perte) avec CA & Charges
          </span>
        </div>

        {evolution && evolution.length > 1 && (
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
            <button 
              onClick={() => setActiveSeries('all')}
              style={{
                background: activeSeries === 'all' ? 'var(--accent)' : 'transparent',
                color: activeSeries === 'all' ? '#000' : 'var(--text-secondary)',
                border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >Tout</button>
            <button 
              onClick={() => setActiveSeries('revenue')}
              style={{
                background: activeSeries === 'revenue' ? 'var(--accent)' : 'transparent',
                color: activeSeries === 'revenue' ? '#000' : 'var(--text-secondary)',
                border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >CA uniquement</button>
            <button 
              onClick={() => setActiveSeries('profit')}
              style={{
                background: activeSeries === 'profit' ? 'var(--accent)' : 'transparent',
                color: activeSeries === 'profit' ? '#000' : 'var(--text-secondary)',
                border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >Profit/Perte uniquement</button>
          </div>
        )}
      </div>

      {!hasData ? (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
          Aucune donnée disponible pour cette période
        </div>
      ) : evolution.length === 1 ? (
        renderSingleDayChart()
      ) : (
        <div style={{ position: 'relative', width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{ display: 'block', minWidth: 600 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              {/* Glow Filter for positive profit (Blue) */}
              <filter id="glow-positive" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              
              {/* Glow Filter for negative profit (Rose/Pink) */}
              <filter id="glow-negative" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* Glow Filter for CA */}
              <filter id="glow-revenue" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              
              {/* Gradients */}
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.12" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.00" />
              </linearGradient>

              {/* Blue/Sky-blue gradient for Surplus (above baseline) */}
              <linearGradient id="profitPositiveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
              </linearGradient>

              {/* Rose/Pink gradient for Deficit (below baseline - fades downwards) */}
              <linearGradient id="profitNegativeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.00" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.25" />
              </linearGradient>

              {/* Clipping Masks to split positive and negative regions at yZero */}
              <clipPath id="clip-positive">
                <rect x={paddingLeft} y={0} width={chartWidth} height={yZero} />
              </clipPath>
              <clipPath id="clip-negative">
                <rect x={paddingLeft} y={yZero} width={chartWidth} height={svgHeight - yZero} />
              </clipPath>
            </defs>

            {/* Grid lines and Y Axis values */}
            {gridLines.map((line, idx) => (
              <g key={idx}>
                <line 
                  x1={paddingLeft} 
                  y1={line.y} 
                  x2={svgWidth - paddingRight} 
                  y2={line.y} 
                  stroke="rgba(255,255,255,0.02)"
                  strokeWidth="1"
                />
                <text 
                  x={paddingLeft - 12} 
                  y={line.y + 4} 
                  fill="var(--text-secondary)" 
                  fontSize="10" 
                  fontWeight="700"
                  textAnchor="end"
                >
                  {formatXOF(line.val)}
                </text>
              </g>
            ))}

            {/* X Axis Labels */}
            {points.map((p, idx) => {
              const shouldRenderLabel = 
                points.length <= 10 || 
                idx === 0 || 
                idx === points.length - 1 || 
                idx % Math.ceil(points.length / 8) === 0;

              if (!shouldRenderLabel) return null;

              return (
                <text 
                  key={idx}
                  x={p.x} 
                  y={svgHeight - paddingBottom + 20} 
                  fill="var(--text-secondary)" 
                  fontSize="10" 
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {formatDateLabel(p.raw.date)}
                </text>
              );
            })}

            {/* BACKGROUND BARS: Expenses / Charges */}
            {activeSeries === 'all' && points.map((p, idx) => {
              const barHeight = yZero - p.yExpenses;
              const barWidth = 14;
              
              if (p.raw.expenses <= 0) return null;

              return (
                <g key={`expense-${idx}`} opacity={hoveredIndex === idx ? 0.6 : 0.22}>
                  <rect
                    x={p.x - barWidth / 2}
                    y={p.yExpenses}
                    width={barWidth}
                    height={Math.max(barHeight, 2)}
                    fill="var(--danger)"
                    rx="2"
                    style={{ transition: 'opacity 0.2s ease' }}
                  />
                </g>
              );
            })}

            {/* Dynamic 0 FCFA baseline */}
            <line 
              x1={paddingLeft} 
              y1={yZero} 
              x2={svgWidth - paddingRight} 
              y2={yZero} 
              stroke="rgba(255, 255, 255, 0.2)" 
              strokeWidth="2" 
            />
            <text
              x={svgWidth - paddingRight + 5}
              y={yZero + 4}
              fill="rgba(255, 255, 255, 0.35)"
              fontSize="9"
              fontWeight="800"
            >
              SEUIL 0
            </text>

            {/* Area Fills for CA */}
            {activeSeries !== 'profit' && revenueAreaPath && (
              <path d={revenueAreaPath} fill="url(#revenueGrad)" />
            )}

            {/* AREA FILLS for Profit Net (Split into Blue/Positive and Pink/Negative) */}
            {activeSeries !== 'revenue' && profitAreaPath && (
              <>
                {/* Positive (Surplus) Area */}
                <path 
                  d={profitAreaPath} 
                  fill="url(#profitPositiveGrad)" 
                  clipPath="url(#clip-positive)" 
                />
                {/* Negative (Deficit) Area */}
                <path 
                  d={profitAreaPath} 
                  fill="url(#profitNegativeGrad)" 
                  clipPath="url(#clip-negative)" 
                />
              </>
            )}

            {/* STROKE LINES */}
            
            {/* Chiffre d'Affaires Line */}
            {activeSeries !== 'profit' && revenuePath && (
              <path 
                d={revenuePath} 
                fill="none" 
                stroke="var(--accent)" 
                strokeWidth="3.5" 
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow-revenue)"
              />
            )}

            {/* Profit Net Lines (Split color: Blue above 0, Pink below 0) */}
            {activeSeries !== 'revenue' && profitPath && (
              <>
                {/* Positive Line (Blue) */}
                <path 
                  d={profitPath} 
                  fill="none" 
                  stroke="#3b82f6" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glow-positive)"
                  clipPath="url(#clip-positive)"
                />
                {/* Negative Line (Pink/Red) */}
                <path 
                  d={profitPath} 
                  fill="none" 
                  stroke="#f43f5e" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glow-negative)"
                  clipPath="url(#clip-negative)"
                />
              </>
            )}

            {/* Vertical tracker gridline on hover */}
            {hoveredIndex !== null && points[hoveredIndex] && (
              <line 
                x1={points[hoveredIndex].x} 
                y1={paddingTop} 
                x2={points[hoveredIndex].x} 
                y2={svgHeight - paddingBottom} 
                stroke="rgba(255, 255, 255, 0.15)" 
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            )}

            {/* Hover Points Markers */}
            {points.map((p, idx) => {
              const isHovered = hoveredIndex === idx;
              if (!isHovered) return null;

              return (
                <g key={`markers-${idx}`}>
                  {/* Revenue marker */}
                  {activeSeries !== 'profit' && (
                    <circle 
                      cx={p.x} 
                      cy={p.yRevenue} 
                      r="6" 
                      fill="var(--accent)" 
                      stroke="#101013" 
                      strokeWidth="2.5"
                    />
                  )}

                  {/* Profit marker */}
                  {activeSeries !== 'revenue' && (
                    <circle 
                      cx={p.x} 
                      cy={p.yProfit} 
                      r="6" 
                      fill={p.raw.profit >= 0 ? '#3b82f6' : '#f43f5e'} 
                      stroke="#101013" 
                      strokeWidth="2.5"
                    />
                  )}
                </g>
              );
            })}

            {/* Mouse detection overlays */}
            {points.map((p, idx) => (
              <rect 
                key={`overlay-${idx}`}
                x={p.x - 20}
                y={paddingTop}
                width={40}
                height={chartHeight}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIndex(idx)}
              />
            ))}
          </svg>

          {/* Floating dynamic HTML Tooltip */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <div style={{
              position: 'absolute',
              left: tooltipPos.x,
              top: tooltipPos.y,
              background: 'rgba(16, 16, 19, 0.96)',
              border: '1px solid rgba(250, 204, 21, 0.25)',
              borderRadius: '12px',
              padding: '14px',
              pointerEvents: 'none',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7)',
              zIndex: 100,
              minWidth: '230px',
              backdropFilter: 'blur(6px)',
              transition: 'left 0.1s ease, top 0.1s ease'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📅 {formatDateFull(points[hoveredIndex].raw.date)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>C.A. Encaissé :</span>
                  <span style={{ fontWeight: 800, color: '#fff' }}>{formatXOF(points[hoveredIndex].raw.revenue)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--danger)', fontWeight: 700 }}>Charges (Dépenses) :</span>
                  <span style={{ fontWeight: 800, color: '#fff' }}>{formatXOF(points[hoveredIndex].raw.expenses)}</span>
                </div>
                <hr style={{ border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', margin: '6px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ 
                    color: points[hoveredIndex].raw.profit >= 0 ? '#3b82f6' : '#f43f5e', 
                    fontWeight: 800 
                  }}>
                    {points[hoveredIndex].raw.profit >= 0 ? 'Surplus (Profit) :' : 'Déficit (Perte) :'}
                  </span>
                  <span style={{ 
                    fontWeight: 900, 
                    color: points[hoveredIndex].raw.profit >= 0 ? '#3b82f6' : '#f43f5e' 
                  }}>
                    {formatXOF(points[hoveredIndex].raw.profit)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Styled Legends */}
      {hasData && (
        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 14, height: 5, background: 'var(--accent)', borderRadius: 99, boxShadow: '0 0 8px var(--accent)' }} />
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>C.A. Encaissé</span>
          </div>
          {activeSeries === 'all' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 14, height: 10, background: 'var(--danger)', opacity: 0.4, borderRadius: 2 }} />
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>Charges (Dépenses)</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 14, height: 5, background: '#3b82f6', borderRadius: 99, boxShadow: '0 0 8px #3b82f6' }} />
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>Surplus (Profit &gt; 0)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 14, height: 5, background: '#f43f5e', borderRadius: 99, boxShadow: '0 0 8px #f43f5e' }} />
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>Déficit (Perte &lt; 0)</span>
          </div>
        </div>
      )}
    </div>
  );
}
