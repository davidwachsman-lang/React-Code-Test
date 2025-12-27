// Minimal CRM-only version of the app
// Use this file for CRM-only deployments
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CRM from './pages/CRM';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <div className="app-content">
          <Routes>
            <Route path="/*" element={<CRM />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;


