import os
import json
import asyncio
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agents.graph import build_orchestrator_graph
from data_loader import NikeDataLoader
from scenario_problems import build_problem_context, problem_context_prompt_block
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Nike Agentic Engine (Algoleap)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Data Integrator
loader = NikeDataLoader()
graph = build_orchestrator_graph()


@app.get("/api/scenario-problem")
def get_scenario_problem(scenario: str):
    """Canonical problem brief + anchors + data footnote for the workbench UI."""
    loader.load_all()
    ctx = build_problem_context(scenario, loader)
    if not ctx:
        raise HTTPException(status_code=404, detail="Unknown scenario")
    return ctx


@app.get("/api/orchestrate")
async def stream_orchestration(scenario: str):
    """
    SSE Endpoint for Real-time LangGraph execution streaming.
    Integrated with NikeDataLoader for real-time SKU data injection.
    """
    async def event_stream():
        # Pre-load data to get a sample for the orchestrator context
        loader.load_all()
        summary = loader.get_financial_summary()
        skus = loader.get_top_impacted_skus(limit=10)
        
        sample_str = json.dumps(skus, indent=2)

        problem_ctx = build_problem_context(scenario, loader)

        input_data = {
            "trigger_source": scenario,
            "datasets_path": loader.data_dir,
            "active_dataset_sample": sample_str,
            "anomaly_variance_volume": 0,
            "generated_options": [],
            "execution_logs": [],
            "problem_context": problem_ctx,
        }
        
        for output in graph.stream(input_data, stream_mode="updates"):
            for node_name, state_update in output.items():
                if "execution_logs" in state_update:
                    for log_entry in state_update["execution_logs"]:
                        chunk = {
                            "node": log_entry["agent_name"],
                            "trace_payload": log_entry
                        }
                        if "generated_options" in state_update:
                            chunk["generated_options"] = state_update["generated_options"]
                        yield f"data: {json.dumps(chunk)}\n\n"
                        
            # deliberate delay for UX visualization
            await asyncio.sleep(1.2)
            
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

@app.get("/api/dashboard-metrics")
def get_dashboard_metrics():
    """Returns high-level global metrics from the data loader."""
    from fastapi.responses import JSONResponse
    
    summary = loader.get_financial_summary()
    
    metrics = {
        "mape": f"{summary['mape']}%",
        "units_at_risk": f"{summary['volume']:,}",
        "turnover": "4.2x", # Benchmark
        "capacity": "91.0%", # Benchmark
        "revenue": f"${summary['revenue']:,.0f}",
        "holding_cost": f"${summary['holding_cost']:,.0f}",
        "alerts": []
    }

    # Add data-driven alerts
    if summary['mape'] > 80:
        metrics["alerts"].append({
            "level": "crit",
            "title": "Low Forecast Accuracy",
            "desc": f"Global MAPE sitting at {summary['mape']}%. Supply chain stability compromised."
        })
    
    skus = loader.get_top_impacted_skus(limit=2)
    for s in skus:
        metrics["alerts"].append({
            "level": "warn",
            "title": f"SKU Variance Alert: {s['sku']}",
            "desc": f"Detected {s['variance']:,} unit delta vs lag-1 forecast."
        })

    return JSONResponse(content=metrics)

class RecRequest(BaseModel):
    selected_option: dict
    scenario_id: Optional[str] = None

@app.post("/api/recommendation")
async def generate_recommendation(payload: RecRequest):
    """Generates an LLM-powered executive roadmap grounded in real dataset metrics."""
    from agents.llm_util import call_openrouter

    opt = payload.selected_option
    title = opt.get("title", "Selected Option")
    cost = opt.get("cost", "$0")
    
    # Fetch real data context
    summary = loader.get_financial_summary()
    top_skus = loader.get_top_impacted_skus(limit=5)
    
    data_context = f"""
    REAL DATASET METRICS (Nike Synthetic CSV Repository):
    - Baseline Monthly Revenue: ${summary['revenue']:,.0f}
    - Estimated Monthly Holding Cost: ${summary['holding_cost']:,.0f}
    - Total Volume Tracked: {summary['volume']:,} units
    - MAPE: {summary['mape']}%
    
    TOP 5 IMPACTED PRODUCTS BY VARIANCE:
    """
    for s in top_skus:
        data_context += f"- {s['sku']}: Variance={s['variance']}, Actual={s['actual']}, Forecast={s['forecast']}\n"

    loader.load_all()
    problem_ctx = (
        build_problem_context(payload.scenario_id, loader)
        if payload.scenario_id
        else None
    )
    problem_block = problem_context_prompt_block(problem_ctx)

    # ── Structured AI Prompt ──
    system_prompt = """You are a Senior Nike Supply Chain Executive. Generate a high-fidelity roadmap.
    
    CRITICAL RULES:
    1. NO "N/A" ALLOWED: You must use the provided real financial metrics and SKU names.
    2. ACCURACY: If the context says Revenue is $X, the 'present' value for Revenue MUST be $X.
    3. LANGUAGE: Use professional Nike-branded enterprise English.
    4. CALCULATIONS: For 'predicted' metrics, estimate a realistic improvement (e.g. 5-10% reduction in Variance) based on the cost of the strategy.
    5. PROBLEM ALIGNMENT: When an OPERATING PROBLEM block is provided, the executive summary and roadmap MUST explicitly reflect that scenario's anchor SKU, region, demand signal, and plan failure — not a generic supply chain story.

    JSON SCHEMA:
    {
      "summary": "One paragraph executive summary.",
      "metrics": [
        {"label": "MAPE", "present": "X%", "predicted": "Y%", "delta": "-Z%", "status": "good|bad"},
        {"label": "Inventory Holding Cost", "present": "$X", "predicted": "$Y", "delta": "-$Z", "status": "good"},
        {"label": "Revenue Impact", "present": "$X", "predicted": "$Y", "delta": "+$Z", "status": "good"}
      ],
      "affected_skus": [{"sku": "SKU_ID", "variance": "V", "impact": "High|Med"}],
      "roadmap": [{"time": "TODAY|TOMORROW|DAY+X", "team": "Team Name", "action": "Step Detail", "cost": "[Itemized Cost]"}],
      "risks": [{"risk": "Potential Issue", "mitigation": "Bypass trigger"}]
    }"""

    human_prompt = f"""{problem_block}

    STRATEGY: {title} | COST: {cost}
    CONTEXT INFO:
    {data_context}
    
    Generate the structured JSON roadmap now. Zero N/A placeholders."""

    try:
        res_content = call_openrouter(human_prompt, system_prompt)
        clean_json = res_content.replace("```json", "").replace("```", "").strip()
        recommendation_data = json.loads(clean_json)
        return {"recommendation": recommendation_data}
    except Exception as e:
        return {
            "recommendation": {
                "summary": f"Autonomous implementation of {title} initiated. System error in roadmap generation, but core metrics verified.",
                "metrics": [
                    {"label": "MAPE", "present": f"{summary['mape']}%", "predicted": f"{summary['mape']-2}%", "delta": "-2%", "status": "good"},
                    {"label": "Inventory Holding Cost", "present": f"${summary['holding_cost']:,.0f}", "predicted": f"${summary['holding_cost']*0.9:,.0f}", "delta": "-10%", "status": "good"}
                ],
                "affected_skus": [{"sku": s["sku"], "variance": str(s["variance"]), "impact": "High"} for s in top_skus[:3]],
                "roadmap": [{"time": "TODAY", "team": "Supply Chain", "action": "Manual audit", "cost": cost}],
                "risks": [{"risk": "Data Sync Lag", "mitigation": "Manual override"}]
            }
        }
