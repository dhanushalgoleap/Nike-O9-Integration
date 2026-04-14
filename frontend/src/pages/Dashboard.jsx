import React from 'react'
import './Dashboard.css'

/** Short demo setup — each scenario is one clear “before” story the workbench then helps fix. */
const SCENARIO_PROBLEM_DOCS = [
  {
    num: 1,
    id: 'trend-surge',
    title: 'Trend Surge Response',
    tag: 'Something gets hot overnight',
    story:
      'Buzz online and in stores picks up fast—much faster than the regular weekly plan expected. The demo shows how we spot that jump early and move inventory so busy stores do not run out while quieter ones are not overfed.',
    focus: 'Sense & respond to demand spikes',
  },
  {
    num: 2,
    id: 'allocation',
    title: 'Size / Store Allocation',
    tag: 'Same product, different stores, different sizes',
    story:
      'We shipped the new style the same way to many doors, but each store sells different sizes. In the demo, some stores are stuck with sizes customers do not want, while the sizes that sell sit somewhere else in the network.',
    focus: 'Local size curves vs. flat allocation',
  },
  {
    num: 3,
    id: 'markdown',
    title: 'Markdown Optimization',
    tag: 'Last season’s stock is moving too slowly',
    story:
      'Older seasonal items are not selling through on time. Markdowns follow a fixed calendar, so we either cut price too late or too deep. The demo shows smarter timing and depth so we clear stock without giving away more margin than we need.',
    focus: 'Clearance timing and margin',
  },
]

const TECH_STACK_SUMMARY = [
  {
    title: 'Planner UI',
    detail:
      'React and Vite, with live updates via Server-Sent Events (SSE) so the workbench stays in sync with the backend.',
  },
  {
    title: 'API layer',
    detail: 'FastAPI — scenario context, orchestration stream, and recommendation endpoints.',
  },
  {
    title: 'Orchestration',
    detail:
      'LangGraph state graph runs the multi-agent mesh in order (same shape as the flowchart in the Planner Workbench).',
  },
  {
    title: 'Data',
    detail:
      'Pandas loads six synthetic Nike-style CSV facts from the repo (stand-in until live o9 feeds).',
  },
  {
    title: 'ML & analytics',
    detail: (
      <>
        <p className="dash-stack-algo-intro">
          <strong>In the running mesh</strong> (<code className="dash-code">backend/agents/nodes.py</code>) the agents
          labeled ML use statistical and tabular methods below. <strong>Target stack</strong> adds gradient boosting and
          explainability for production-style scoring.
        </p>
        <ul className="dash-stack-algo-list">
          <li>
            <strong>Z-score (standard score)</strong> — <em>Demand Agent</em>, trend path: after computing absolute
            forecast-vs-actual error per SKU row, the largest deviation is compared to the mean and standard deviation of
            those errors to form a Z-score; confidence is derived from it (traces reference a z-limit). Classical
            anomaly-style signal on tabular history, not a trained neural net.
          </li>
          <li>
            <strong>Ranked aggregation (groupby + top-N)</strong> — <em>Demand Agent</em>, allocation path: group by item
            and sum actuals, then take the top three SKUs by volume for hotspot narrative.
          </li>
          <li>
            <strong>Margin-gap statistics</strong> — <em>Demand Agent</em>, markdown path: per-row forecast-minus-actual
            gap, catalog-wide mean gap, and share of rows with negative gap — descriptive distribution metrics for
            clearance-style exposure.
          </li>
          <li>
            <strong>MAPE portfolio readout</strong> — <em>Forecasting Agent</em> and <em>Risk Agent</em>: mean MAPE is
            read from loaded accuracy facts (not re-fit in-process). Traces describe an ETS-class forecast narrative;
            the POC uses the precomputed KPI from CSV.
          </li>
          <li>
            <strong>Location rollups (sum + arg-max)</strong> — <em>Allocation Agent</em>: group by location/store/DC
            column when present, sum a numeric column, take <code className="dash-code">idxmax</code> to name the
            primary hotspot node for inventory-flow messaging.
          </li>
          <li>
            <strong>Weighted linear risk score</strong> — <em>Risk Agent</em>: blends normalized variance with MAPE in a
            fixed convex mix to produce a scalar risk index and pass/critical style status — a hand-specified composite,
            not a learned model.
          </li>
          <li>
            <strong>XGBoost</strong> — <em>Target / not wired in this repo yet.</em> Gradient-boosted trees on structured
            features (gaps, location, time, attributes) for a learned priority or risk score on Nike-style tables;
            strong with mixed numeric and categorical inputs at corporate data volumes.
          </li>
          <li>
            <strong>SHAP</strong> (SHapley Additive exPlanations) — <em>Target / pairs with XGBoost.</em> Feature-level
            attribution on booster outputs so planners see <em>why</em> a row scored high; supports audit trails and
            Explanation-agent style copy grounded in drivers.
          </li>
        </ul>
        <p className="dash-stack-algo-foot">
          <strong>Not ML algorithms</strong> (rules and fixed formulas in the same graph):{' '}
          <em>KPI Simulation Agent</em> applies a fixed fraction of current MAPE for a demo delta string;{' '}
          <em>Optimization Gateway</em> and <em>Conflict Resolution Agent</em> use simple variance thresholds;{' '}
          <em>Cost Agent</em> uses scenario-specific multipliers; <em>Feature Engineering Agent</em> uses deterministic
          elasticity/seasonality scalars from variance. Those are heuristics, not trained estimators.
        </p>
      </>
    ),
  },
  {
    title: 'GenAI',
    detail:
      'OpenRouter-hosted LLM for ranked mitigation options and narrative traces.',
  },
]

/** Mirrors `backend/data_loader.py` → folder `New Synthetic Data/` at repo root. Row counts = data rows (excluding header). */
const SYNTHETIC_DATA_FOLDER = 'New Synthetic Data'
const SYNTHETIC_FILE_COUNT = 6
const SYNTHETIC_ROW_TOTAL = 2000 + 2000 + 12000 + 1 + 1000 + 1000

const SYNTHETIC_DATA_FILES = [
  {
    file: 'Fact_ActualAndLagForecast_Nike_Synthetic.csv',
    rows: 2000,
    summary:
      'Actual sales vs published lag forecasts by version, location, customer group, time bucket, and item—feeds demand anomaly / variance and SKU hotspot logic.',
  },
  {
    file: 'Fact_AccuracyAndMAPE_Nike_Synthetic.csv',
    rows: 2000,
    summary:
      'Forecast accuracy and MAPE by version, location, and item (4W / 8W / 12W windows)—drives data-quality scans and portfolio MAPE in financial summary.',
  },
  {
    file: 'Fact_DemandInputForecast_12k_Nike_Synthetic.csv',
    rows: 12000,
    summary:
      'Daily demand input forecast lines: base forecast value and quantity, buffers, policies, and capacity hints by location, domain, time, and item—largest fact; backs revenue/volume heuristics.',
  },
  {
    file: 'Fact_ProcurementForecast_Nike_Synthetic.csv',
    rows: 1000,
    summary:
      'Weekly procurement-style requirements by supplier, location, time, and item (orders, overrides, lead-time views)—supply-side context for the mesh narrative.',
  },
  {
    file: 'Fact_ProcurementForecastWithDemandType_Nike_Synthetic.csv',
    rows: 1000,
    summary:
      'Procurement forecast split by demand type and supplier activity—extends procurement facts for typed demand paths.',
  },
  {
    file: 'Fact_ExcludeExcessForecastInPast_Nike_Synthetic.csv',
    rows: 1,
    summary:
      'Tiny configuration-style fact (version + “exclude excess forecasts in the past” flag)—planning policy metadata, not a volume table.',
  },
]

/**
 * Agents match `backend/agents/graph.py` + `AgentFlowchart.jsx`.
 * ML notes reflect `backend/agents/nodes.py` where applicable.
 */
const PROJECT_AGENTS = [
  {
    name: 'Orchestrator Agent',
    type: 'Script',
    detail:
      'Starts the run and picks which branch of the graph to execute from the scenario you chose (trend surge, allocation, or markdown).',
  },
  {
    name: 'Signal Agent',
    type: 'Script',
    detail:
      'Checks that the trigger is a known scenario id (allowlist) before the rest of the mesh runs—like validating an event from a planning system.',
  },
  {
    name: 'External Data Agent',
    type: 'Script',
    detail:
      'Builds a simple market-style sentiment score from pipeline variance so downstream traces have an “external signal” without calling a real trends API.',
  },
  {
    name: 'Integration Agent',
    type: 'Script',
    detail:
      'Loads all synthetic CSV fact tables into memory with Pandas and records how many rows were ingested.',
  },
  {
    name: 'Data Quality Agent',
    type: 'Script',
    detail:
      'Scans key frames for nulls and reports a completeness percentage so agents only consume data that passes a basic hygiene check.',
  },
  {
    name: 'Demand Agent',
    type: 'ML',
    detail:
      'Uses a Z-score on absolute forecast-vs-actual error to highlight the worst SKU line (trend path), pandas groupbys for top movers (allocation path), and margin-gap stats (markdown path). Z-scores are a standard way to flag “this line is unusually far from normal” on tabular history—good for spike demos without training a deep model.',
  },
  {
    name: 'Feature Engineering Agent',
    type: 'Script',
    detail:
      'Derives scenario-style features (e.g. elasticity-style coefficient, seasonality index) from variance and scenario id for richer trace text downstream.',
  },
  {
    name: 'Forecasting Agent',
    type: 'ML',
    detail:
      'Reads portfolio MAPE from the loaded financial summary and emits planner-facing context; traces reference an ETS-style forecast narrative. MAPE is the usual retail KPI for “how wrong is the forecast”; ETS (error-trend-seasonality) is a common classical family for short-term demand—here the number is sourced from data, not re-fit live in the POC.',
  },
  {
    name: 'Scenario Agent',
    type: 'LLM',
    detail:
      'Calls OpenRouter to produce ranked mitigation strategies as JSON (six pillars, costs, risk). Falls back to fixed heuristic options if the API fails.',
  },
  {
    name: 'Allocation Agent',
    type: 'ML',
    detail:
      'Finds the busiest DC or location by summing a numeric column grouped by location/store/DC column when present. Aggregation and arg-max are fast and explainable on CSVs for “where is the hotspot?”—a stepping stone toward fuller size-curve models (e.g. Dirichlet-style mixes) in a production build.',
  },
  {
    name: 'Risk Agent',
    type: 'Script',
    detail:
      'Combines normalized variance with MAPE into one risk score and a pass/critical style status for governance messaging.',
  },
  {
    name: 'Cost Agent',
    type: 'Script',
    detail:
      'Applies scenario-specific cost heuristics (expedite vs markdown vs holding) using variance and financial summary inputs.',
  },
  {
    name: 'KPI Simulation Agent',
    type: 'ML',
    detail:
      'Projects a small MAPE delta and turnover-style narrative from current MAPE and revenue using fixed rules—not a neural net. Chosen so demo KPI shifts stay predictable and easy to narrate on stage.',
  },
  {
    name: 'Optimization Gateway',
    type: 'Script',
    detail:
      'Compares variance to a threshold to decide normal autopilot vs escalate for senior review before the decision layer.',
  },
  {
    name: 'Conflict Resolution Agent',
    type: 'ML',
    detail:
      'Flags a capacity-style conflict when variance crosses a high threshold (simple if/then). It is a transparent guardrail for the story (“big spike vs DC capacity”) without a separate trained classifier.',
  },
  {
    name: 'Decision Agent',
    type: 'Script',
    detail:
      'Ends the autonomous branch and marks the run ready for human-in-the-loop approval in the UI.',
  },
  {
    name: 'Explanation Agent',
    type: 'LLM',
    detail:
      'Formats executive-style rationale in traces (LLM-typed step in the mesh; aligns with GenAI explanation layer in the POC design).',
  },
]

export default function Dashboard() {
  return (
    <div
      className="page active dash-problems-page"
      style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 64px)' }}
    >
      <section className="dash-panel" aria-labelledby="dash-scenarios-heading">
        <div className="dash-panel-head">
          <h2 id="dash-scenarios-heading" className="dash-panel-title">
            <span className="dash-panel-step">1</span>
            Scenario problem statements
          </h2>
          <p className="dash-panel-sub">
            What each workbench run is <em>about</em> — the situation before agents propose options.
          </p>
        </div>
        <div className="dash-problems-grid">
          {SCENARIO_PROBLEM_DOCS.map((s) => (
            <article key={s.id} className="dash-problem-card">
              <div className="dash-problem-card-top">
                <span className="dash-scenario-badge" aria-hidden="true">
                  {s.num}
                </span>
                <h3 className="dash-problem-title">{s.title}</h3>
              </div>
              <p className="dash-problem-tag">{s.tag}</p>
              <p className="dash-problem-focus">
                <em>{s.focus}</em>
              </p>
              <p className="dash-problem-story">{s.story}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dash-panel" aria-labelledby="dash-tech-heading">
        <div className="dash-panel-head">
          <h2 id="dash-tech-heading" className="dash-panel-title">
            <span className="dash-panel-step">2</span>
            Tech stack <span className="dash-panel-title-soft">(high level)</span>
          </h2>
          <p className="dash-panel-sub">
            <strong>Six layers</strong> — UI, API, orchestration, data, ML/analytics, and GenAI in this build.
          </p>
        </div>
        <ol className="dash-stack-list">
          {TECH_STACK_SUMMARY.map((item, i) => (
            <li key={item.title} className="dash-stack-item">
              <span className="dash-stack-num">{i + 1}</span>
              <div className="dash-stack-body">
                <strong className="dash-stack-title">{item.title}</strong>
                <div className="dash-stack-detail">{item.detail}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="dash-panel" aria-labelledby="dash-data-heading">
        <div className="dash-panel-head">
          <h2 id="dash-data-heading" className="dash-panel-title">
            <span className="dash-panel-step">3</span>
            Synthetic data <span className="dash-panel-title-soft">(POC)</span>
          </h2>
          <p className="dash-section-lead dash-section-lead--panel">
            The backend loads <mark className="dash-mark">{SYNTHETIC_FILE_COUNT} CSV files</mark> from{' '}
            <code className="dash-code">{SYNTHETIC_DATA_FOLDER}</code> (see{' '}
            <code className="dash-code">backend/data_loader.py</code>). Together:{' '}
            <mark className="dash-mark">{SYNTHETIC_ROW_TOTAL.toLocaleString()} data rows</mark> across all facts —{' '}
            <em>Nike-style IBP naming</em> (version, location, item, time) for demos without a live o9 connection.
          </p>
        </div>
        <div className="dash-agent-table-wrap dash-data-table-wrap">
          <table className="dash-agent-table dash-data-table">
            <thead>
              <tr>
                <th scope="col" className="dash-col-narrow">
                  #
                </th>
                <th scope="col">File</th>
                <th scope="col" className="dash-col-rows">
                  Rows
                </th>
                <th scope="col">What it contains</th>
              </tr>
            </thead>
            <tbody>
              {SYNTHETIC_DATA_FILES.map((row, idx) => (
                <tr key={row.file}>
                  <td className="dash-table-idx">{idx + 1}</td>
                  <td className="dash-data-filename">{row.file}</td>
                  <td className="dash-data-rows">{row.rows.toLocaleString()}</td>
                  <td className="dash-agent-detail dash-td-prose">{row.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dash-panel dash-panel--agents" aria-labelledby="dash-agents-heading">
        <div className="dash-panel-head">
          <h2 id="dash-agents-heading" className="dash-panel-title">
            <span className="dash-panel-step">4</span>
            Agents in this project
          </h2>
          <p className="dash-section-lead dash-section-lead--panel">
            <strong>17 agents</strong> in execution order. Types match the workbench flowchart:{' '}
            <span className="dash-legend dash-legend-script">Script</span> = deterministic Python;{' '}
            <span className="dash-legend dash-legend-ml">ML</span> = pandas/numpy-style logic on tables;{' '}
            <span className="dash-legend dash-legend-llm">LLM</span> = model API (with fallbacks where noted).
          </p>
        </div>
        <div className="dash-agent-table-wrap">
          <table className="dash-agent-table dash-agent-table--readable">
            <thead>
              <tr>
                <th scope="col" className="dash-col-narrow">
                  #
                </th>
                <th scope="col">Agent</th>
                <th scope="col">Type</th>
                <th scope="col">What it does</th>
              </tr>
            </thead>
            <tbody>
              {PROJECT_AGENTS.map((row, idx) => (
                <tr key={row.name}>
                  <td className="dash-table-idx">{idx + 1}</td>
                  <td className="dash-agent-name">{row.name}</td>
                  <td>
                    <span className={`dash-type-pill dash-type-${row.type.toLowerCase()}`}>{row.type}</span>
                  </td>
                  <td className="dash-agent-detail dash-td-prose">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
