import { useEffect, useState, useRef } from 'react'
import AgentFlowchart from '../components/AgentFlowchart'
import ExecutionLogs from '../components/ExecutionLogs'
import OptimalOptions from '../components/OptimalOptions'
import ExecutiveRoadmap from '../components/ExecutiveRoadmap'
import './Dashboard.css' // Import the new grid/table styles

export default function PlannerWorkbench() {
  const [activeScenario, setActiveScenario] = useState(null)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [selectedOpt, setSelectedOpt] = useState(null) // Tracking selection

  // Toast Notification State
  const [toast, setToast] = useState(null);
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // SSE State
  const [logs, setLogs] = useState([])
  const [logQueue, setLogQueue] = useState([])
  const [activeNodes, setActiveNodes] = useState([])
  const [completedNodes, setCompletedNodes] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [options, setOptions] = useState([])
  const [bufferedOptions, setBufferedOptions] = useState([]) // Reveal after done
  const [recommendation, setRecommendation] = useState(null)
  const [isProcessingRec, setIsProcessingRec] = useState(false)
  
  const [activeSection, setActiveSection] = useState('logs')
  const [selectedActivityId, setSelectedActivityId] = useState(null)

  // Refs
  const gridRef = useRef(null)
  const recommendationsRef = useRef(null)

  // Persistence State
  const [activities, setActivities] = useState(() => {
    const saved = localStorage.getItem('nike_recent_activities');
    return saved ? JSON.parse(saved) : [];
  });

  const scenarios = [
    { id: 'trend-surge', title: 'Trend Surge Response' },
    { id: 'allocation', title: 'Size/Store Allocation' },
    { id: 'markdown', title: 'Markdown Optimization' }
  ]

  // Persist activities whenever they change
  useEffect(() => {
    localStorage.setItem('nike_recent_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    if (!activeScenario || selectedActivityId) return;

    // Auto-scroll to grid
    if (gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    // Reset state for new run
    setLogs([]);
    setLogQueue([]);
    setActiveNodes([]);
    setCompletedNodes([]);
    setSelectedAgent(null);
    setSelectedOpt(null);
    setOptions([]);
    setBufferedOptions([]);
    setRecommendation(null);
    setIsProcessing(true);
    setIsTyping(false);

    const eventSource = new EventSource(`http://localhost:8000/api/orchestrate?scenario=${activeScenario}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.done) {
        eventSource.close();
        setIsProcessing(false);
        // REVEAL OPTIONS NOW
        return;
      }
      setLogQueue(prev => [...prev, { ...data, timestamp: new Date().toLocaleTimeString() }]);
    };

    eventSource.onerror = (err) => {
      console.error("SSE Streaming Error:", err);
      eventSource.close();
      setIsProcessing(false);
    };

    return () => eventSource.close();
  }, [activeScenario]);

  // Handle revelation of options ONLY when processing is done
  useEffect(() => {
    if (!isProcessing && bufferedOptions.length > 0 && activeScenario && !selectedActivityId) {
      setOptions(bufferedOptions);
    }
  }, [isProcessing, bufferedOptions]);

  useEffect(() => {
    if (!isTyping && logQueue.length > 0) {
      const nextLog = logQueue[0];
      setLogQueue(prev => prev.slice(1));
      setIsTyping(true);
      setActiveNodes([nextLog.node]);
      setLogs(prev => [...prev, nextLog]);

      if (nextLog.generated_options && nextLog.generated_options.length > 0) {
        setBufferedOptions(nextLog.generated_options); // Buffer them, don't show yet
      }
    }
  }, [logQueue, isTyping]);

  const handleTypingComplete = (nodeName) => {
    if (logQueue.length > 0 && logQueue[0].node === nodeName) {
      setIsTyping(false);
    } else {
      setCompletedNodes(prev => [...new Set([...prev, nodeName])]);
      setActiveNodes([]);
      setIsTyping(false);
    }
  };

  const handleOptionSelect = async (opt) => {
    setSelectedOpt(opt);
    setIsProcessingRec(true);
    setSelectedActivityId(null); // Deselect history if we start a new selection
    try {
      const res = await fetch("http://localhost:8000/api/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_option: opt })
      });
      const data = await res.json();
      setRecommendation(data.recommendation);

      // PERSIST ACTIVITY on completion
      const currentScenario = scenarios.find(s => s.id === activeScenario);
      const newActivity = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        scenarioId: activeScenario,
        scenarioTitle: currentScenario?.title || 'Unknown',
        logs: logs,
        completedNodes: completedNodes,
        options: options,
        bufferedOptions: bufferedOptions,
        selectedOpt: opt,
        recommendation: data.recommendation
      };
      setActivities(prev => {
        const filtered = prev.filter(a => a.id !== newActivity.id);
        return [newActivity, ...filtered].slice(0, 10);
      });
    } catch (e) {
      console.error(e);
      setRecommendation(null);
    }
    setIsProcessingRec(false);
    
    // Auto-scroll to recommendations with a slight delay for modal transitions
    setTimeout(() => {
      if (recommendationsRef.current) {
        recommendationsRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const restoreActivity = (act) => {
    setSelectedActivityId(act.id);
    setActiveScenario(act.scenarioId);
    setLogs(act.logs);
    setCompletedNodes(act.completedNodes);
    setOptions(act.options);
    setBufferedOptions(act.bufferedOptions);
    setSelectedOpt(act.selectedOpt);
    setRecommendation(act.recommendation);
    setActiveSection('outputs'); // Jump to results
    setIsProcessing(false);
    setIsProcessingRec(false);
    setActiveNodes([]);
    setIsHistoryModalOpen(false);
  };

  const deleteActivity = (e, id) => {
    e.stopPropagation(); // Don't trigger restore
    setActivities(prev => prev.filter(act => act.id !== id));
    if (selectedActivityId === id) {
      setSelectedActivityId(null);
    }
  };

  // --- TOP 5 LOGIC ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Sort by Efficiency (Confidence DESC -> Cost ASC -> Risk Score ASC)
  const sortedOptions = [...options].sort((a, b) => {
    // 1. Primary: Confidence (High to Low)
    if ((b.confidence || 0) !== (a.confidence || 0)) {
        return (b.confidence || 0) - (a.confidence || 0);
    }
    
    // 2. Secondary: Cost (Low to High)
    const getCostVal = (c) => {
        if (!c || c.includes('N/A')) return 999999;
        return parseInt(c.replace(/[^0-9]/g, '')) || 0;
    };
    const costA = getCostVal(a.cost);
    const costB = getCostVal(b.cost);
    if (costA !== costB) return costA - costB;

    // 3. Tertiary: Risk Score (Low to High)
    return (a.risk?.score || 100) - (b.risk?.score || 100);
  });
  const top5Options = sortedOptions.slice(0, 5);

  // AUTO-SWITCH TO OUTPUTS when processing finishes
  useEffect(() => {
    if (!isProcessing && options.length > 0 && !selectedActivityId) {
      setActiveSection('outputs');
    }
  }, [isProcessing, options]);

  return (
    <div className="sc-page active" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 64px)' }}>
      {/* ════════════ TOAST NOTIFICATION ════════════ */}
      {toast && (
        <div className="sc-toast-overlay">
          <div className="sc-toast">
            <div className="sc-toast-icon">✓</div>
            <span>{toast}</span>
          </div>
        </div>
      )}

      {/* Dynamic Strategy Modal */}
      {isModalOpen && (
        <div className="sc-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="sc-modal-content" onClick={e => e.stopPropagation()}>
            <div className="sc-modal-hd">
              <div>
                <div className="sc-modal-title">Exhaustive Mitigation Explorer</div>
                <div className="sc-modal-sub">Reviewing {options.length} AI-generated operational routes</div>
              </div>
              <button className="sc-modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <div className="sc-modal-body">
              <OptimalOptions
                options={sortedOptions}
                onSelect={(opt) => {
                  handleOptionSelect(opt);
                  setIsModalOpen(false);
                }}
                selectedOption={selectedOpt}
              />
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="sc-modal-overlay" onClick={() => setIsHistoryModalOpen(false)}>
          <div className="sc-modal-content" style={{ maxWidth: '900px' }} onClick={e => e.stopPropagation()}>
            <div className="sc-modal-hd">
              <div>
                <div className="sc-modal-title">Recent Intelligence Snapshots</div>
                <div className="sc-modal-sub">Restoring previous agentic sessions and ROI roadmaps</div>
              </div>
              <button className="sc-modal-close" onClick={() => setIsHistoryModalOpen(false)}>✕</button>
            </div>
            <div className="sc-modal-body" style={{ padding: '24px' }}>
              <div className="sc-activity-grid">
                {activities.map(act => (
                  <div key={act.id} className="sc-activity-card" onClick={() => restoreActivity(act)}>
                    <div className="sc-activity-card-hd">
                      <div className="sc-activity-card-tag">{act.scenarioTitle}</div>
                      <div className="sc-activity-card-time">{act.timestamp}</div>
                    </div>
                    <div className="sc-activity-card-title">
                      Impacted: {act.selectedOpt?.title || 'Unknown Route'}
                    </div>
                    <div className="sc-activity-card-strategy">
                      {act.recommendation?.summary?.substring(0, 100)}...
                    </div>
                    <div className="sc-activity-card-footer">
                      <div className="sc-activity-restore-btn">Restore Action →</div>
                      <button className="sc-activity-delete" onClick={(e) => deleteActivity(e, act.id)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sc-page-header">
        <div>
          <h1 className="sc-title">Nike Agentic Supply Chain Intelligence</h1>
          <p className="sc-subtitle">
            {selectedActivityId ? `Restored Session: ${activities.find(a => a.id === selectedActivityId)?.timestamp}` : 'Orchestrating multi-agent resolution mesh for real-time supply chain anomalies.'}
          </p>
        </div>
        
        <div className="sc-pills">
          {scenarios.map(sc => (
            <button
              key={sc.id}
              className={`sc-pill ${activeScenario === sc.id && !selectedActivityId ? 'active' : ''}`}
              onClick={() => {
                if (isProcessing) return;
                // Simple clear for fresh start
                setLogs([]);
                setLogQueue([]);
                setCompletedNodes([]);
                setOptions([]);
                setBufferedOptions([]);
                setSelectedOpt(null);
                setRecommendation(null);
                setActiveNodes([]);
                
                setSelectedActivityId(null);
                setActiveScenario(sc.id);
                setActiveSection('logs'); // Back to logs on new start
              }}
            >
              {sc.title}
            </button>
          ))}
        </div>
      </div>

      <div className="sc-grid-2x2" ref={gridRef}>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '12px' }}>
          <div className="sc-section-pills">
            <button 
              className={`sc-sec-pill ${activeSection === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveSection('logs')}
            >
              Agent Orchestration Logs
            </button>
            <button 
              className={`sc-sec-pill ${activeSection === 'outputs' ? 'active' : ''} ${(options.length === 0 && !selectedActivityId) ? 'disabled' : ''}`}
              onClick={() => options.length > 0 || selectedActivityId ? setActiveSection('outputs') : null}
              style={{ opacity: (options.length > 0 || selectedActivityId) ? 1 : 0.5 }}
            >
              Strategic Multi-Resolutions
            </button>
          </div>
        </div>

        {/* --- SECTION 1: LOGS & FLOW --- */}
        {activeSection === 'logs' && (
          <div className="sc-grid-row" style={{ animation: 'slideRight 0.4s ease' }}>
            <div className="sc-grid-col" style={{ flex: '0.4' }}>
              <div className="panel" style={{ height: '850px', display: 'flex', flexDirection: 'column' }}>
                <div className="panel-hd">
                  <div className="panel-title">Real-time Intelligence Stream</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {isProcessing && <div className="p-badge" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>Sensing...</div>}
                  </div>
                </div>
                <div className="logs-panel-body">
                  <ExecutionLogs 
                    activeScenario={activeScenario}
                    logs={logs} 
                    isProcessing={isProcessing}
                    isSystemTyping={isTyping}
                    onTypingComplete={handleTypingComplete}
                  />
                </div>
              </div>
            </div>

            <div className="sc-grid-col" style={{ flex: '0.6' }}>
              <div className="panel" style={{ height: '850px' }}>
                <div className="panel-hd">
                  <div className="panel-title">Multi-Agent State Mesh</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {selectedAgent && (
                      <span 
                        style={{ fontSize: '10px', color: 'var(--accent)', cursor: 'pointer', fontWeight: 800 }}
                        onClick={() => setSelectedAgent(null)}
                      >
                        Clear Filter ✕
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ padding: '16px' }}>
                  <AgentFlowchart
                    activeScenario={activeScenario}
                    activeNodes={activeNodes}
                    completedNodes={completedNodes}
                    selectedAgent={selectedAgent}
                    onNodeClick={setSelectedAgent}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- SECTION 2: OUTPUTS --- */}
        {activeSection === 'outputs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'slideLeft 0.4s ease' }}>
            {/* RECENT ACTIVITY TRIGGER */}
            {activities.length > 0 && (
              <div className="sc-history-trigger" onClick={() => setIsHistoryModalOpen(true)}>
                <div className="sc-history-info">
                  <div className="sc-history-icon-box">📜</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>Scenario History Explorer</div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{activities.length} captured snapshots available for restoration</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div className="sc-pills" style={{ marginRight: '10px' }}>
                    {activities.slice(0, 3).map(act => (
                      <div key={act.id} className="sc-activity-icon" style={{ width: '28px', height: '28px', fontSize: '10px', marginLeft: '-10px', border: '2px solid #fff' }}>
                        {act.scenarioTitle.charAt(0)}
                      </div>
                    ))}
                  </div>
                  <button className="sc-route-badge">View All History</button>
                </div>
              </div>
            )}

            {(options.length > 0 || selectedActivityId) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* OPTIMAL OPTIONS - MIDDLE LAYER */}
                <div className="panel" style={{ minHeight: '400px' }}>
                  <div className="panel-hd">
                    <div className="panel-title">Optimal Mitigation strategies</div>
                    <button
                      className="sc-route-badge"
                      onClick={() => setIsModalOpen(true)}
                      title="View Exhaustive Strategy List"
                    >
                      {options.length} routes generated
                    </button>
                  </div>
                  <div style={{ padding: '0px' }}>
                    <OptimalOptions
                      options={top5Options}
                      onSelect={handleOptionSelect}
                      selectedOption={selectedOpt}
                      showConfidence={true}
                    />
                    {isProcessing && options.length === 0 && (
                      <div style={{ padding: '20px', fontSize: '12px', color: 'var(--text3)', fontStyle: 'italic' }}>
                        Refining strategy permutations via LLM brainstorming...
                      </div>
                    )}
                  </div>
                </div>

                {/* EXECUTIVE ROADMAP - BOTTOM LAYER */}
                <div className="panel" style={{ minHeight: '600px' }} ref={recommendationsRef}>
                  <div className="panel-hd">
                    <div className="panel-title">Executive Roadmap & Recommendations</div>
                  </div>
                  <div style={{ padding: '18px' }}>
                    {!selectedOpt && (
                      <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text3)' }}>
                        <div style={{ fontSize: '24px', marginBottom: '12px' }}>🎯</div>
                        Select an optimal strategy from the table above to view the detailed execution roadmap.
                      </div>
                    )}

                    <ExecutiveRoadmap
                      recommendation={recommendation}
                      isProcessing={isProcessingRec}
                      onApprove={() => showToast("Strategy Synchronized to O9")}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
