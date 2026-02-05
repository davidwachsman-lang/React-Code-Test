import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

/**
 * This component checks for auth tokens in the URL (from invite/reset emails)
 * and processes them before rendering children.
 */
const AuthTokenHandler = ({ children }) => {
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Only run once
    if (processed) return;

    const processTokens = async () => {
      const hash = window.location.hash;
      
      // Check if there are auth tokens in the URL
      if (!hash || !hash.includes('access_token')) {
        setProcessed(true);
        return;
      }

      console.log('AuthTokenHandler: Found tokens in URL');
      setProcessing(true);

      try {
        // Parse tokens from hash
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        console.log('AuthTokenHandler: Token type:', type);

        if (!accessToken) {
          console.error('AuthTokenHandler: No access token found');
          setProcessing(false);
          setProcessed(true);
          return;
        }

        // Set the session with the tokens
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (error) {
          console.error('AuthTokenHandler: Error setting session:', error);
          // Clean up URL and let the app handle it
          window.history.replaceState(null, '', window.location.pathname);
          setProcessing(false);
          setProcessed(true);
          return;
        }

        console.log('AuthTokenHandler: Session established for:', data.user?.email);

        // Clean up URL hash
        window.history.replaceState(null, '', window.location.pathname);

        // Redirect based on token type
        if (type === 'invite' || type === 'recovery' || type === 'signup') {
          console.log('AuthTokenHandler: Redirecting to set-password');
          navigate('/set-password', { replace: true });
        } else {
          console.log('AuthTokenHandler: Redirecting to home');
          navigate('/', { replace: true });
        }
      } catch (err) {
        console.error('AuthTokenHandler: Error processing tokens:', err);
        window.history.replaceState(null, '', window.location.pathname);
      }

      setProcessing(false);
      setProcessed(true);
    };

    processTokens();
  }, [navigate, processed]);

  if (processing) {
    return (
      <div className="token-processing">
        <div className="token-processing-card">
          <h1>Processing Invite</h1>
          <p>Please wait while we set up your account...</p>
          <div className="spinner"></div>
        </div>
        <style>{`
          .token-processing {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(180deg, #222a0f 0%, #1e293b 50%, #0f172a 100%);
            padding: 1rem;
          }
          .token-processing-card {
            background: rgba(30, 41, 59, 0.8);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 2.5rem;
            text-align: center;
            color: white;
          }
          .token-processing-card h1 {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
          }
          .token-processing-card p {
            color: rgba(255, 255, 255, 0.6);
            margin-bottom: 1.5rem;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return children;
};

export default AuthTokenHandler;
