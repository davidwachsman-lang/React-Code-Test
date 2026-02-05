import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Check if there are auth tokens in the URL hash (from invite/reset links)
  // If so, don't redirect - let AuthContext process them first
  const hasAuthTokens = window.location.hash && window.location.hash.includes('access_token');

  if (loading || hasAuthTokens) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>{hasAuthTokens ? 'Processing invite...' : 'Loading...'}</p>
        <style>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(180deg, #222a0f 0%, #1e293b 50%, #0f172a 100%);
            color: rgba(255, 255, 255, 0.87);
            gap: 1rem;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    // Redirect to login page but save the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
