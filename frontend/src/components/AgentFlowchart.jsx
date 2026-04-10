export default function AgentFlowchart({ activeScenario, activeNodes, completedNodes, selectedAgent, onNodeClick }) {

  const O9_AGENTS = ['Signal Agent', 'Integration Agent', 'Data Quality Agent'];

  const O9_NOTES = {
    'Signal Agent': 'Acts as the event listener for O9 webhooks. It captures real-time triggers and initiates the autonomous agentic orchestration flow.',
    'Integration Agent': 'The primary data bridge to O9. It executes O9 API calls to ingest high-volume forecasts, actuals, and inventory datasets into the agentic mesh.',
    'Data Quality Agent': 'Sanitizes O9 data streams. It identifies schema drift, null values, and anomalies to ensure downstream agents process clean, mathematically sound intelligence.'
  };

  const getCleanName = (name) => name.split(' [')[0];

  const getAgentState = (agentName) => {
    if (!activeScenario) return 'idle';
    
    const cleanName = getCleanName(agentName);
    const cleanSelected = selectedAgent ? getCleanName(selectedAgent) : null;

    // NotebookLM Mindmap style isolation:
    // If an agent is selected and it's NOT this one, dim it.
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
      position: 'relative'
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

    // Explicit Highlight for NotebookLM Mindmap isolated view
    if (isSelected) {
      style.border = '2px solid var(--blue)';
      style.boxShadow = '0 0 15px rgba(37, 99, 235, 0.2)';
      style.opacity = 1;
    }

    const nodeContent = (
      <div
        style={style}
        onClick={() => onNodeClick(isSelected ? null : cleanName)}
        title={`Click to isolate logs for ${cleanName}`}
      >
        {agentName}

        {/* O9 Note Tooltip/Callout */}
        {isSelected && isO9 && (
          <div style={{
            position: 'absolute',
            top: '110%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#fff',
            border: '1px solid #dc2626',
            borderRadius: '6px',
            padding: '12px',
            width: '280px',
            zIndex: 100,
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            textAlign: 'left',
            color: '#1e293b',
            fontSize: '11px',
            lineHeight: 1.5
          }}>
            <div style={{ color: '#dc2626', fontWeight: 700, marginBottom: '6px', fontSize: '10px', textTransform: 'uppercase' }}>O9 Integration Note</div>
            {O9_NOTES[cleanName]}
          </div>
        )}
      </div>
    );

    // If it's an O9 Agent, wrap it in the red "Highlighted Box" from the user request image
    if (isO9) {
      return (
        <div style={{
          padding: '4px',
          border: '2px solid #dc2626',
          borderRadius: '8px',
          display: 'inline-block',
          animation: 'pulse-red 2s infinite'
        }}>
          {nodeContent}
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

    return nodeContent;
  };

  const lineStyle = {
    width: '2px',
    height: '24px',
    backgroundColor: 'var(--border-color)',
    margin: '0 auto',
    opacity: selectedAgent ? 0.2 : 1,
    transition: 'opacity 0.3s'
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
    transition: 'opacity 0.3s'
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
    letterSpacing: '1px'
  };

  if (!activeScenario) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', color: 'var(--text-muted)' }}>
        Awaiting Scenario Trigger...
      </div>
    );
  }

  // Node hierarchy explicitly omitting Copilot.
  return (
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
  );
}
