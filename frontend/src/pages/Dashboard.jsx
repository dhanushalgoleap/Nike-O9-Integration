import React, { useState, useEffect } from 'react';

export default function Dashboard({ onRouteChange }) {
    const [metrics, setMetrics] = useState({
        mape: "Loading...",
        units_at_risk: "...",
        turnover: "4.2x",
        capacity: "91.0%",
        alerts: []
    });

    useEffect(() => {
        fetch('http://localhost:8000/api/dashboard-metrics')
            .then(res => res.json())
            .then(data => {
                if (data) setMetrics(data);
            })
            .catch(err => console.error("Failed to load metrics:", err));
    }, []);

    return (
        <div className="page active" style={{overflowY: 'auto', maxHeight: 'calc(100vh - 64px)'}}>
            <div className="dash-header">
                <div className="dash-title">Supply Chain Overview</div>
                <div className="dash-sub">Nike apparel & footwear · Synthetic data POC</div>
            </div>

            <div className="kpi-row">
                <div className="kpi-card">
                    <div className="kpi-lbl">Global Forecast MAPE</div>
                    <div className="kpi-val">{metrics.mape}</div>
                    <div className="kpi-delta info">Auto-calculated from synthetic ground truth</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-lbl">Units at Risk</div>
                    <div className="kpi-val">{metrics.units_at_risk}</div>
                    <div className="kpi-delta neg">↓ Volume discrepancy detected</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-lbl">Inventory Turnover</div>
                    <div className="kpi-val">{metrics.turnover}</div>
                    <div className="kpi-delta info">Consistent with Q2 target</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-lbl">Network Capacity</div>
                    <div className="kpi-val" style={{color: 'var(--amber)'}}>{metrics.capacity}</div>
                    <div className="kpi-delta warn">West Coast DC approaching limit</div>
                </div>
            </div>

            <div className="full-row">
                <div className="panel">
                    <div className="panel-hd">
                        <div className="panel-title">Active alerts requiring planner action</div>
                        <div className="panel-meta">Real-time</div>
                    </div>
                    <div className="panel-body" style={{padding: '14px 18px'}}>
                        {metrics.alerts.length === 0 ? (
                            <div style={{color:'var(--text3)', fontStyle:'italic'}}>No active anomalies.</div>
                        ) : (
                            metrics.alerts.map((alert, i) => (
                                <div key={i} className={`alert-item ${alert.level}`}>
                                    <div className="alert-icon">!</div>
                                    <div style={{flex: 1}}>
                                        <div className="alert-title">{alert.title}</div>
                                        <div className="alert-desc">{alert.desc}</div>
                                    </div>
                                    <button className="alert-cta" onClick={() => onRouteChange('/workbench')}>Resolve in Scenarios →</button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

        </div>
    )
}
