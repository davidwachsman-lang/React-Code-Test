import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import './Login.css';

const AuthCallback = () => {
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the hash from the URL (Supabase puts tokens there)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        console.log('Auth callback - type:', type);

        if (accessToken) {
          // Set the session using the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Error setting session:', error);
            setError(error.message);
            setProcessing(false);
            return;
          }

          console.log('Session set successfully:', data);

          // Redirect based on the type of auth action
          if (type === 'invite' || type === 'recovery' || type === 'signup') {
            // User needs to set their password
            navigate('/set-password', { replace: true });
          } else {
            // Regular sign in, go to home
            navigate('/', { replace: true });
          }
        } else {
          // No tokens in URL, check if we have a session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            navigate('/', { replace: true });
          } else {
            setError('No authentication tokens found. Please try the link again or request a new invite.');
            setProcessing(false);
          }
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('An error occurred during authentication. Please try again.');
        setProcessing(false);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (processing) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>Processing...</h1>
            <p>Please wait while we verify your credentials</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <div className="loading-spinner" style={{
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

  if (error) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>Authentication Error</h1>
          </div>
          <div className="login-error" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
          <button 
            className="login-button" 
            onClick={() => navigate('/login')}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;
