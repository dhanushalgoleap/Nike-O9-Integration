export default function UseCaseCard({ scenario, isActive, onClick }) {
  return (
    <div 
      className={`glass-panel card`}
      onClick={onClick}
      style={{
        cursor: 'pointer',
        border: isActive ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
        backgroundColor: isActive ? 'rgba(0, 240, 255, 0.05)' : 'var(--bg-card)',
        transform: isActive ? 'translateX(8px)' : 'none'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '1.05rem', color: isActive ? 'var(--accent-cyan)' : 'var(--text-main)', margin: 0, fontWeight: 600 }}>
          {scenario.title}
        </h3>
        <div style={{ 
          fontSize: '0.75rem', 
          padding: '4px 8px', 
          borderRadius: '4px', 
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          color: 'var(--text-muted)',
          border: '1px solid var(--border-color)'
        }}>
          {scenario.metric}
        </div>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
        {scenario.desc}
      </p>
    </div>
  )
}
