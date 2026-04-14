import { useState, useEffect, useCallback, useRef } from 'react';

const O9_AGENTS = ['Signal Agent', 'Integration Agent', 'Data Quality Agent'];

const O9_CALLOUT = {
  'Signal Agent': 'Primary O9 touchpoint: listens for webhook-style triggers and validates scenario intent before the mesh runs.',
  'Integration Agent': 'Primary O9 touchpoint: loads plan/forecast/actual-style facts as the system would from O9 datasets.',
  'Data Quality Agent': 'Primary O9 touchpoint: enforces clean, analysis-ready frames before ML and planning agents consume data.',
};

/** Concise copy aligned with backend orchestration (nodes + NikeDataLoader). */
const AGENT_DETAILS = {
  'Orchestrator Agent': {
    type: 'Script',
    does: 'Authorizes the run and maps the active scenario to the full multi-agent execution path.',
    data: 'Scenario id from the workbench (trend-surge, allocation, markdown) and orchestration context.',
    calc: 'Deterministic routing and trace emission—no trained model.',
  },
  'Signal Agent': {
    type: 'Script',
    does: 'Ingests and validates the trigger so only registered scenario types enter the pipeline.',
    data: 'Trigger source string; O9-style event registry rules.',
    calc: 'Allowlist check against known scenarios; emits authorization traces.',
  },
  'External Data Agent': {
    type: 'Script',
    does: 'Pulls a lightweight market-demand signal used to color downstream intelligence.',
    data: 'Pipeline variance volume (or default) as a proxy for external telemetry.',
    calc: 'Sentiment index = baseline + scaled variance cap (bounded formula).',
  },
  'Integration Agent': {
    type: 'Script',
    does: 'Materializes all synthetic Nike fact tables into memory for the mesh.',
    data: 'CSV facts under New Synthetic Data (actual/lag, demand, MAPE, procurement, etc.).',
    calc: 'Row counts and load latency via pandas; no ML training step.',
  },
  'Data Quality Agent': {
    type: 'Script',
    does: 'Scores dataset hygiene before ML and planning agents consume frames.',
    data: 'Actual/lag forecast frame and accuracy/MAPE frame from the loader.',
    calc: 'Null counts, total cells, and quality % = (cells − nulls) / cells.',
  },
  'Demand Agent': {
    type: 'ML',
    does: 'Surge, allocation, or markdown-specific demand diagnostics from SKU-level actual vs forecast.',
    data: 'Actual/lag forecast CSV (dynamic Actual / Forecast / Item columns).',
    calc: 'Max variance row, z-score vs distribution, groupbys for top SKUs, margin-gap stats.',
  },
  'Feature Engineering Agent': {
    type: 'Script',
    does: 'Derives scenario-aware features (elasticity, seasonality index) for downstream scoring.',
    data: 'Scenario id and anomaly variance volume from state.',
    calc: 'Elasticity and seasonality coefficients from deterministic rules on variance.',
  },
  'Forecasting Agent': {
    type: 'ML',
    does: 'Surfaces portfolio-level forecast accuracy context for the planner view.',
    data: 'Financial summary from loader (MAPE, revenue, volume).',
    calc: 'Reads average MAPE; ties to ETS-style narrative in traces (portfolio KPI).',
  },
  'Scenario Agent': {
    type: 'LLM',
    does: 'Generates ranked mitigation strategies as structured JSON for the UI.',
    data: 'Variance, scenario, top impacted SKUs; optional OpenRouter LLM call.',
    calc: 'LLM synthesis plus sort by confidence, cost parse, and risk score (deterministic tie-break).',
  },
  'Allocation Agent': {
    type: 'ML',
    does: 'Identifies network hotspots for inventory movement narratives.',
    data: 'Actual/lag (or related) frame; optional location / DC columns when present.',
    calc: 'Groupby on location-like columns to pick dominant node; otherwise default DC label.',
  },
  'Risk Agent': {
    type: 'Script',
    does: 'Combines demand volatility with forecast error to produce a single risk posture.',
    data: 'Variance from state; MAPE and financial summary from loader.',
    calc: 'Weighted blend of normalized variance and MAPE → risk score and pass/fail style status.',
  },
  'Cost Agent': {
    type: 'Script',
    does: 'Estimates operational cash impact of the active scenario path.',
    data: 'Variance, scenario type, revenue/holding heuristics from financial summary.',
    calc: 'Scenario-specific cost multipliers (e.g. expedite vs markdown vs holding spillover).',
  },
  'KPI Simulation Agent': {
    type: 'ML',
    does: 'Projects how key dashboard KPIs might shift after mitigation.',
    data: 'Current MAPE and revenue baseline from financial summary.',
    calc: 'Rule-based MAPE delta string and turnover narrative (simulation, not retraining).',
  },
  'Optimization Gateway': {
    type: 'Script',
    does: 'Applies hard gates before autonomous handoff (e.g. high-variance audit path).',
    data: 'Anomaly variance volume from upstream agents.',
    calc: 'Threshold compare on variance; boolean approve / escalate flags.',
  },
  'Conflict Resolution Agent': {
    type: 'ML',
    does: 'Checks for metric friction when volume spikes threaten capacity assumptions.',
    data: 'Variance volume from state.',
    calc: 'Conflict count from variance threshold; narrative conflict resolver trace.',
  },
  'Decision Agent': {
    type: 'Script',
    does: 'Finalizes the autonomous branch and pauses for human-in-the-loop approval in the UI.',
    data: 'Final variance and governance flags from prior layers.',
    calc: 'Publishing decision trace; no additional numeric optimization.',
  },
  'Explanation Agent': {
    type: 'LLM',
    does: 'Formats executive-ready rationale summarizing the mesh outcome.',
    data: 'Final variance and cross-agent trace context.',
    calc: 'LLM-style narrative step (trace-only in POC) for readability.',
  },
};

function typeToClass(t) {
  const u = (t || '').toLowerCase();
  if (u === 'ml') return 'ml';
  if (u === 'llm') return 'llm';
  return 'script';
}

export default function AgentFlowchart({ activeScenario, activeNodes, completedNodes, selectedAgent, onNodeClick }) {
  const [detailAgent, setDetailAgent] = useState(null);
  const meshNodeRefs = useRef({});

  const closeDetailOnly = useCallback(() => setDetailAgent(null), []);

  const setMeshNodeRef = useCallback((cleanName) => (el) => {
    if (el) meshNodeRefs.current[cleanName] = el;
    else delete meshNodeRefs.current[cleanName];
  }, []);

  /** Keep the running agent in view inside the mesh scroll panel (parent overflow). */
  const activeMeshFocus = activeNodes?.length ? activeNodes[activeNodes.length - 1] : null;
  useEffect(() => {
    if (!activeMeshFocus) return;
    const raf = requestAnimationFrame(() => {
      const el = meshNodeRefs.current[activeMeshFocus];
      el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    });
    return () => cancelAnimationFrame(raf);
  }, [activeMeshFocus]);

  useEffect(() => {
    if (!detailAgent) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closeDetailOnly();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailAgent, closeDetailOnly]);

  const getCleanName = (name) => name.split(' [')[0];

  const getAgentState = (agentName) => {
    if (!activeScenario) return 'idle';

    const cleanName = getCleanName(agentName);
    const cleanSelected = selectedAgent ? getCleanName(selectedAgent) : null;

    if (cleanSelected && cleanSelected !== cleanName) {
      return 'dimmed';
    }

    if (activeNodes.includes(cleanName)) return 'running';
    if (completedNodes.includes(cleanName)) return 'completed';
    return 'pending';
  };

  const renderNode = (agentName) => {
    const cleanName = getCleanName(agentName);
    const state = getAgentState(agentName);
    const isO9 = O9_AGENTS.includes(cleanName);
    const isSelected = selectedAgent === cleanName;

    let style = {
      padding: '8px 16px',
      borderRadius: '6px',
      border: '1px solid var(--border-color)',
      backgroundColor: '#f8fafc',
      color: 'var(--text-muted)',
      fontSize: '0.8rem',
      fontWeight: '500',
      textAlign: 'center',
      minWidth: '140px',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      opacity: state === 'idle' || state === 'dimmed' ? 0.3 : 1,
      position: 'relative',
    };

    if (state === 'running') {
      style.border = '2px solid var(--status-running)';
      style.backgroundColor = '#fffbeb';
      style.color = '#b45309';
      style.boxShadow = '0 0 0 4px rgba(245, 158, 11, 0.1)';
      style.transform = 'scale(1.05)';
      style.zIndex = 10;
    } else if (state === 'completed') {
      style.border = '2px solid var(--status-completed)';
      style.backgroundColor = '#ecfdf5';
      style.color = '#047857';
    } else if (state === 'pending') {
      style.border = '1px dashed var(--accent)';
      style.color = 'var(--text-main)';
      style.backgroundColor = '#fff';
    }

    if (isSelected) {
      style.border = '2px solid var(--blue)';
      style.boxShadow = '0 0 15px rgba(37, 99, 235, 0.2)';
      style.opacity = 1;
    }

    const handleClick = (e) => {
      e.stopPropagation();
      if (isSelected) {
        onNodeClick(null);
        setDetailAgent(null);
      } else {
        onNodeClick(cleanName);
        setDetailAgent(cleanName);
      }
    };

    const rootRef = setMeshNodeRef(cleanName);
    const scrollPad = { scrollMarginTop: 56, scrollMarginBottom: 56 };

    if (isO9) {
      return (
        <div
          ref={rootRef}
          style={{
            padding: '4px',
            border: '2px solid #dc2626',
            borderRadius: '8px',
            display: 'inline-block',
            animation: 'pulse-red 2s infinite',
            ...scrollPad,
          }}
          data-mesh-agent={cleanName}
        >
          <div
            style={style}
            onClick={handleClick}
            title="Click for details and log filter"
          >
            {agentName}
          </div>
          <style>{`
            @keyframes pulse-red {
              0% { box-shadow: 0 0 0 0px rgba(220, 38, 38, 0.4); }
              70% { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
              100% { box-shadow: 0 0 0 0px rgba(220, 38, 38, 0); }
            }
          `}</style>
        </div>
      );
    }

    return (
      <div
        ref={rootRef}
        style={{ ...style, ...scrollPad }}
        onClick={handleClick}
        title="Click for details and log filter"
        data-mesh-agent={cleanName}
      >
        {agentName}
      </div>
    );
  };

  const lineStyle = {
    width: '2px',
    height: '24px',
    backgroundColor: 'var(--border-color)',
    margin: '0 auto',
    opacity: selectedAgent ? 0.2 : 1,
    transition: 'opacity 0.3s',
  };

  const layerStyle = {
    border: '1px dashed #cbd5e1',
    borderRadius: '12px',
    padding: '16px',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    opacity: selectedAgent ? 0.4 : 1,
    transition: 'opacity 0.3s',
  };

  const layerLabelStyle = {
    position: 'absolute',
    top: '-8px',
    left: '12px',
    background: '#fff',
    padding: '0 8px',
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    fontWeight: '700',
    letterSpacing: '1px',
  };

  const detail = detailAgent ? AGENT_DETAILS[detailAgent] : null;
  const detailIsO9 = detailAgent && O9_AGENTS.includes(detailAgent);

  if (!activeScenario) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', color: 'var(--text-muted)' }}>
        Awaiting Scenario Trigger...
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transformOrigin: 'top center', padding: '20px 0' }}>

        {renderNode('Orchestrator Agent [Script]')}
        <div style={lineStyle}></div>

        <div style={{ ...layerStyle, width: '100%' }}>
          <div style={layerLabelStyle}>Input Layer</div>
          <div style={{ display: 'flex', gap: '32px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
            {renderNode('Signal Agent [Script]')}
            {renderNode('External Data Agent [Script]')}
            {renderNode('Integration Agent [Script]')}
          </div>
          <div style={lineStyle}></div>
          {renderNode('Data Quality Agent [Script]')}
        </div>

        <div style={lineStyle}></div>

        <div style={{ ...layerStyle, width: '100%' }}>
          <div style={layerLabelStyle}>Intelligence Layer</div>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            {renderNode('Demand Agent [ML]')}
            {renderNode('Feature Engineering Agent [Script]')}
          </div>
          <div style={lineStyle}></div>
          {renderNode('Forecasting Agent [ML]')}
        </div>

        <div style={lineStyle}></div>

        <div style={{ ...layerStyle, width: '100%' }}>
          <div style={layerLabelStyle}>Planning Layer</div>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            {renderNode('Scenario Agent [LLM]')}
            {renderNode('Allocation Agent [ML]')}
          </div>
        </div>

        <div style={lineStyle}></div>

        <div style={{ ...layerStyle, width: '100%' }}>
          <div style={layerLabelStyle}>Evaluation Layer</div>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {renderNode('Risk Agent [Script]')}
            {renderNode('Cost Agent [Script]')}
            {renderNode('KPI Simulation Agent [ML]')}
            {renderNode('Optimization Gateway [Script]')}
          </div>
        </div>

        <div style={lineStyle}></div>

        <div style={{ ...layerStyle, width: '100%' }}>
          <div style={layerLabelStyle}>Decision Layer</div>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            {renderNode('Conflict Resolution Agent [ML]')}
            {renderNode('Decision Agent [Script]')}
          </div>
        </div>

        <div style={lineStyle}></div>

        <div style={{ ...layerStyle, width: '100%' }}>
          <div style={layerLabelStyle}>Interaction & UI Layer</div>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            {renderNode('Explanation Agent [LLM]')}
          </div>
        </div>
      </div>

      {detailAgent && detail && (
        <div
          className="agent-mesh-detail-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="agent-mesh-detail-heading"
          onClick={closeDetailOnly}
        >
          <div className="agent-mesh-detail-card" onClick={(e) => e.stopPropagation()}>
            <div className="agent-mesh-detail-card-hd">
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 id="agent-mesh-detail-heading" className="agent-mesh-detail-title">
                  {detailAgent}
                </h2>
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className={`agent-mesh-type-pill type-${typeToClass(detail.type)}`}>
                    {detail.type}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 600 }}>Agent type</span>
                </div>
              </div>
              <button type="button" className="agent-mesh-detail-close" onClick={closeDetailOnly} aria-label="Close details">
                ✕
              </button>
            </div>

            <div className="agent-mesh-detail-body">
              <ul className="agent-mesh-detail-list">
                <li>
                  <span className="agent-mesh-detail-k">What it does · </span>
                  {detail.does}
                </li>
                <li>
                  <span className="agent-mesh-detail-k">Data used · </span>
                  {detail.data}
                </li>
                <li>
                  <span className="agent-mesh-detail-k">Calculations · </span>
                  {detail.calc}
                </li>
              </ul>

              {detailIsO9 && O9_CALLOUT[detailAgent] && (
                <div className="agent-mesh-detail-o9">
                  <strong>O9 integration</strong>
                  {O9_CALLOUT[detailAgent]}
                </div>
              )}

              <div className="agent-mesh-detail-foot">
                <strong style={{ color: 'var(--text2)' }}>Tip · </strong>
                The intelligence stream can filter to this agent while it stays selected. Click the same node again to clear the filter, or press Esc to close this panel only.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
