import React, { useMemo } from 'react';

function parseCostValue(c) {
  if (!c || String(c).includes('N/A')) return 999999;
  return parseInt(String(c).replace(/[^0-9]/g, ''), 10) || 0;
}

/** Same ranking as PlannerWorkbench: confidence DESC, cost ASC, risk score ASC */
function bestMitigationIndex(options) {
  if (!options?.length) return -1;
  const flagged = options.findIndex((o) => o.best_option === true);
  if (flagged >= 0) return flagged;

  let best = 0;
  for (let i = 1; i < options.length; i++) {
    const a = options[best];
    const b = options[i];
    const ca = a.confidence || 0;
    const cb = b.confidence || 0;
    if (cb > ca) {
      best = i;
      continue;
    }
    if (cb < ca) continue;

    const costA = parseCostValue(a.cost);
    const costB = parseCostValue(b.cost);
    if (costB < costA) {
      best = i;
      continue;
    }
    if (costB > costA) continue;

    if ((b.risk?.score ?? 100) < (a.risk?.score ?? 100)) best = i;
  }
  return best;
}

export default function OptimalOptions({
  options,
  onSelect,
  selectedOption,
  selectionLocked = false,
  /** When false (e.g. “additional routes” modal), hide “Best option” — global best is in the top-3 table. */
  showBestBadge = true,
}) {
  const bestIdx = useMemo(() => {
    if (!showBestBadge) return -1
    return bestMitigationIndex(options)
  }, [options, showBestBadge])

  if (!options || options.length === 0) return null;

  return (
    <div
      style={{
        animation: 'fadeUp 0.5s ease',
        ...(selectionLocked
          ? { pointerEvents: 'none', userSelect: 'none', cursor: 'not-allowed' }
          : {}),
      }}
      title={selectionLocked ? 'Restored snapshot is read-only — run a new scenario to change strategy' : undefined}
    >
      <div className="sc-table-container">
        <table className={`sc-table sc-table-optimal${selectionLocked ? ' sc-table-optimal--locked' : ''}`}>
          <thead>
            <tr>
              <th className="sc-col-pillar">Pillar</th>
              <th className="sc-col-compact">Confidence</th>
              <th className="sc-col-strategy">Mitigation Strategy</th>
              <th className="sc-col-cost">Est. Cost</th>
              <th className="sc-col-compact">Speed (ETA)</th>
              <th className="sc-col-compact">Coverage</th>
              <th className="sc-col-compact">Risk Profile</th>
            </tr>
          </thead>
          <tbody>
            {options.map((opt, idx) => {
              const isSelected = selectedOption && selectedOption.title === opt.title;
              const conf = opt.confidence || 85;
              const confColor = conf >= 90 ? '#22c55e' : conf >= 75 ? '#f59e0b' : '#64748b';
              const pillar = opt.pillar || 'Demand';
              const isBestOption = idx === bestIdx;

              return (
                <tr
                  key={idx}
                  className={`${isSelected ? 'selected' : ''}${selectionLocked ? ' sc-table-row-locked' : ''}`}
                  onClick={() => {
                    if (!selectionLocked) onSelect(opt);
                  }}
                  aria-disabled={selectionLocked ? true : undefined}
                  title={selectionLocked ? 'Restored snapshot is read-only' : undefined}
                >
                  <td className="sc-col-pillar" style={{ verticalAlign: 'middle' }}>
                    <span className={`pillar-badge pillar-${pillar}`}>
                      {pillar}
                    </span>
                  </td>
                  <td className="sc-col-compact sc-col-val" style={{ verticalAlign: 'middle' }}>
                    <div
                      className="sc-conf-pill sc-opt-metric-val"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 8px',
                        borderRadius: '20px',
                        background: '#f8fafc',
                        border: '1px solid var(--border)',
                        fontWeight: 700,
                        color: confColor,
                      }}
                    >
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: confColor, flexShrink: 0 }}></div>
                      {conf}%
                    </div>
                  </td>
                  <td className="sc-col-strategy">
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                        marginBottom: '2px',
                      }}
                    >
                      <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: '13px' }}>
                        {opt.title}
                      </div>
                      {isBestOption && (
                        <span className="best-option-badge" title="Highest confidence (tie-break: lower cost, then lower risk)">
                          Best option
                        </span>
                      )}
                    </div>
                    <div className="sc-strategy-action">
                      {opt.action}
                    </div>
                  </td>
                  <td className="sc-col-cost sc-col-val" style={{ verticalAlign: 'middle' }}>
                    <span className="badge-cost sc-opt-cost-val" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '6px', fontWeight: 700 }}>
                      {opt.cost}
                    </span>
                  </td>
                  <td className="sc-col-compact sc-col-val" style={{ verticalAlign: 'middle' }}>
                    <div className="speed-badge sc-opt-metric-val">
                      <span className="speed-icon">⏱️</span>
                      <span>{opt.eta || 'Immediate'}</span>
                    </div>
                  </td>
                  <td className="sc-col-compact sc-col-val" style={{ verticalAlign: 'middle' }}>
                    <div className="coverage-box sc-opt-metric-val">
                      {opt.volume_impact || '95%'}
                    </div>
                  </td>
                  <td className="sc-col-compact sc-col-val" style={{ verticalAlign: 'middle' }}>
                    <div className="risk-badge sc-risk-compact">
                      <div className={`risk-dot ${opt.risk?.color || 'green'}`}></div>
                      <span className="risk-label">{opt.risk?.label || 'Low'}</span>
                      <span className="risk-score">({opt.risk?.score || 12}%)</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
