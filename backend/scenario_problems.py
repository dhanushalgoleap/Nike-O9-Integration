"""
Canonical scenario problem briefs (single source of truth for UI + LLM prompts).
Anchors must stay aligned with strategies (Scenario Agent) and roadmap (recommendation API).
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

# Keys mirror frontend camelCase for JSON API consumption.
SCENARIO_PROBLEMS: Dict[str, Dict[str, Any]] = {
    "trend-surge": {
        "id": "trend-surge",
        "title": "Trend Surge Response",
        "story": (
            "We've detected a trend surge scenario: buzz online, at point-of-sale registers, and in stores picked up "
            "much faster than the regular weekly demand plan expected. Inventory is still lined up for the old pace, so "
            "the busiest stores risk running out while quieter ones may be overfed. The multi-agent network is starting "
            "now—sit tight while we pull options and a recommended path for you to review."
        ),
        "anchors": {
            "keyMetric": (
                "+36% sell-through (units sold as a share of available inventory) versus same-store plan over the "
                "trailing 7 days; weekend locations +43% versus prior week; search and social mention velocity about "
                "2.1 times the four-week baseline."
            ),
            "sku": (
                "DV3853-103 — exemplar men's run (West pack); comma-separated value (CSV) data may surface different "
                "highest-variance stock keeping units (SKUs)—those should appear in the data footnote and impacted lists "
                "when loaded."
            ),
            "region": (
                "West Coast and Pacific Northwest priority store doors—where online buzz and point-of-sale (POS) traffic "
                "heated up first versus plan."
            ),
            "demandSpike": (
                "Online, in-store, and social interest jumped ahead of the weekly demand forecast; high-velocity retail "
                "doors outrun the replenishment rhythm."
            ),
            "planFailure": (
                "Inventory and flow are still tuned to the old pace—risk of stockout (running out of stock) on hot "
                "locations and excess inventory on quieter ones until the network re-bases."
            ),
            "availableData": (
                "Loaded facts: actual sales versus one-period-lag forecast by item and store location for variance and "
                "surge signals; roughly twelve-thousand-row demand-input forecast; mean absolute percentage error (MAPE) "
                "and accuracy tables for portfolio forecast-error context."
            ),
        },
    },
    "allocation": {
        "id": "allocation",
        "title": "Size/Store Allocation",
        "story": (
            "We've detected a size-and-store allocation issue: the new product drop shipped with a one-pattern-fits-all "
            "push, but each retail door sells a different size curve. Some stores are stuck with sizes customers are not "
            "buying, while the sizes that sell are sitting elsewhere in the distribution network. We're launching the "
            "multi-agent run to quantify the gap and surface moves you can approve."
        ),
        "anchors": {
            "keyMetric": (
                "Youth sizes 4Y–7Y selling +41% above door-level plan in 22 priority store doors while adjacent sizes "
                "trail plan by 8–15%; 14 stores sit above 135% of target weeks of supply (WOS)—inventory cover measured "
                "in weeks—on the wrong size rungs."
            ),
            "sku": (
                "FQ7723-400 — exemplar youth sizing ladder; use grouped totals from the comma-separated value (CSV) "
                "tables (for example, group-by item) to name real top movers where the data loader surfaces them."
            ),
            "region": (
                "North America—high-traffic mall, factory outlet, and small-footprint specialty doors with different "
                "size curves."
            ),
            "demandSpike": (
                "Per-store-door reality: some sizes pile up while the sizes customers want sit at other stocking "
                "locations—local sell-through diverges from a flat chain-wide shipment pattern."
            ),
            "planFailure": (
                "One-pattern-fits-all allocation ignored door format, size curve, and capacity — global targets can "
                "look fine while the wrong sizes are in the wrong stores."
            ),
            "availableData": (
                "Loaded facts: actual versus lagged forecast by item, store or warehouse location, and customer group; "
                "procurement-style forecasts for rebalance and stock-transfer narratives."
            ),
        },
    },
    "markdown": {
        "id": "markdown",
        "title": "Markdown Optimization",
        "story": (
            "We've detected a markdown (planned price reduction) and clearance scenario: last season's product is "
            "moving slower than the sales plan, and fixed markdown calendar dates mean we either cut price too late, too "
            "little, or deeper than necessary on gross margin. The agents are initiating now to recommend timing and "
            "depth so we clear stock without giving away more margin than needed."
        ),
        "anchors": {
            "keyMetric": (
                "Regional clearance pool sell-through minus 19 percentage points versus plan quarter to date (QTD); "
                "37% of units past the 12-week aging gate; promotional price lifts to date captured only about 64% of "
                "planned clearance unit volume."
            ),
            "sku": (
                "CW2289-111 — exemplar seasonal lifestyle capsule; pair with high-variance or slow-moving lines from "
                "comma-separated value (CSV) data when listing impacted stock keeping units (SKUs)."
            ),
            "region": (
                "Northeast and Mid-Atlantic—full-price stores and factory outlet overlap where clearance timing hits "
                "gross margin."
            ),
            "demandSpike": (
                "Sell-through is behind the sales plan; inventory pools are aging past target weeks—pressure to clear "
                "stock without over-cutting price."
            ),
            "planFailure": (
                "Fixed markdown calendar versus reality: price cuts land too late, too shallow, or too deep—not aligned to "
                "inventory age, price elasticity, or minimum allowed prices by sales channel."
            ),
            "availableData": (
                "Loaded facts: actual versus lagged forecast for margin-gap style signals; demand-input and procurement "
                "forecasts; mean absolute percentage error (MAPE) and accuracy metrics for narrative on forecast quality."
            ),
        },
    },
}

VALID_SCENARIO_IDS: List[str] = list(SCENARIO_PROBLEMS.keys())


def build_problem_context(scenario_id: str, loader: Any) -> Optional[Dict[str, Any]]:
    """Merge authored brief with a loader-backed data line (CSV top variance SKU)."""
    base = SCENARIO_PROBLEMS.get(scenario_id)
    if not base:
        return None
    try:
        loader.load_all()
    except Exception:
        pass
    top = []
    try:
        top = loader.get_top_impacted_skus(limit=1) or []
    except Exception:
        top = []
    footnote = ""
    if top:
        s = top[0]
        footnote = (
            f"Data highlight from loaded Nike synthetic comma-separated value (CSV) files: highest-variance line item "
            f"is stock keeping unit (SKU) {s['sku']} (variance {s['variance']:,} units versus forecast). Include this "
            "SKU in affected_skus and narrative where appropriate alongside the scenario anchor SKU."
        )
    return {
        "id": base["id"],
        "title": base["title"],
        "story": base["story"],
        "anchors": dict(base["anchors"]),
        "data_footnote": footnote,
    }


def problem_context_prompt_block(ctx: Optional[Dict[str, Any]]) -> str:
    """Dense block for LLM system/human prompts."""
    if not ctx:
        return ""
    a = ctx.get("anchors") or {}
    lines = [
        "OPERATING PROBLEM (canonical — all outputs MUST stay consistent with this framing):",
        f"- Scenario: {ctx.get('title', '')} (id={ctx.get('id', '')})",
        f"- Narrative: {ctx.get('story', '')}",
    ]
    if a.get("keyMetric"):
        lines.append(
            f"- Key quantified signal (cite in strategies, executive summary, roadmap, risks): {a['keyMetric']}"
        )
    lines.extend(
        [
            f"- Anchor SKU (primary exemplar for this use case): {a.get('sku', '')}",
            f"- Anchor region / scope: {a.get('region', '')}",
            f"- Demand / pressure signal: {a.get('demandSpike', '')}",
            f"- Current plan failure mode: {a.get('planFailure', '')}",
        ]
    )
    if a.get("availableData"):
        lines.append(f"- Available synthetic data for this scenario: {a['availableData']}")
    fn = ctx.get("data_footnote")
    if fn:
        lines.append(f"- {fn}")
    lines.append(
        "RULES: Strategy titles/actions, executive summary, roadmap steps, and risk text must explicitly tie back "
        "to this problem (key quantified signal, regions, failure mode, demand signal). Reference the anchor SKU by "
        "name where relevant; use CSV data-highlight SKUs in metrics/SKU tables when listing impacted products."
    )
    return "\n".join(lines)
