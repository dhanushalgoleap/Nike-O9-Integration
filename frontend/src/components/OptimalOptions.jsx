import React from 'react';

export default function OptimalOptions({ options, onSelect, selectedOption }) {
  if (!options || options.length === 0) return null;

  return (
    <div style={{ animation: 'fadeUp 0.5s ease' }}>
      <div className="sc-table-container">
        <table className="sc-table">
          <thead>
            <tr>
              <th>Pillar</th>
              <th>Mitigation Strategy</th>
              <th>Speed (ETA)</th>
              <th>Confidence</th>
              <th>Coverage</th>
              <th>Est. Cost</th>
              <th>Risk Profile</th>
            </tr>
          </thead>
          <tbody>
            {options.map((opt, idx) => {
              const isSelected = selectedOption && selectedOption.title === opt.title;
              const conf = opt.confidence || 85; 
              const confColor = conf >= 90 ? '#22c55e' : conf >= 75 ? '#f59e0b' : '#64748b';
              const pillar = opt.pillar || 'Demand';
              
              return (
                <tr
                  key={idx}
                  className={isSelected ? 'selected' : ''}
                  onClick={() => onSelect(opt)}
                >
                  <td style={{ verticalAlign: 'middle' }}>
                    <span className={`pillar-badge pillar-${pillar}`}>
                      {pillar}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: '13px' }}>{opt.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px', maxWidth: '300px' }}>
                      {opt.action}
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <div className="speed-badge">
                      <span className="speed-icon">⏱️</span>
                      <span>{opt.eta || 'Immediate'}</span>
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <div style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        background: '#f8fafc',
                        border: '1px solid var(--border)',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: confColor
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: confColor }}></div>
                      {conf}%
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <div className="coverage-box">
                      {opt.volume_impact || '95%'}
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <span className="badge-cost" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '11px' }}>
                      {opt.cost}
                    </span>
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <div className="risk-badge">
                      <div className={`risk-dot ${opt.risk?.color || 'green'}`}></div>
                      <span className="risk-label" style={{ fontSize: '10px' }}>{opt.risk?.label || 'Low'}</span>
                      <span className="risk-score" style={{ fontSize: '10px', opacity: 0.6 }}>({opt.risk?.score || 12}%)</span>
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
