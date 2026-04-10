import React, { useState, useEffect } from 'react';

// Specialized high-speed typewriter
const ExecutiveTypewriter = ({ text, onComplete, isActive }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (!isActive) return;
    
    let index = 0;
    setDisplayedText('');

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(prev => prev + text.charAt(index));
        index += 1;
      } else {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 15); // EXACTLY 15ms per character

    return () => clearInterval(interval);
  }, [text, isActive]);

  if (!isActive && displayedText === '') return null;
  return <span>{displayedText}</span>;
}

export default function ExecutiveRoadmap({ recommendation, isProcessing, onApprove }) {
  const [revealStage, setRevealStage] = useState(0); 
  // 0: Summary typing
  // 1: Metrics & SKUs revealed
  // 2: Roadmap/Risks sequence...
  
  const [activeRoadmapStep, setActiveRoadmapStep] = useState(-1);
  const [activeRiskItem, setActiveRiskItem] = useState(-1);

  // Reset logic when recommendation changes
  useEffect(() => {
    setRevealStage(0);
    setActiveRoadmapStep(-1);
    setActiveRiskItem(-1);
  }, [recommendation]);

  if (isProcessing) {
    return (
      <div className="ctx-box" style={{ animation: 'pulse 2s infinite' }}>
        Synthesizing high-fidelity executive roadmap and ROI projections...
      </div>
    );
  }

  if (!recommendation) return null;

  const data = recommendation;
  const roadmapCount = (data.roadmap || []).length;
  const risksCount = (data.risks || []).length;

  return (
    <div className="exec-container">
      {/* 1. DECISION SUMMARY - WITH 15ms TYPING */}
      <div className="summary-banner">
        <ExecutiveTypewriter 
          text={data.summary} 
          isActive={true}
          onComplete={() => {
              setRevealStage(1);
              if (roadmapCount > 0) setActiveRoadmapStep(0);
              else if (risksCount > 0) setActiveRiskItem(0);
          }} 
        />
      </div>

      {revealStage >= 1 && (
        <div style={{ animation: 'fadeIn 0.5s ease forwards', display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '20px' }}>
          
          {/* 2. METRIC IMPACT */}
          <div className="metrics-grid">
            {(data.metrics || []).map((m, i) => (
              <div key={i} className="metric-pill">
                <div className="mpl-header">{m.label}</div>
                <div className="mpl-values">
                  <div className="mpl-present">Present: {m.present}</div>
                  <div className="mpl-predicted">{m.predicted}</div>
                </div>
                <div className={`mpl-delta ${m.status === 'good' ? 'good' : 'bad'}`}>
                  {m.delta}
                </div>
              </div>
            ))}
          </div>

          {/* 3. AFFECTED SKUs */}
          {data.affected_skus && data.affected_skus.length > 0 && (
            <div className="sku-impact-list">
              <div className="mpl-header">Impacted Product Matrix</div>
              <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>SKU</th>
                      <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Variance</th>
                      <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.affected_skus.map((s, i) => (
                      <tr key={i}>
                        <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>{s.sku}</td>
                        <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{s.variance}</td>
                        <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ color: s.impact === 'High' ? 'var(--red)' : 'var(--amber)', fontWeight: 700 }}>{s.impact}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. EXECUTION ROADMAP - SEQUENTIAL TYPING */}
          {roadmapCount > 0 && (
            <div className="roadmap-section">
              <div className="mpl-header">Implementation Roadmap</div>
              <div className="timeline-list">
                {data.roadmap.map((step, i) => (
                  <div 
                    key={i} 
                    className="timeline-item" 
                    style={{ 
                        opacity: i <= activeRoadmapStep ? 1 : 0, 
                        display: i <= activeRoadmapStep ? 'flex' : 'none',
                        transition: 'opacity 0.3s'
                    }}
                  >
                    <div className="step-number">{i + 1}</div>
                    <div className="step-content">
                      <div className="step-title">
                        <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{step.team}:</span>&nbsp;
                        <ExecutiveTypewriter 
                          text={step.action}
                          isActive={i === activeRoadmapStep}
                          onComplete={() => {
                              if (i < roadmapCount - 1) setActiveRoadmapStep(i + 1);
                              else if (risksCount > 0) setActiveRiskItem(0);
                          }}
                        />
                      </div>
                      <div className="step-desc" style={{ opacity: 0.7 }}>Cost: {step.cost}</div>
                    </div>
                    <div className="time-tag">{step.time}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. RISK ASSESSMENT - SEQUENTIAL TYPING */}
          {risksCount > 0 && (
            <div className="risk-section">
              <div className="mpl-header">Risk Guardrails</div>
              {data.risks.map((r, i) => (
                <div 
                  key={i} 
                  style={{ 
                      background: '#fff7ed', 
                      border: '1px solid #ffedd5', 
                      padding: '10px', 
                      borderRadius: '6px', 
                      marginBottom: '8px', 
                      fontSize: '11px',
                      opacity: i <= activeRiskItem ? 1 : 0,
                      display: i <= activeRiskItem ? 'block' : 'none',
                      transition: 'opacity 0.3s'
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#9a3412', display: 'block', marginBottom: '2px' }}>
                    ➤ RISK:&nbsp;
                    <ExecutiveTypewriter 
                      text={r.risk}
                      isActive={i === activeRiskItem}
                      onComplete={() => {
                          if (i < risksCount - 1) setActiveRiskItem(i + 1);
                      }}
                    />
                  </span>
                  {i <= activeRiskItem ? (
                      <span style={{ color: '#c2410c' }}>MITIGATION: {r.mitigation}</span>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {/* FOOTER ACTION */}
          <button 
            onClick={() => onApprove && onApprove()}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: '10px',
              transition: 'all 0.2s ease',
              opacity: (activeRiskItem === risksCount - 1 || (risksCount === 0 && activeRoadmapStep === roadmapCount - 1)) ? 1 : 0.3
            }}
          >
            Approve and Synchronize to O9 →
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
