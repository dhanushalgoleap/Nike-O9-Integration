import { useEffect, useRef, useState, useCallback } from 'react';

// Typewriter effect — types text character by character
const TypewriterText = ({ text, onComplete, isActive }) => {
  const [displayedText, setDisplayedText] = useState('');
  const completedRef = useRef(false);

  useEffect(() => {
    completedRef.current = false;

    if (!isActive) {
      setDisplayedText(text);
      return;  // Don't fire onComplete for non-active items
    }

    let i = 0;
    setDisplayedText('');

    const interval = setInterval(() => {
      if (i >= text.length) {
        clearInterval(interval);
        if (!completedRef.current) {
          completedRef.current = true;
          if (onComplete) onComplete();
        }
        return;
      }
      const charIndex = i;
      i += 1;
      setDisplayedText((prev) => prev + text.charAt(charIndex));
    }, 10);

    return () => {
      clearInterval(interval);
    };
  }, [text, isActive]);

  return <span>{displayedText}</span>;
}

// Single log line — renders decision + reason with sequential typewriter
const LogLine = ({ log, isActive, onComplete, instantPlayback }) => {
  const [phase, setPhase] = useState(instantPlayback || !isActive ? 2 : 0);
  // phase 0 = typing decision, phase 1 = typing reason, phase 2 = done

  useEffect(() => {
    if (instantPlayback) setPhase(2);
  }, [instantPlayback]);

  const p = log.trace_payload;
  if (!p) return null;

  const typingActive = isActive && !instantPlayback;

  const stageColor = {
    'START': '#3b82f6',
    'ACTION': '#f59e0b',
    'OUTPUT': '#22c55e',
    'DECISION': '#22c55e',
    'ERROR': '#ef4444'
  }[p.stage] || '#94a3b8';

  const time = p.timestamp.split('T')[1].replace('Z', '').split('.')[0];

  return (
    <div style={{ marginBottom: '8px', animation: 'fadeIn 0.2s ease' }}>
      {/* Main log line */}
      <div className="sc-log-line">
        <span className="sc-log-time">{time}</span>
        <span className="sc-log-agent">[{p.agent_name.replace(' Agent', '').toUpperCase()}]</span>
        <span style={{
          fontSize: '9px',
          padding: '1px 5px',
          borderRadius: '3px',
          background: stageColor,
          color: '#fff',
          fontWeight: 700,
          marginRight: '8px',
          flexShrink: 0
        }}>
          {p.stage}
        </span>
        <span className="sc-log-text">
          {phase >= 2 ? (
            <span>{p.decision}</span>
          ) : (
            <TypewriterText
              text={p.decision}
              isActive={typingActive && phase === 0}
              onComplete={() => setPhase(1)}
            />
          )}
        </span>
      </div>
      {/* Reason sub-line — only shows after decision finishes typing */}
      {phase >= 1 && (
        <div className="sc-log-line" style={{ paddingLeft: '210px', opacity: 0.7 }}>
          <span className="sc-log-text" style={{ fontStyle: 'italic' }}>
            {phase >= 2 ? (
              <span>→ {p.reason_summary}</span>
            ) : (
              <TypewriterText
                text={`→ ${p.reason_summary}`}
                isActive={typingActive && phase === 1}
                onComplete={() => {
                  setPhase(2);
                  if (onComplete) onComplete();
                }}
              />
            )}
          </span>
        </div>
      )}
      {/* Metrics — shows instantly once done */}
      {phase >= 2 && (
        <div className="sc-log-line" style={{ paddingLeft: '210px', opacity: 0.4, fontSize: '10px' }}>
          <span>tool:{p.tool_name}</span>
          <span style={{ marginLeft: '12px' }}>lat:{p.latency_ms}ms</span>
          <span style={{ marginLeft: '12px' }}>conf:{(p.confidence * 100).toFixed(0)}%</span>
          <span style={{ marginLeft: '12px' }}>{p.agent_type}</span>
        </div>
      )}
    </div>
  );
}


export default function ExecutionLogs({ activeScenario, logs, selectedAgent, onTypingComplete, isSystemTyping, instantPlayback = false }) {
  const scrollRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (!activeScenario) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        backgroundColor: '#fafbfc'
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Select a scenario to start the multi-agent stream.</p>
      </div>
    );
  }

  // Filter logs by selected agent
  const displayLogs = selectedAgent
    ? logs.filter(l => l.node === selectedAgent)
    : logs;

  // Find the index of the last item in the FULL logs array (not filtered)
  const lastLogIndex = logs.length - 1;

  const getIdleReason = (scenario, agent) => {
    const idleMap = {
      'trend-surge': {
        'Integration Agent': 'Trend Surge begins at the Signal / External Data layers. Integration layer bypassed.',
        'Feature Engineering Agent': 'Feature Engineering maps store-level demographics, prioritized only for allocations.',
        'Optimization Gateway': 'Surge scenarios defer gateway constraints until final allocation.',
        'Conflict Resolution Agent': 'No conflicting metric weights detected for Surge workflows.'
      },
      'allocation': {
        'Signal Agent': 'Allocation is a planned integration flow. Spontaneous signals ignored.',
        'External Data Agent': 'Allocation relies on internal capacity thresholds only.',
        'Demand Agent': 'Feature engineering supersedes general Demand for allocations.',
        'Risk Agent': 'Allocation bounds managed by Optimization Gateway.'
      }
    };

    return (idleMap[scenario] && idleMap[scenario][agent]) || `${agent} bypassed for ${scenario} pipeline.`;
  };

  return (
    <div
      ref={scrollRef}
      className="sc-logs-content"
      style={{
        flex: 1,
        overflowY: 'auto',
        minHeight: 0,
        height: '100%',
        padding: '16px 20px'
      }}
    >
      {displayLogs.length === 0 && selectedAgent && (
        <div style={{ color: '#8a8f9a', fontStyle: 'italic', marginBottom: '12px', lineHeight: 1.5 }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>STATUS: IDLE BYPASS</span>
          {getIdleReason(activeScenario, selectedAgent)}
        </div>
      )}

      {displayLogs.map((log, index) => {
        // Find this log's position in the FULL array to determine if it's the active one
        const globalIndex = logs.indexOf(log);
        const isThisActive =
          !instantPlayback && globalIndex === lastLogIndex && isSystemTyping;

        return (
          <LogLine
            key={`${log.node}-${globalIndex}`}
            log={log}
            isActive={isThisActive}
            instantPlayback={instantPlayback}
            onComplete={() => onTypingComplete(log.node)}
          />
        );
      })}

      {!selectedAgent && isSystemTyping && !instantPlayback && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', marginLeft: '6px' }}>
          <div style={{ width: '8px', height: '16px', backgroundColor: 'var(--status-completed)', animation: 'blink 1s step-end infinite' }}></div>
        </div>
      )}

      <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
        `}</style>
    </div>
  );
}
