export default function GeneratedOptions({ options, onSelect }) {
  if (!options || options.length === 0) return null;

  return (
    <div style={{ marginTop: '24px', animation: 'fadeUp 0.5s ease' }}>
       <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '16px', fontFamily: 'var(--font-d)' }}>Generated Scenario Options</h3>
       <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
         {options.map((opt, idx) => (
           <div 
             key={idx} 
             style={{ 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                padding: '16px',
                backgroundColor: 'var(--bg-main)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
             }}
             onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.backgroundColor = '#f0fdf4';
             }}
             onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.backgroundColor = 'var(--bg-main)';
             }}
             onClick={() => onSelect(opt)}
           >
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1rem', fontWeight: 600 }}>{opt.title}</h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                   {opt.cost && <span style={{ fontSize: '0.75rem', border: '1px solid rgba(220, 38, 38, 0.2)', color: 'var(--status-error)', padding: '2px 8px', borderRadius: '12px' }}>Cost: {opt.cost}</span>}
                   {opt.service_level && <span style={{ fontSize: '0.75rem', border: '1px solid rgba(22, 163, 74, 0.2)', color: 'var(--status-completed)', padding: '2px 8px', borderRadius: '12px' }}>SL Impact: {opt.service_level}</span>}
                </div>
             </div>
             <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{opt.desc}</p>
           </div>
         ))}
       </div>
    </div>
  )
}
