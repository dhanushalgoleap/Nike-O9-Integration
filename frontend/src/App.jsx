import { useState, useEffect } from 'react'
import './App.css'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import PlannerWorkbench from './pages/PlannerWorkbench'

function App() {
  const [currentRoute, setCurrentRoute] = useState('/')

  // Read URL hash on load for basic routing if needed, otherwise default to '/'

  return (
    <div style={{display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)'}}>
      <Navbar currentRoute={currentRoute} onRouteChange={setCurrentRoute} />
      
      {currentRoute === '/' ? (
        <Dashboard />
      ) : (
        <PlannerWorkbench />
      )}
    </div>
  )
}

export default App
