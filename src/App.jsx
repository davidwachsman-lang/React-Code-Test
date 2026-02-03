import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import Intake from './pages/Intake';
import DispatchAndScheduling from './pages/DispatchAndScheduling';
import WIPBoard from './pages/WIPBoard';
import Estimating from './pages/Estimating';
import JobFiles from './pages/JobFiles';
import Forms from './pages/Forms';
import CRM from './pages/CRM';
import FieldServices from './pages/FieldServices';
import Goals from './pages/Goals';
import TMEstimate from './pages/TMEstimate';
import ReportingAndAnalytics from './pages/ReportingAndAnalytics';
import DailyWarRoom from './pages/DailyWarRoom';
import Expectations2026 from './pages/Expectations2026';
import Storm from './pages/Storm';
import ResourceCenter from './pages/ResourceCenter';
import Sandbox from './pages/Sandbox';
import InsuranceJobSOPs from './pages/InsuranceJobSOPs';
import Conversion from './pages/Conversion';
import './App.css';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function AppContent() {
  const location = useLocation();
  const isTestRoute = location.pathname === '/sales-test';
  
  // Check if we should only show CRM (for Vercel deployment)
  // Option 1: Build-time env var (requires rebuild after setting in Vercel)
  const envCrmOnly = import.meta.env.VITE_CRM_ONLY === 'true';
  
  // Option 2: Runtime check - look for 'crm-only' in URL or localStorage
  // This allows switching without rebuilding
  const urlParams = new URLSearchParams(window.location.search);
  // Accept both ?crm-only=true and ?crm-only (just the presence of the param)
  const urlCrmOnly = urlParams.has('crm-only') || urlParams.get('crm-only') === 'true';
  const storedCrmOnly = localStorage.getItem('crm-only-mode') === 'true';
  
  // Use env var first, then fall back to runtime checks
  const crmOnlyMode = envCrmOnly || urlCrmOnly || storedCrmOnly;
  
  // Check if we should only show Estimate Tool (for Vercel deployment)
  const envEstimateOnly = import.meta.env.VITE_ESTIMATE_ONLY === 'true';
  const urlEstimateOnly = urlParams.has('estimate-only') || urlParams.get('estimate-only') === 'true';
  const storedEstimateOnly = localStorage.getItem('estimate-only-mode') === 'true';
  const estimateOnlyMode = envEstimateOnly || urlEstimateOnly || storedEstimateOnly;
  
  // Check if we should only show Storm pages (for Vercel deployment)
  const envStormOnly = import.meta.env.VITE_STORM_ONLY === 'true';
  const urlStormOnly = urlParams.has('storm-only') || urlParams.get('storm-only') === 'true';
  const storedStormOnly = localStorage.getItem('storm-only-mode') === 'true';
  const stormOnlyMode = envStormOnly || urlStormOnly || storedStormOnly;
  
  // Debug logging
  console.log('Deployment Mode Check:', {
    envCrmOnly,
    urlCrmOnly,
    storedCrmOnly,
    crmOnlyMode,
    envEstimateOnly,
    urlEstimateOnly,
    storedEstimateOnly,
    estimateOnlyMode,
    envStormOnly,
    urlStormOnly,
    storedStormOnly,
    stormOnlyMode,
    search: window.location.search
  });
  
  // If URL param is set, store it in localStorage for future visits
  if (urlCrmOnly && !storedCrmOnly) {
    localStorage.setItem('crm-only-mode', 'true');
  }
  if (urlEstimateOnly && !storedEstimateOnly) {
    localStorage.setItem('estimate-only-mode', 'true');
  }
  if (urlStormOnly && !storedStormOnly) {
    localStorage.setItem('storm-only-mode', 'true');
  }
  
  // Allow disabling via URL params
  if (urlParams.get('crm-only') === 'false') {
    localStorage.removeItem('crm-only-mode');
  }
  if (urlParams.get('estimate-only') === 'false') {
    localStorage.removeItem('estimate-only-mode');
  }
  if (urlParams.get('storm-only') === 'false') {
    localStorage.removeItem('storm-only-mode');
  }

  // If Estimate-only mode, show only Estimating without navigation
  if (estimateOnlyMode) {
    console.log('Estimate-only mode active, rendering Estimating component');
    return (
      <div className="App">
        <ScrollToTop />
        <div className="app-content" style={{ marginLeft: 0 }}>
          <Routes>
            <Route path="/" element={<Estimating />} />
            <Route path="/estimating" element={<Estimating />} />
            <Route path="/*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    );
  }
  
  console.log('Full app mode active, estimateOnlyMode:', estimateOnlyMode);

  // If CRM-only mode, show only CRM without navigation
  if (crmOnlyMode) {
    return (
      <div className="App">
        <ScrollToTop />
        <div className="app-content" style={{ marginLeft: 0 }}>
          <Routes>
            <Route path="/" element={<CRM />} />
            <Route path="/crm" element={<CRM />} />
            <Route path="/*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    );
  }
  
  // If Storm-only mode, show only Storm without navigation
  if (stormOnlyMode) {
    console.log('Storm-only mode active, rendering Storm component');
    return (
      <div className="App">
        <ScrollToTop />
        <div className="app-content" style={{ marginLeft: 0 }}>
          <Routes>
            <Route path="/" element={<Storm />} />
            <Route path="/storm" element={<Storm />} />
            <Route path="/*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {!isTestRoute && <Navigation />}
      <ScrollToTop />
      <div className={isTestRoute ? 'sales-test-content' : 'app-content'}>
        <Routes>
          <Route path="/dispatch" element={<DispatchAndScheduling />} />
          <Route path="/wip-board" element={<WIPBoard />} />
          <Route path="/estimating" element={<Estimating />} />
          <Route path="/job-files" element={<JobFiles />} />
          <Route path="/forms" element={<Forms />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/field-services" element={<FieldServices />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/tm-estimate" element={<TMEstimate />} />
          <Route path="/reporting" element={<ReportingAndAnalytics />} />
          <Route path="/war-room" element={<DailyWarRoom />} />
          <Route path="/storm" element={<Storm />} />
          <Route path="/resources" element={<ResourceCenter />} />
          <Route path="/expectations-2026" element={<Expectations2026 />} />
          <Route path="/sandbox" element={<Sandbox />} />
          <Route path="/insurance-job-sops" element={<InsuranceJobSOPs />} />
          <Route path="/conversion" element={<Conversion />} />
          <Route path="/sales-test" element={<CRM />} />
          <Route path="/" element={<Intake />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
