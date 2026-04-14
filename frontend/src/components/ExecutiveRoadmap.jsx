import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';

// Specialized high-speed typewriter
const ExecutiveTypewriter = ({ text, onComplete, isActive }) => {
  const [displayedText, setDisplayedText] = useState('');
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isActive) return;

    const safe = text ?? '';
    setDisplayedText('');

    let i = 0;
    const interval = setInterval(() => {
      if (i >= safe.length) {
        clearInterval(interval);
        onCompleteRef.current?.();
        return;
      }
      // Capture index for this tick — do not read `i` inside setState; React may run the
      // updater after later ticks have advanced `i`, which skipped every 2nd character.
      const charIndex = i;
      i += 1;
      setDisplayedText((prev) => prev + safe.charAt(charIndex));
    }, 15);

    return () => clearInterval(interval);
  }, [text, isActive]);

  if (!isActive && displayedText === '') return null;
  return <span>{displayedText}</span>;
}

export default function ExecutiveRoadmap({ recommendation, isProcessing, onApprove, approveDisabled = false, instantDisplay = false }) {
  const [revealStage, setRevealStage] = useState(0); 
  // 0: Summary typing
  // 1: Metrics & SKUs revealed
  // 2: Roadmap/Risks sequence...
  
  const [activeRoadmapStep, setActiveRoadmapStep] = useState(-1);
  const [activeRiskItem, setActiveRiskItem] = useState(-1);

  // Reset logic when recommendation changes (live: typewriter; restored snapshot: show everything immediately)
  useLayoutEffect(() => {
    if (!recommendation) return;
    if (instantDisplay) {
      const roadmaps = recommendation.roadmap || [];
      const risks = recommendation.risks || [];
      setRevealStage(1);
      setActiveRoadmapStep(roadmaps.length > 0 ? roadmaps.length - 1 : -1);
      setActiveRiskItem(risks.length > 0 ? risks.length - 1 : -1);
    } else {
      setRevealStage(0);
      setActiveRoadmapStep(-1);
      setActiveRiskItem(-1);
    }
  }, [recommendation, instantDisplay]);

  if (isProcessing) {
    return (
      <div className="ctx-box exec-processing-banner" style={{ animation: 'pulse 2s infinite' }}>
        Synthesizing high-fidelity executive roadmap and ROI projections...
      </div>
    );
  }

  if (!recommendation) return null;

  const data = recommendation;
  const roadmapCount = (data.roadmap || []).length;
  const risksCount = (data.risks || []).length;

  const timelineReady =
    revealStage >= 1 &&
    (activeRiskItem === risksCount - 1 ||
      (risksCount === 0 && roadmapCount > 0 && activeRoadmapStep === roadmapCount - 1) ||
      (roadmapCount === 0 && risksCount === 0));

  // instantDisplay is only used for restored snapshots — no O9 approval on historical view
  const canSubmitApprove = timelineReady && !approveDisabled && !instantDisplay;
  const approveButtonMuted = approveDisabled || instantDisplay;

  return (
    <div className="exec-container">
      {/* 1. DECISION SUMMARY - WITH 15ms TYPING */}
      <div className="summary-banner">
        {instantDisplay ? (
          data.summary
        ) : (
          <ExecutiveTypewriter 
            text={data.summary} 
            isActive={true}
            onComplete={() => {
                setRevealStage(1);
                if (roadmapCount > 0) setActiveRoadmapStep(0);
                else if (risksCount > 0) setActiveRiskItem(0);
            }} 
          />
        )}
      </div>

      {(instantDisplay || revealStage >= 1) && (
        <div
          className="exec-body"
          style={{ animation: instantDisplay ? 'none' : 'fadeIn 0.5s ease forwards' }}
        >
          {/* 2. METRIC IMPACT */}
          <div className="metrics-grid">
            {(data.metrics || []).map((m, i) => (
              <div key={i} className="metric-pill">
                <div className="mpl-header">
                  {m.label === 'Forecast Accuracy (MAPE)' ? 'MAPE' : m.label}
                </div>
                <div className="metric-pill-row">
                  <div className="mpl-values">
                    <div className="mpl-present">Present: {m.present}</div>
                    <div className="mpl-predicted">{m.predicted}</div>
                  </div>
                  <div className={`mpl-delta ${m.status === 'good' ? 'good' : 'bad'}`}>
                    {m.delta}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 3. AFFECTED SKUs */}
          {data.affected_skus && data.affected_skus.length > 0 && (
            <div className="sku-impact-list">
              <div className="exec-section-title">Impacted product matrix</div>
              <div className="exec-sku-wrap">
                <table className="exec-sku-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Variance</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.affected_skus.map((s, i) => (
                      <tr key={i}>
                        <td>{s.sku}</td>
                        <td>{s.variance}</td>
                        <td>
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
              <div className="exec-section-title">Implementation roadmap</div>
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
                        <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{step.team}:</span>{' '}
                        {instantDisplay ? (
                          step.action
                        ) : (
                          <ExecutiveTypewriter 
                            text={step.action}
                            isActive={i === activeRoadmapStep}
                            onComplete={() => {
                                if (i < roadmapCount - 1) setActiveRoadmapStep(i + 1);
                                else if (risksCount > 0) setActiveRiskItem(0);
                            }}
                          />
                        )}
                      </div>
                      <div className="step-desc">Cost: {step.cost}</div>
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
              <div className="exec-section-title">Risk guardrails</div>
              {data.risks.map((r, i) => (
                <div 
                  key={i} 
                  className="exec-risk-card"
                  style={{
                      opacity: i <= activeRiskItem ? 1 : 0,
                      display: i <= activeRiskItem ? 'block' : 'none',
                      transition: 'opacity 0.3s'
                  }}
                >
                  <span className="exec-risk-label">
                    Risk ·{' '}
                    {instantDisplay ? (
                      r.risk
                    ) : (
                      <ExecutiveTypewriter 
                        text={r.risk}
                        isActive={i === activeRiskItem}
                        onComplete={() => {
                            if (i < risksCount - 1) setActiveRiskItem(i + 1);
                        }}
                      />
                    )}
                  </span>
                  {i <= activeRiskItem ? (
                      <span className="exec-risk-mitigation">Mitigation · {r.mitigation}</span>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {/* FOOTER ACTION */}
          <button
            type="button"
            className={`exec-approve-btn ${
              approveButtonMuted
                ? 'exec-approve-btn--muted'
                : !timelineReady
                  ? 'exec-approve-btn--waiting'
                  : 'exec-approve-btn--active'
            }`}
            disabled={!canSubmitApprove}
            onClick={() => {
              if (!canSubmitApprove || !onApprove) return;
              onApprove();
            }}
          >
            {instantDisplay
              ? 'Approve available only after a new scenario run'
              : approveDisabled
                ? 'Approved — synchronized to O9'
                : 'Approve and Synchronize to O9 →'}
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
