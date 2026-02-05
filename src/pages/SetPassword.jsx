import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './ResetPassword.css';

const SetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { updatePassword, user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await updatePassword(password);
      setSuccess(true);
      // Redirect to home after a short delay
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
    } catch (err) {
      console.error('Set password error:', err);
      if (err.message.includes('session')) {
        setError('Your session has expired. Please request a new invite from your administrator.');
      } else {
        setError(err.message || 'Failed to set password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="reset-container">
        <div className="reset-card">
          <div className="reset-header">
            <h1>Password Set!</h1>
            <p>Your account is ready to use</p>
          </div>
          <div className="reset-success-message">
            <p>Redirecting you to the app...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-container">
      <div className="reset-card">
        <div className="reset-header">
          <h1>Welcome!</h1>
          <p>Create a password for your account</p>
          {user && (
            <p style={{ color: '#60a5fa', marginTop: '0.5rem', fontSize: '0.9rem' }}>
              {user.email}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="reset-form">
          {error && (
            <div className="reset-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              autoComplete="new-password"
              disabled={loading}
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              autoComplete="new-password"
              disabled={loading}
              minLength={6}
            />
          </div>

          <button type="submit" className="reset-button" disabled={loading}>
            {loading ? 'Setting Password...' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetPassword;
