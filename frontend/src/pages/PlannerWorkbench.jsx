import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import AgentFlowchart from '../components/AgentFlowchart'
import ExecutionLogs from '../components/ExecutionLogs'
import OptimalOptions from '../components/OptimalOptions'
import ExecutiveRoadmap from '../components/ExecutiveRoadmap'
import './Dashboard.css' // Import the new grid/table styles

/** Tab label: "Markdown Optimization" → "Markdown Optimization Response"; "Trend Surge Response" unchanged. */
function outputTabTitle(scenarioTitle) {
  if (!scenarioTitle) return 'Output'
  const t = scenarioTitle.trim()
  if (/response$/i.test(t)) return t
  return `${t} Response`
}

/** Viewport-capped height so logs + mesh fit under the header without document scroll; bodies use internal scroll. */
const LOG_MESH_PANEL_STYLE = {
  height: 'min(440px, calc(100vh - 300px))',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
}

/** Scenario ids and display titles only — authoritative brief from GET /api/scenario-problem (mirrors backend/scenario_problems.py). */
const SCENARIOS = [
  { id: 'trend-surge', title: 'Trend Surge Response' },
  { id: 'allocation', title: 'Size/Store Allocation' },
  { id: 'markdown', title: 'Markdown Optimization' },
]

/** Same-origin `/api` in dev (Vite proxy → backend). Set `VITE_API_BASE` if the UI is not served behind that proxy. */
const API_ORIGIN = (import.meta.env.VITE_API_BASE || '').toString().replace(/\/$/, '')
function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_ORIGIN}${p}`
}

/** Client fallback when the API is unreachable — keep in sync with backend/scenario_problems.py */
const SCENARIO_PROBLEM_STATIC_FALLBACK = {
  'trend-surge': {
    id: 'trend-surge',
    title: 'Trend Surge Response',
    story:
      "We've detected a trend surge scenario: buzz online, at point-of-sale registers, and in stores picked up much faster than the regular weekly demand plan expected. Inventory is still lined up for the old pace, so the busiest stores risk running out while quieter ones may be overfed. The multi-agent network is starting now—sit tight while we pull options and a recommended path for you to review.",
    anchors: {
      keyMetric:
        '+36% sell-through (units sold as a share of available inventory) versus same-store plan over the trailing 7 days; weekend locations +43% versus prior week; search and social mention velocity about 2.1 times the four-week baseline.',
      sku:
        "DV3853-103 — exemplar men's run (West pack); comma-separated value (CSV) data may surface different highest-variance stock keeping units (SKUs)—those should appear in the data footnote and impacted lists when loaded.",
      region:
        'West Coast and Pacific Northwest priority store doors—where online buzz and point-of-sale (POS) traffic heated up first versus plan.',
      demandSpike:
        'Online, in-store, and social interest jumped ahead of the weekly demand forecast; high-velocity retail doors outrun the replenishment rhythm.',
      planFailure:
        'Inventory and flow are still tuned to the old pace—risk of stockout (running out of stock) on hot locations and excess inventory on quieter ones until the network re-bases.',
      availableData:
        'Loaded facts: actual sales versus one-period-lag forecast by item and store location for variance and surge signals; roughly twelve-thousand-row demand-input forecast; mean absolute percentage error (MAPE) and accuracy tables for portfolio forecast-error context.',
    },
    data_footnote: '',
  },
  allocation: {
    id: 'allocation',
    title: 'Size/Store Allocation',
    story:
      "We've detected a size-and-store allocation issue: the new product drop shipped with a one-pattern-fits-all push, but each retail door sells a different size curve. Some stores are stuck with sizes customers are not buying, while the sizes that sell are sitting elsewhere in the distribution network. We're launching the multi-agent run to quantify the gap and surface moves you can approve.",
    anchors: {
      keyMetric:
        'Youth sizes 4Y–7Y selling +41% above door-level plan in 22 priority store doors while adjacent sizes trail plan by 8–15%; 14 stores sit above 135% of target weeks of supply (WOS)—inventory cover measured in weeks—on the wrong size rungs.',
      sku:
        'FQ7723-400 — exemplar youth sizing ladder; use grouped totals from the comma-separated value (CSV) tables (for example, group-by item) to name real top movers where the data loader surfaces them.',
      region:
        'North America—high-traffic mall, factory outlet, and small-footprint specialty doors with different size curves.',
      demandSpike:
        'Per-store-door reality: some sizes pile up while the sizes customers want sit at other stocking locations—local sell-through diverges from a flat chain-wide shipment pattern.',
      planFailure:
        'One-pattern-fits-all allocation ignored door format, size curve, and capacity — global targets can look fine while the wrong sizes are in the wrong stores.',
      availableData:
        'Loaded facts: actual versus lagged forecast by item, store or warehouse location, and customer group; procurement-style forecasts for rebalance and stock-transfer narratives.',
    },
    data_footnote: '',
  },
  markdown: {
    id: 'markdown',
    title: 'Markdown Optimization',
    story:
      "We've detected a markdown (planned price reduction) and clearance scenario: last season's product is moving slower than the sales plan, and fixed markdown calendar dates mean we either cut price too late, too little, or deeper than necessary on gross margin. The agents are initiating now to recommend timing and depth so we clear stock without giving away more margin than needed.",
    anchors: {
      keyMetric:
        'Regional clearance pool sell-through minus 19 percentage points versus plan quarter to date (QTD); 37% of units past the 12-week aging gate; promotional price lifts to date captured only about 64% of planned clearance unit volume.',
      sku:
        'CW2289-111 — exemplar seasonal lifestyle capsule; pair with high-variance or slow-moving lines from comma-separated value (CSV) data when listing impacted stock keeping units (SKUs).',
      region:
        'Northeast and Mid-Atlantic—full-price stores and factory outlet overlap where clearance timing hits gross margin.',
      demandSpike:
        'Sell-through is behind the sales plan; inventory pools are aging past target weeks—pressure to clear stock without over-cutting price.',
      planFailure:
        'Fixed markdown calendar versus reality: price cuts land too late, too shallow, or too deep—not aligned to inventory age, price elasticity, or minimum allowed prices by sales channel.',
      availableData:
        'Loaded facts: actual versus lagged forecast for margin-gap style signals; demand-input and procurement forecasts; mean absolute percentage error (MAPE) and accuracy metrics for narrative on forecast quality.',
    },
    data_footnote: '',
  },
}

/** Labels aligned to each scenario story; keys match brief.anchors (API + fallback). */
const PROBLEM_BRIEF_FACT_ROWS = {
  'trend-surge': [
    { key: 'keyMetric', label: 'Surge metric' },
    { key: 'sku', label: 'Anchor product (SKU)' },
    { key: 'region', label: 'Region / scope' },
    { key: 'demandSpike', label: 'Signal vs plan' },
    { key: 'planFailure', label: 'Plan gap' },
    { key: 'availableData', label: 'Available data' },
  ],
  allocation: [
    { key: 'keyMetric', label: 'Allocation skew' },
    { key: 'sku', label: 'Anchor product (SKU)' },
    { key: 'region', label: 'Region / scope' },
    { key: 'demandSpike', label: 'Size / store signal' },
    { key: 'planFailure', label: 'Plan gap' },
    { key: 'availableData', label: 'Available data' },
  ],
  markdown: [
    { key: 'keyMetric', label: 'Clearance metric' },
    { key: 'sku', label: 'Anchor product (SKU)' },
    { key: 'region', label: 'Region / scope' },
    { key: 'demandSpike', label: 'Sell-through & aging' },
    { key: 'planFailure', label: 'Plan gap' },
    { key: 'availableData', label: 'Available data' },
  ],
}

function cloneProblemBrief(b) {
  if (!b) return null
  return {
    ...b,
    anchors: b.anchors ? { ...b.anchors } : {},
  }
}

const SCENARIO_BRIEF_CHAR_MS = 17

/** Types the problem story, then reveals facts; calls onFullyRevealed once when the full brief is on screen. */
function ScenarioProblemBriefTyper({ scenarioKey, brief, skipTyping, onFullyRevealed }) {
  const [storyLen, setStoryLen] = useState(0)
  const [factsVisible, setFactsVisible] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    doneRef.current = false
    setStoryLen(0)
    setFactsVisible(false)

    const fireDone = () => {
      if (doneRef.current) return
      doneRef.current = true
      onFullyRevealed?.()
    }

    if (!brief?.story) {
      fireDone()
      return
    }

    if (skipTyping) {
      setStoryLen(brief.story.length)
      setFactsVisible(true)
      fireDone()
      return
    }

    const full = brief.story
    let i = 0
    const id = setInterval(() => {
      i += 1
      setStoryLen(i)
      if (i >= full.length) {
        clearInterval(id)
        setFactsVisible(true)
        fireDone()
      }
    }, SCENARIO_BRIEF_CHAR_MS)

    return () => clearInterval(id)
  }, [scenarioKey, brief?.story, brief?.title, skipTyping, onFullyRevealed])

  const storySlice = brief.story.slice(0, storyLen)
  const showCaret = !skipTyping && storyLen < brief.story.length

  return (
    <div
      className="sc-scenario-problem"
      role="region"
      aria-label={`Use case problem: ${brief.title}`}
    >
      <p className="sc-scenario-problem-story">
        {storySlice}
        {showCaret ? <span className="sc-scenario-problem-caret" aria-hidden="true" /> : null}
      </p>
      {factsVisible ? (
        <ul className="sc-scenario-problem-facts">
          {(PROBLEM_BRIEF_FACT_ROWS[brief.id] || PROBLEM_BRIEF_FACT_ROWS['trend-surge']).map(
            ({ key, label }) => {
              const val = brief.anchors?.[key]
              if (key === 'availableData' && !val) return null
              if (!val) return null
              return (
                <li key={key}>
                  <span className="sc-scenario-problem-k">{label}</span>
                  <span className="sc-scenario-problem-v">{val}</span>
                </li>
              )
            }
          )}
        </ul>
      ) : null}
      {factsVisible && brief.data_footnote ? (
        <p className="sc-scenario-problem-footnote">{brief.data_footnote}</p>
      ) : null}
    </div>
  )
}

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
  /** Live run only: SSE starts after problem brief finishes typing. Restored sessions skip typing and set this true in doRestoreActivity. */
  const [problemBriefIntroComplete, setProblemBriefIntroComplete] = useState(false)
  /** Canonical problem brief from API (aligned with strategies + roadmap prompts). */
  const [problemBrief, setProblemBrief] = useState(null)
  const [problemBriefLoading, setProblemBriefLoading] = useState(false)
  const problemBriefRef = useRef(null)

  // Refs
  const gridRef = useRef(null)
  const recommendationsRef = useRef(null)

  // Persistence State
  const [activities, setActivities] = useState(() => {
    const saved = localStorage.getItem('nike_recent_activities');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    problemBriefRef.current = problemBrief
  }, [problemBrief])

  useEffect(() => {
    if (!activeScenario || selectedActivityId) return
    const ac = new AbortController()
    setProblemBriefLoading(true)
    setProblemBrief(null)
    fetch(
      apiUrl(`/api/scenario-problem?scenario=${encodeURIComponent(activeScenario)}`),
      { signal: ac.signal }
    )
      .then((r) => {
        if (!r.ok) throw new Error(`scenario-problem ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (ac.signal.aborted) return
        if (data?.id) {
          setProblemBrief(cloneProblemBrief(data))
          return
        }
        const fb = SCENARIO_PROBLEM_STATIC_FALLBACK[activeScenario]
        if (fb) setProblemBrief(cloneProblemBrief(fb))
      })
      .catch((e) => {
        if (e.name === 'AbortError') return
        if (ac.signal.aborted) return
        const fb = SCENARIO_PROBLEM_STATIC_FALLBACK[activeScenario]
        const meta = SCENARIOS.find((s) => s.id === activeScenario)
        setProblemBrief(
          cloneProblemBrief(fb) || {
            id: activeScenario,
            title: meta?.title || activeScenario,
            story:
              'Scenario problem context could not be loaded. Start the backend (see execute.md) or use the Vite dev server so /api is proxied to port 8000.',
            anchors: { sku: '—', region: '—', demandSpike: '—', planFailure: '—' },
            data_footnote: '',
          }
        )
      })
      .finally(() => {
        if (!ac.signal.aborted) setProblemBriefLoading(false)
      })
    return () => ac.abort()
  }, [activeScenario, selectedActivityId])

  const scenarioBriefPlaybackKey = selectedActivityId
    ? `restore-${selectedActivityId}`
    : activeScenario || ''

  const handleScenarioBriefFullyRevealed = useCallback(() => {
    setProblemBriefIntroComplete(true)
  }, [])

  const outputSectionLabel = useMemo(() => {
    if (selectedActivityId) {
      const act = activities.find((a) => a.id === selectedActivityId)
      if (act?.scenarioTitle) return outputTabTitle(act.scenarioTitle)
    }
    if (activeScenario) {
      const sc = SCENARIOS.find((s) => s.id === activeScenario)
      if (sc?.title) return outputTabTitle(sc.title)
    }
    return 'Output'
  }, [activeScenario, selectedActivityId, activities])

  /** Output on screen (strategies or restored snapshot) → history lists all use cases; else filter by selected use case. */
  const hasVisibleOutput = options.length > 0 || Boolean(selectedActivityId)

  const historyListActivities = useMemo(() => {
    if (hasVisibleOutput) return activities
    if (activeScenario) return activities.filter((a) => a.scenarioId === activeScenario)
    return activities
  }, [activities, activeScenario, hasVisibleOutput])

  const historyExplorerSubtext = useMemo(() => {
    const n = historyListActivities.length
    if (hasVisibleOutput) return `${n} snapshot${n === 1 ? '' : 's'} · all use cases`
    if (activeScenario) return `${n} snapshot${n === 1 ? '' : 's'} · this use case only`
    return `${n} snapshot${n === 1 ? '' : 's'}`
  }, [historyListActivities.length, hasVisibleOutput, activeScenario])

  /** Live run: hide all output body content until brief is done, then until SSE + log queue + typewriter have finished. */
  const liveRunAwaitingMeshComplete =
    Boolean(activeScenario) &&
    !selectedActivityId &&
    (problemBriefLoading ||
      !problemBrief ||
      !problemBriefIntroComplete ||
      isProcessing ||
      isTyping ||
      logQueue.length > 0)

  // Persist activities whenever they change
  useEffect(() => {
    localStorage.setItem('nike_recent_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    if (!activeScenario || selectedActivityId || !problemBriefIntroComplete || !problemBrief) return;

    // Auto-scroll to grid
    if (gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    // Reset state for new run (also clears any stale data if brief replayed)
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

    const eventSource = new EventSource(apiUrl(`/api/orchestrate?scenario=${encodeURIComponent(activeScenario)}`));

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
  }, [activeScenario, selectedActivityId, problemBriefIntroComplete, problemBrief]);

  // Promote buffered strategies only after backend stream ends AND all agent logs finished playing in the UI
  useEffect(() => {
    if (!activeScenario || selectedActivityId || !problemBriefIntroComplete || !problemBrief) return
    if (isProcessing || isTyping || logQueue.length > 0) return
    if (bufferedOptions.length > 0) {
      setOptions(bufferedOptions)
    }
  }, [isProcessing, isTyping, logQueue.length, bufferedOptions, activeScenario, selectedActivityId, problemBriefIntroComplete, problemBrief])

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
    if (selectedActivityId) return
    setSelectedOpt(opt);
    setIsProcessingRec(true);
    try {
      const res = await fetch(apiUrl('/api/recommendation'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_option: opt, scenario_id: activeScenario })
      });
      const data = await res.json();
      setRecommendation(data.recommendation);
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

  const doRestoreActivity = (act) => {
    setSelectedActivityId(act.id);
    setActiveScenario(act.scenarioId);
    setProblemBriefIntroComplete(true);
    if (act.problemContext) {
      setProblemBrief(act.problemContext);
      setProblemBriefLoading(false);
    } else {
      setProblemBrief(null);
      setProblemBriefLoading(true);
      fetch(apiUrl(`/api/scenario-problem?scenario=${encodeURIComponent(act.scenarioId)}`))
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => {
          if (data?.id) setProblemBrief(cloneProblemBrief(data));
          else {
            const fb = SCENARIO_PROBLEM_STATIC_FALLBACK[act.scenarioId];
            if (fb) setProblemBrief(cloneProblemBrief(fb));
          }
        })
        .catch(() => {
          const fb = SCENARIO_PROBLEM_STATIC_FALLBACK[act.scenarioId];
          const meta = SCENARIOS.find((s) => s.id === act.scenarioId);
          setProblemBrief(
            cloneProblemBrief(fb) || {
              id: act.scenarioId,
              title: meta?.title || act.scenarioId,
              story: 'Restored session — using embedded scenario brief (API unavailable).',
              anchors: { sku: '—', region: '—', demandSpike: '—', planFailure: '—' },
              data_footnote: '',
            }
          );
        })
        .finally(() => setProblemBriefLoading(false));
    }
    setLogQueue([]);
    setIsTyping(false);
    setLogs(act.logs || []);
    setCompletedNodes(act.completedNodes || []);
    setOptions(act.options || []);
    setBufferedOptions(act.bufferedOptions || []);
    setSelectedOpt(act.selectedOpt);
    setRecommendation(act.recommendation);
    setActiveSection('outputs');
    setIsProcessing(false);
    setIsProcessingRec(false);
    setActiveNodes([]);
    setIsHistoryModalOpen(false);
    setConfirmDialog(null);
    setO9ApproveLocked(false);
    setO9SyncConfirmOpen(false);
  };

  const performScenarioSwitch = (scId) => {
    setLogs([]);
    setLogQueue([]);
    setCompletedNodes([]);
    setOptions([]);
    setBufferedOptions([]);
    setSelectedOpt(null);
    setRecommendation(null);
    setActiveNodes([]);
    setSelectedActivityId(null);
    setProblemBrief(null);
    setProblemBriefIntroComplete(false);
    setActiveScenario(scId);
    setActiveSection('logs');
    setO9ApproveLocked(false);
    setO9SyncConfirmOpen(false);
  };

  const exitRestoredSnapshot = () => {
    setSelectedActivityId(null);
    setProblemBrief(null);
    setProblemBriefLoading(false);
    setLogs([]);
    setLogQueue([]);
    setCompletedNodes([]);
    setOptions([]);
    setBufferedOptions([]);
    setSelectedOpt(null);
    setRecommendation(null);
    setActiveNodes([]);
    setActiveScenario(null);
    setProblemBriefIntroComplete(false);
    setIsProcessing(false);
    setIsTyping(false);
    setConfirmDialog(null);
    setO9ApproveLocked(false);
    setO9SyncConfirmOpen(false);
  };

  const openO9SyncConfirm = () => {
    if (selectedActivityId || o9ApproveLocked || !selectedOpt || !recommendation) return;
    setO9SyncConfirmOpen(true);
  };

  const confirmO9SyncAndPersist = () => {
    if (selectedActivityId || !activeScenario || !selectedOpt || !recommendation) {
      setO9SyncConfirmOpen(false);
      return;
    }
    const currentScenario = SCENARIOS.find((s) => s.id === activeScenario);
    const newActivity = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      scenarioId: activeScenario,
      scenarioTitle: currentScenario?.title || 'Unknown',
      problemContext: problemBriefRef.current,
      logs,
      completedNodes,
      options,
      bufferedOptions,
      selectedOpt,
      recommendation,
    };
    setActivities((prev) => {
      const filtered = prev.filter((a) => a.id !== newActivity.id);
      return [newActivity, ...filtered].slice(0, 10);
    });
    showToast("Strategy synchronized to O9");
    setO9ApproveLocked(true);
    setO9SyncConfirmOpen(false);
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
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [o9SyncConfirmOpen, setO9SyncConfirmOpen] = useState(false);
  const [o9ApproveLocked, setO9ApproveLocked] = useState(false);

  useEffect(() => {
    setO9ApproveLocked(false);
  }, [recommendation]);

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
  const top3MitigationOptions = sortedOptions.slice(0, 3)
  const additionalMitigationRoutes = sortedOptions.slice(3)

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
                <div className="sc-modal-title">Additional mitigation routes</div>
                <div className="sc-modal-sub">
                  {options.length} routes generated total — top 3 by confidence are in Optimal Mitigation strategies.
                  {additionalMitigationRoutes.length > 0
                    ? ` Showing ${additionalMitigationRoutes.length} additional (ranked 4–${options.length}).`
                    : ' No additional routes beyond the top 3.'}
                </div>
              </div>
              <button className="sc-modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <div className="sc-modal-body">
              {additionalMitigationRoutes.length > 0 ? (
                <OptimalOptions
                  options={additionalMitigationRoutes}
                  onSelect={(opt) => {
                    handleOptionSelect(opt)
                    setIsModalOpen(false)
                  }}
                  selectedOption={selectedOpt}
                  selectionLocked={Boolean(selectedActivityId)}
                  showBestBadge={false}
                />
              ) : (
                <p
                  style={{
                    margin: '24px 20px 32px',
                    fontSize: '14px',
                    lineHeight: 1.55,
                    color: 'var(--text2)',
                  }}
                >
                  All generated routes fit in the top three by confidence — there are no extra routes to list here.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm: restore / leave snapshot / exit snapshot */}
      {confirmDialog && (
        <div className="sc-modal-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="sc-modal-content sc-modal-confirm" onClick={e => e.stopPropagation()}>
            <div className="sc-modal-confirm-inner">
              {confirmDialog.type === 'restore' && (
                <>
                  <h3 className="sc-modal-confirm-title">Restore this response?</h3>
                  <p className="sc-modal-confirm-text">
                    The workspace will switch to this saved snapshot ({confirmDialog.activity.scenarioTitle} · {confirmDialog.activity.timestamp}). You can leave the snapshot later to run a new scenario. Until then, strategies and roadmap stay fixed.
                  </p>
                </>
              )}
              {confirmDialog.type === 'leaveRestore' && (
                <>
                  <h3 className="sc-modal-confirm-title">Leave restored snapshot?</h3>
                  <p className="sc-modal-confirm-text">
                    Starting another use case will replace the restored response on screen. This does not delete saved history.
                  </p>
                </>
              )}
              {confirmDialog.type === 'exitRestore' && (
                <>
                  <h3 className="sc-modal-confirm-title">Exit restored snapshot?</h3>
                  <p className="sc-modal-confirm-text">
                    You will return to an empty workspace until you select a use case and run the orchestrator again.
                  </p>
                </>
              )}
            </div>
            <div className="sc-modal-confirm-actions">
              <button type="button" className="sc-btn-ghost" onClick={() => setConfirmDialog(null)}>
                Cancel
              </button>
              {confirmDialog.type === 'restore' && (
                <button
                  type="button"
                  className="sc-btn-primary"
                  onClick={() => doRestoreActivity(confirmDialog.activity)}
                >
                  Restore response
                </button>
              )}
              {confirmDialog.type === 'leaveRestore' && (
                <button
                  type="button"
                  className="sc-btn-primary"
                  onClick={() => {
                    performScenarioSwitch(confirmDialog.scenarioId);
                    setConfirmDialog(null);
                  }}
                >
                  Continue
                </button>
              )}
              {confirmDialog.type === 'exitRestore' && (
                <button type="button" className="sc-btn-primary" onClick={exitRestoredSnapshot}>
                  Exit snapshot
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* O9 sync confirmation — persists Recent Activity only after OK */}
      {o9SyncConfirmOpen && (
        <div className="sc-modal-overlay" onClick={() => setO9SyncConfirmOpen(false)}>
          <div className="sc-modal-content sc-modal-confirm" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="sc-modal-confirm-inner">
              <h3 className="sc-modal-confirm-title">Synchronize to O9?</h3>
              <p className="sc-modal-confirm-text">
                Your selected mitigation option <strong style={{ color: "var(--text)" }}>{selectedOpt?.title}</strong> and the executive roadmap actions will be <strong style={{ color: "var(--text)" }}>queued</strong> for execution in o9. Downstream steps will follow the decision values and workflow encoded in this recommendation (teams, timings, and costs as shown in the roadmap).
              </p>
              <p className="sc-modal-confirm-text" style={{ marginBottom: 0 }}>
                After confirmation, this session will appear under <strong style={{ color: "var(--text)" }}>Recent Activity</strong>. You will not be able to submit the same approval again until you generate a new roadmap (e.g. by choosing another strategy).
              </p>
            </div>
            <div className="sc-modal-confirm-actions">
              <button type="button" className="sc-btn-ghost" onClick={() => setO9SyncConfirmOpen(false)}>
                Cancel
              </button>
              <button type="button" className="sc-btn-primary" onClick={confirmO9SyncAndPersist}>
                OK
              </button>
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
                <div className="sc-modal-title">Recent Activity</div>
                <div className="sc-modal-sub">{historyExplorerSubtext}</div>
              </div>
              <button className="sc-modal-close" onClick={() => setIsHistoryModalOpen(false)}>✕</button>
            </div>
            <div className="sc-modal-body" style={{ padding: '24px' }}>
              {historyListActivities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)', fontSize: '13px' }}>
                  No snapshots match this view. Select a use case and run the orchestrator, or open history when output is visible to see all use cases.
                </div>
              ) : (
                <div className="sc-activity-grid">
                  {historyListActivities.map((act) => (
                    <div key={act.id} className="sc-activity-card">
                      <div className="sc-activity-card-hd">
                        <div className="sc-activity-card-tag">{act.scenarioTitle}</div>
                        <div className="sc-activity-card-time">{act.timestamp}</div>
                      </div>
                      <div className="sc-activity-card-title">
                        Impacted: {act.selectedOpt?.title || 'Unknown Route'}
                      </div>
                      <div className="sc-activity-card-strategy">
                        {(act.recommendation?.summary || '').substring(0, 100)}
                        {(act.recommendation?.summary || '').length > 100 ? '…' : ''}
                      </div>
                      <div className="sc-activity-card-footer">
                        <div
                          className="sc-activity-restore-btn"
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsHistoryModalOpen(false);
                            setConfirmDialog({ type: 'restore', activity: act });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setIsHistoryModalOpen(false);
                              setConfirmDialog({ type: 'restore', activity: act });
                            }
                          }}
                        >
                          Restore response →
                        </div>
                        <button type="button" className="sc-activity-delete" onClick={(e) => deleteActivity(e, act.id)}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
          {SCENARIOS.map(sc => (
            <button
              key={sc.id}
              type="button"
              className={`sc-pill ${activeScenario === sc.id ? 'active' : ''}`}
              onClick={() => {
                if (isProcessing) return;
                if (selectedActivityId) {
                  setConfirmDialog({ type: 'leaveRestore', scenarioId: sc.id });
                  return;
                }
                performScenarioSwitch(sc.id);
              }}
            >
              {sc.title}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '20px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <div className="sc-section-pills">
            <button 
              className={`sc-sec-pill ${activeSection === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveSection('logs')}
            >
              Agent Orchestration Logs
            </button>
            <button
              type="button"
              className={`sc-sec-pill ${activeSection === 'outputs' ? 'active' : ''}`}
              onClick={() => setActiveSection('outputs')}
            >
              {outputSectionLabel}
            </button>
          </div>
        </div>

        {problemBriefLoading && !problemBrief && (
          <div className="sc-scenario-problem sc-scenario-problem--loading" role="status">
            Loading detected scenario…
          </div>
        )}
        {problemBrief && (
          <ScenarioProblemBriefTyper
            key={scenarioBriefPlaybackKey}
            scenarioKey={scenarioBriefPlaybackKey}
            brief={problemBrief}
            skipTyping={Boolean(selectedActivityId)}
            onFullyRevealed={handleScenarioBriefFullyRevealed}
          />
        )}
      </div>

      <div className="sc-grid-2x2" ref={gridRef}>
        {/* --- SECTION 1: LOGS & FLOW --- */}
        {activeSection === 'logs' && (
          <div className="sc-grid-row" style={{ animation: 'slideRight 0.4s ease' }}>
            <div className="sc-grid-col" style={{ flex: '0.4', minHeight: 0 }}>
              <div className="panel" style={LOG_MESH_PANEL_STYLE}>
                <div className="panel-hd" style={{ flexShrink: 0 }}>
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
                    instantPlayback={Boolean(selectedActivityId)}
                  />
                </div>
              </div>
            </div>

            <div className="sc-grid-col" style={{ flex: '0.6', minHeight: 0 }}>
              <div className="panel" style={LOG_MESH_PANEL_STYLE}>
                <div className="panel-hd" style={{ flexShrink: 0 }}>
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
                <div className="sc-agent-mesh-body">
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
            {selectedActivityId && (
              <div className="sc-restore-lock-banner">
                <div className="sc-restore-lock-banner-msg">
                  Restored snapshot · {activities.find((a) => a.id === selectedActivityId)?.scenarioTitle}{' '}
                  <span>(read-only — pick another use case or exit to change)</span>
                </div>
                <button
                  type="button"
                  className="sc-btn-ghost"
                  style={{ flexShrink: 0 }}
                  onClick={() => setConfirmDialog({ type: 'exitRestore' })}
                >
                  Exit snapshot
                </button>
              </div>
            )}

            {liveRunAwaitingMeshComplete ? (
              <div className="panel" style={{ minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', padding: '48px 24px', maxWidth: '440px', color: 'var(--text3)' }}>
                  <div style={{ fontSize: '28px', marginBottom: '12px' }}>⏳</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>Agents are still running</div>
                  <div style={{ fontSize: '13px', lineHeight: 1.55 }}>
                    Use <strong style={{ color: 'var(--text2)' }}>Agent Orchestration Logs</strong> to follow progress.
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* RECENT ACTIVITY — only after live mesh is done (or idle), or alongside restored snapshot */}
                {activities.length > 0 && (
                  <div className="sc-history-trigger" onClick={() => setIsHistoryModalOpen(true)}>
                    <div className="sc-history-info">
                      <div className="sc-history-icon-box">📜</div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>Recent Activity</div>
                        <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{historyExplorerSubtext}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div className="sc-pills" style={{ marginRight: '10px' }}>
                        {historyListActivities.slice(0, 3).map((act) => (
                          <div key={act.id} className="sc-activity-icon" style={{ width: '28px', height: '28px', fontSize: '10px', marginLeft: '-10px', border: '2px solid #fff' }}>
                            {act.scenarioTitle.charAt(0)}
                          </div>
                        ))}
                      </div>
                      <button type="button" className="sc-route-badge">View history</button>
                    </div>
                  </div>
                )}

                {(options.length > 0 || selectedActivityId) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="panel" style={{ minHeight: '400px' }}>
                      <div className="panel-hd">
                        <div className="panel-title">Optimal Mitigation strategies</div>
                        <button
                          className="sc-route-badge"
                          onClick={() => setIsModalOpen(true)}
                          title={
                            additionalMitigationRoutes.length > 0
                              ? 'View additional routes (beyond top 3 by confidence)'
                              : 'View route count — all routes are in the table above'
                          }
                        >
                          {options.length} routes generated
                          {additionalMitigationRoutes.length > 0
                            ? ` · ${additionalMitigationRoutes.length} more`
                            : ''}
                        </button>
                      </div>
                      <div style={{ padding: '0px' }}>
                        <OptimalOptions
                          options={top3MitigationOptions}
                          onSelect={handleOptionSelect}
                          selectedOption={selectedOpt}
                          selectionLocked={Boolean(selectedActivityId)}
                        />
                      </div>
                    </div>

                    <div className="panel panel-exec-roadmap" ref={recommendationsRef}>
                      <div className="panel-hd">
                        <div className="panel-title">Executive Roadmap & Recommendations</div>
                      </div>
                      <div className="panel-exec-roadmap-body">
                        {!selectedOpt && (
                          <div className="exec-roadmap-empty">
                            <div className="exec-roadmap-empty-icon" aria-hidden="true">🎯</div>
                            <p className="exec-roadmap-empty-text">
                              Select an optimal strategy from the table above to view the detailed execution roadmap.
                            </p>
                          </div>
                        )}

                        <ExecutiveRoadmap
                          recommendation={recommendation}
                          isProcessing={isProcessingRec}
                          onApprove={openO9SyncConfirm}
                          approveDisabled={o9ApproveLocked}
                          instantDisplay={Boolean(selectedActivityId)}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="panel" style={{ minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', padding: '48px 24px', maxWidth: '420px', color: 'var(--text3)' }}>
                      <div style={{ fontSize: '28px', marginBottom: '12px' }}>📋</div>
                      {!activeScenario && (
                        <>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>No use case selected</div>
                          <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
                            Choose Trend Surge Response, Size/Store Allocation, or Markdown Optimization above to run the orchestrator. Results will appear here when agents finish.
                          </div>
                        </>
                      )}
                      {activeScenario && (
                        <>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>No strategies in this session</div>
                          <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
                            This run did not return mitigation routes. Try another use case or review Agent Orchestration Logs for details.
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
