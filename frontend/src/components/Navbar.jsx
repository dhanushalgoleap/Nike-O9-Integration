export default function Navbar({ currentRoute, onRouteChange }) {
  return (
    <header className="header">
      <div className="header-left">
        <a className="logo" href="#" onClick={(e) => {e.preventDefault(); if (onRouteChange) onRouteChange('/');}} style={{display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none'}}>
          <img src="/src/assets/algoleap-logo.png" alt="Algoleap Logo" style={{width: '150px'}} />
        </a>
        <div className="header-divider"></div>
        <span className="header-title">Supply Chain Intelligence</span>
      </div>

      <nav className="nav-tabs">
        <button 
          className={`nav-tab ${currentRoute === '/' ? 'active' : ''}`} 
          onClick={() => {if (onRouteChange) onRouteChange('/');}}
        >
          Dashboard
        </button>
        <button 
          className={`nav-tab ${currentRoute === '/workbench' ? 'active' : ''}`} 
          onClick={() => {if (onRouteChange) onRouteChange('/workbench');}}
        >
          Scenarios
        </button>
      </nav>

      <div className="header-right">
        <div className="status-pill" style={{color: 'var(--text2)', background: 'var(--bg2)', border: '1px solid var(--border)'}}>
          <div className="pulse" style={{background: 'var(--text3)'}}></div>
          <span>Connected</span>
        </div>
      </div>
    </header>
  )
}
