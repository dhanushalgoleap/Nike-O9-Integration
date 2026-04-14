from typing import TypedDict, List, Dict, Any, Optional
from typing import Annotated
import operator

class AgentState(TypedDict):
    """
    The shared state payload traversing the Nike Unified Mesh.
    All agents read from and mutate this singular state bus.
    """
    trigger_source: str                  
    datasets_path: str                   # Passing the synthetic path location
    
    # Live Data
    active_dataset_sample: str           # Sample of the Excel data passed to LLMs to avoid hallucinations
    anomaly_variance_volume: int         # Live-calculated math metric piped across agents dynamically
    data_summary: Optional[Dict[str, Any]] # Structured metrics for LLM context (MAPE, Top SKUs, etc)
    # Canonical scenario problem (UI + Scenario Agent + recommendation prompts)
    problem_context: Optional[Dict[str, Any]]
    
    # Generated Outputs
    generated_options: List[Dict[str, Any]] # e.g. [{title: '', cost: '', service_level: '', details: ''}]
    
    # Execution telemetry stream.
    execution_logs: Annotated[List[Dict[str, Any]], operator.add]
