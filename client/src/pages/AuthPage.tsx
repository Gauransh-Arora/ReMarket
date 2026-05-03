import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';
import { ShoppingBag, Mail, Lock, User, Phone, Eye, EyeOff, ArrowRight, Zap } from 'lucide-react';

type Mode = 'login' | 'register';

interface AuthPageProps {
  onSuccess: () => void;
}

export default function AuthPage({ onSuccess }: AuthPageProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPass, setShowPass] = useState(false);

  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const reset = () => {
    setError('');
    setSuccessMsg('');
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setShowPass(false);
  };

  const switchMode = (m: Mode) => { reset(); setMode(m); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        onSuccess();
      } else {
        await register(name, email, password, phone);
        setSuccessMsg('Account created! Please sign in.');
        switchMode('login');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      {/* Left — brand panel */}
      <div className="auth-brand">
        <div className="auth-brand-inner">
          <div className="auth-brand-logo">
            <div className="auth-logo-icon">
              <ShoppingBag size={22} strokeWidth={1.8} color="white" />
            </div>
            <span className="auth-logo-text">ReMarket</span>
          </div>
          <h1 className="auth-brand-headline">Your hostel's<br />resale marketplace.</h1>
          <p className="auth-brand-sub">
            Buy and sell pre-owned items within your hostel community — clothes, accessories, books, and more.
          </p>
          <div className="auth-brand-stats">
            <div className="auth-stat">
              <div className="auth-stat-num">2.4k+</div>
              <div className="auth-stat-label">Active Listings</div>
            </div>
            <div className="auth-stat-divider" />
            <div className="auth-stat">
              <div className="auth-stat-num">840</div>
              <div className="auth-stat-label">Happy Students</div>
            </div>
            <div className="auth-stat-divider" />
            <div className="auth-stat">
              <div className="auth-stat-num">98%</div>
              <div className="auth-stat-label">Satisfaction</div>
            </div>
          </div>
        </div>
        {/* Decorative blobs */}
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
      </div>

      {/* Right — form panel */}
      <div className="auth-form-panel">
        <div className="auth-form-card">
          {/* Mode toggle tabs */}
          <div className="auth-tabs">
            <button
              className={`auth-tab${mode === 'login' ? ' auth-tab-active' : ''}`}
              onClick={() => switchMode('login')}
            >
              Sign In
            </button>
            <button
              className={`auth-tab${mode === 'register' ? ' auth-tab-active' : ''}`}
              onClick={() => switchMode('register')}
            >
              Create Account
            </button>
          </div>

          <div className="auth-form-header">
            <h2 className="auth-form-title">
              {mode === 'login' ? 'Welcome back' : 'Join ReMarket'}
            </h2>
            <p className="auth-form-subtitle">
              {mode === 'login'
                ? 'Sign in to access your store dashboard.'
                : 'Create your account to start buying and selling.'}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="auth-alert auth-alert-error">
              <span>⚠</span> {error}
            </div>
          )}
          {successMsg && (
            <div className="auth-alert auth-alert-success">
              <span>✓</span> {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'register' && (
              <div className="auth-field">
                <label className="auth-label">Full Name</label>
                <div className="auth-input-wrap">
                  <User size={15} strokeWidth={1.8} color="var(--text-muted)" />
                  <input
                    className="auth-input"
                    type="text"
                    placeholder="Rahul Sharma"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label">Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={15} strokeWidth={1.8} color="var(--text-muted)" />
                <input
                  className="auth-input"
                  type="email"
                  placeholder="you@hostel.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div className="auth-field">
                <label className="auth-label">Phone Number</label>
                <div className="auth-input-wrap">
                  <Phone size={15} strokeWidth={1.8} color="var(--text-muted)" />
                  <input
                    className="auth-input"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                    autoComplete="tel"
                  />
                </div>
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <Lock size={15} strokeWidth={1.8} color="var(--text-muted)" />
                <input
                  className="auth-input"
                  type={showPass ? 'text' : 'password'}
                  placeholder={mode === 'login' ? 'Your password' : 'Min. 8 characters'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="auth-pass-toggle"
                  onClick={() => setShowPass(s => !s)}
                  tabIndex={-1}
                >
                  {showPass
                    ? <EyeOff size={14} strokeWidth={1.8} color="var(--text-muted)" />
                    : <Eye size={14} strokeWidth={1.8} color="var(--text-muted)" />
                  }
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <span className="auth-spinner" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={16} strokeWidth={2} />
                </>
              )}
            </button>
          </form>

          <div className="auth-footer-note">
            <Zap size={11} strokeWidth={2} color="var(--accent-green)" />
            <span>Powered by ReMarket</span>
          </div>
        </div>
      </div>
    </div>
  );
}
