from langgraph.graph import StateGraph, END
from .state import AgentState
from .nodes import *

def build_orchestrator_graph() -> StateGraph:
    workflow = StateGraph(AgentState)

    # Add 17 Agent Nodes (Copilot removed)
    workflow.add_node("Orchestrator Agent", orchestrator_agent)
    
    # Input Layer
    workflow.add_node("Signal Agent", signal_agent)
    workflow.add_node("External Data Agent", external_data_agent)
    workflow.add_node("Integration Agent", integration_agent)
    workflow.add_node("Data Quality Agent", data_quality_agent)
    
    # Intelligence Layer
    workflow.add_node("Demand Agent", demand_agent)
    workflow.add_node("Feature Engineering Agent", feature_eng_agent)
    workflow.add_node("Forecasting Agent", forecasting_agent)
    
    # Planning Layer
    workflow.add_node("Scenario Agent", scenario_agent)
    workflow.add_node("Allocation Agent", allocation_agent)
    
    # Evaluation Layer
    workflow.add_node("Risk Agent", risk_agent)
    workflow.add_node("Cost Agent", cost_agent)
    workflow.add_node("KPI Simulation Agent", kpi_sim_agent)
    workflow.add_node("Optimization Gateway", optimization_gateway)
    
    # Decision Layer
    workflow.add_node("Conflict Resolution Agent", conflict_res_agent)
    workflow.add_node("Decision Agent", decision_agent)
    
    # Interaction Layer (Final Output)
    workflow.add_node("Explanation Agent", explanation_agent)

    # ══════ GRAPH EDGES (Conditional Logic) ══════
    workflow.set_entry_point("Orchestrator Agent")
    
    def route_orchestrator(state: AgentState):
        source = state.get("trigger_source", "")
        if source == "trend-surge":
            return "Signal Agent"
        elif source == "allocation":
            return "Integration Agent"
        elif source == "markdown":
            return "Signal Agent"
        return "Data Quality Agent"

    workflow.add_conditional_edges("Orchestrator Agent", route_orchestrator)

    # 1. Trend Surge Path (Strictly Sequential)
    workflow.add_edge("Signal Agent", "External Data Agent")
    workflow.add_edge("External Data Agent", "Data Quality Agent")
    
    # 2. Allocation Path
    workflow.add_edge("Integration Agent", "Data Quality Agent")
    
    # Intelligence Routing
    def route_intelligence(state: AgentState):
        source = state.get("trigger_source", "")
        if source == "allocation":
            return ["Feature Engineering Agent"]
        return ["Demand Agent"]  # Both trend-surge and markdown go through Demand Agent

    workflow.add_conditional_edges("Data Quality Agent", route_intelligence)
    
    # strictly sequential intelligence
    workflow.add_edge("Feature Engineering Agent", "Forecasting Agent")
    workflow.add_edge("Demand Agent", "Forecasting Agent")
    
    workflow.add_edge("Forecasting Agent", "Scenario Agent")
    workflow.add_edge("Scenario Agent", "Allocation Agent")

    # Planning & Evaluation Routing
    def route_planning(state: AgentState):
        source = state.get("trigger_source", "")
        if source == "allocation":
            return ["Optimization Gateway"]
        return ["Risk Agent"]  # Both trend-surge and markdown go through Risk -> Cost -> KPI
        
    workflow.add_conditional_edges("Allocation Agent", route_planning)
    
    # Convergence to Decision (Strictly Sequential)
    workflow.add_edge("Risk Agent", "Cost Agent")
    workflow.add_edge("Cost Agent", "KPI Simulation Agent")
    workflow.add_edge("KPI Simulation Agent", "Decision Agent")
    
    workflow.add_edge("Optimization Gateway", "Conflict Resolution Agent")
    workflow.add_edge("Conflict Resolution Agent", "Decision Agent")

    # Output Layer
    workflow.add_edge("Decision Agent", "Explanation Agent")
    workflow.add_edge("Explanation Agent", END)

    return workflow.compile()
