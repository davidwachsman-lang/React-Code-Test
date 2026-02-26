import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AuthTokenHandler from './components/AuthTokenHandler';
import ProtectedRoute from './components/ProtectedRoute';
import Navigation from './components/Navigation';
import Login from './pages/Login';
import { ForgotPassword, ResetPassword } from './pages/ResetPassword';
import AuthCallback from './pages/AuthCallback';
import SetPassword from './pages/SetPassword';
import Intake from './pages/Intake';
import DispatchAndScheduling from './pages/DispatchAndScheduling';
import WIPBoard from './pages/WIPBoard';
import Estimating from './pages/Estimating';
import EstimateControlTower from './pages/EstimateControlTower';
import JobFiles from './pages/JobFiles';
import JobDetail from './pages/JobDetail';
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
import JobFileChecks from './pages/JobFileChecks';
import './App.css';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function OpsNav() {
  const location = useLocation();
  const tabs = [
    { path: '/dispatch', label: 'Dispatch & Scheduling' },
    { path: '/job-file-checks', label: 'Job File Checks' },
    { path: '/job-files', label: 'Job Files' },
  ];
  return (
    <nav style={{
      display: 'flex',
      gap: '0',
      backgroundColor: '#1e293b',
      padding: '0 16px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      {tabs.map(tab => {
        const isActive = location.pathname === tab.path || (tab.path === '/dispatch' && location.pathname === '/');
        return (
          <a
            key={tab.path}
            href={tab.path}
            style={{
              padding: '12px 20px',
              color: isActive ? '#fff' : '#94a3b8',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: isActive ? '600' : '400',
              borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
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

  // Check if we should only show Ops pages (Dispatch, Job File Checks, Job Files)
  const envOpsOnly = import.meta.env.VITE_OPS_ONLY === 'true';
  const urlOpsOnly = urlParams.has('ops-only') || urlParams.get('ops-only') === 'true';
  const storedOpsOnly = localStorage.getItem('ops-only-mode') === 'true';
  const opsOnlyMode = envOpsOnly || urlOpsOnly || storedOpsOnly;
  
  
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
  if (urlOpsOnly && !storedOpsOnly) {
    localStorage.setItem('ops-only-mode', 'true');
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
  if (urlParams.get('ops-only') === 'false') {
    localStorage.removeItem('ops-only-mode');
  }

  // If Estimate-only mode, show only Estimating without navigation
  if (estimateOnlyMode) {
    return (
      <div className="App">
        <ScrollToTop />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <div className="app-content" style={{ marginLeft: 0 }}>
                <Routes>
                  <Route path="/" element={<Estimating />} />
                  <Route path="/estimating" element={<Estimating />} />
                  <Route path="/*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    );
  }
  
  // If CRM-only mode, show only CRM without navigation
  if (crmOnlyMode) {
    return (
      <div className="App">
        <ScrollToTop />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <div className="app-content" style={{ marginLeft: 0 }}>
                <Routes>
                  <Route path="/" element={<CRM />} />
                  <Route path="/crm" element={<CRM />} />
                  <Route path="/*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    );
  }
  
  // If Storm-only mode, show only Storm without navigation
  if (stormOnlyMode) {
    return (
      <div className="App">
        <ScrollToTop />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <div className="app-content" style={{ marginLeft: 0 }}>
                <Routes>
                  <Route path="/" element={<Storm />} />
                  <Route path="/storm" element={<Storm />} />
                  <Route path="/*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    );
  }

  // If Ops-only mode, show Dispatch, Job File Checks, and Job Files with tab navigation
  if (opsOnlyMode) {
    return (
      <div className="App">
        <ScrollToTop />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <OpsNav />
              <div className="app-content" style={{ marginLeft: 0 }}>
                <Routes>
                  <Route path="/" element={<DispatchAndScheduling />} />
                  <Route path="/dispatch" element={<DispatchAndScheduling />} />
                  <Route path="/job-file-checks" element={<JobFileChecks />} />
                  <Route path="/job-files" element={<JobFiles />} />
                  <Route path="/job-files/:id" element={<JobDetail />} />
                  <Route path="/*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    );
  }

  return (
    <div className="App">
      <ScrollToTop />
      <Routes>
        {/* Public routes - no auth required */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/set-password" element={<SetPassword />} />
        
        {/* Protected routes - auth required */}
        <Route path="/*" element={
          <ProtectedRoute>
            <>
              {!isTestRoute && <Navigation />}
              <div className={isTestRoute ? 'sales-test-content' : 'app-content'}>
                <Routes>
                  <Route path="/dispatch" element={<DispatchAndScheduling />} />
                  <Route path="/wip-board" element={<WIPBoard />} />
                  <Route path="/estimating" element={<Estimating />} />
                  <Route path="/estimate-control-tower" element={<EstimateControlTower />} />
                  <Route path="/job-files" element={<JobFiles />} />
                  <Route path="/job-files/:id" element={<JobDetail />} />
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
                  <Route path="/job-file-checks" element={<JobFileChecks />} />
                  <Route path="/sales-test" element={<CRM />} />
                  <Route path="/" element={<Intake />} />
                </Routes>
              </div>
            </>
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthTokenHandler>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </AuthTokenHandler>
    </Router>
  );
}

export default App;
