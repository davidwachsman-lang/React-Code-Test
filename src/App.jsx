import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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
import FinancialsAndBilling from './pages/FinancialsAndBilling';
import TMEstimate from './pages/TMEstimate';
import ReportingAndAnalytics from './pages/ReportingAndAnalytics';
import DailyWarRoom from './pages/DailyWarRoom';
import Expectations2026 from './pages/Expectations2026';
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
          <Route path="/financials" element={<FinancialsAndBilling />} />
          <Route path="/tm-estimate" element={<TMEstimate />} />
          <Route path="/reporting" element={<ReportingAndAnalytics />} />
          <Route path="/war-room" element={<DailyWarRoom />} />
          <Route path="/expectations-2026" element={<Expectations2026 />} />
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
