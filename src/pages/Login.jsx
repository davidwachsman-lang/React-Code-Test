import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingToken, setProcessingToken] = useState(false);

  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the page they were trying to visit
  const from = location.state?.from?.pathname || '/';

  // If user is already logged in, redirect
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  // Check for auth tokens in URL (from invite/reset emails)
  useEffect(() => {
    const processAuthTokens = async () => {
      const hash = window.location.hash;
      
      if (hash && hash.includes('access_token')) {
        setProcessingToken(true);
        console.log('Login page: Found auth tokens, processing...');
        
        try {
          // Parse the hash to get the type
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');
          
          console.log('Token type:', type);
          
          // Set the session manually
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.error('Error setting session:', error);
            setError('Failed to process invite link. Please request a new invite.');
            setProcessingToken(false);
            // Clean up URL
            window.history.replaceState(null, '', '/login');
            return;
          }
          
          console.log('Session set successfully:', data.user?.email);
          
          // Clean up URL and redirect based on type
          if (type === 'invite' || type === 'recovery' || type === 'signup') {
            window.history.replaceState(null, '', '/set-password');
            navigate('/set-password', { replace: true });
          } else {
            window.history.replaceState(null, '', '/');
            navigate('/', { replace: true });
          }
        } catch (err) {
          console.error('Token processing error:', err);
          setError('An error occurred. Please try again or request a new invite.');
          setProcessingToken(false);
          window.history.replaceState(null, '', '/login');
        }
      }
    };
    
    processAuthTokens();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while processing invite token
  if (processingToken) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>Processing Invite</h1>
            <p>Please wait...</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255, 255, 255, 0.1)',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Welcome Back</h1>
          <p>Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="login-footer">
            <Link to="/forgot-password" className="forgot-password-link">
              Forgot your password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
