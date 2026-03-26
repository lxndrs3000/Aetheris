import type { FC } from 'react';
import { useState, useMemo } from 'react';
import { apiFetch } from '../utils/api';

interface AuthProps {
  onAuth: (user: { id: string; username: string; avatarId: number }) => void;
  onClose?: () => void;
}

export const Auth: FC<AuthProps> = ({ onAuth, onClose }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const stars = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    id: i,
    top: Math.random() * 100,
    left: Math.random() * 100,
    size: Math.random() * 1.8 + 0.6,
    delay: Math.random() * 5,
    dur: 2 + Math.random() * 3,
  })), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong'); return; }
      localStorage.setItem('aetheris_token', data.token);
      onAuth(data.user);
    } catch {
      setError('Could not connect to server');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'radial-gradient(ellipse at 50% 0%, rgba(113,128,255,0.15) 0%, #0d0e14 60%)',
      backgroundColor: '#0d0e14',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes twinkleAuth {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.3); }
        }
        @keyframes floatUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .auth-input {
          width: 100%; padding: 14px 18px; border-radius: 14px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          color: #fff; font-size: 1rem; outline: none; transition: border 0.2s;
          box-sizing: border-box;
        }
        .auth-input:focus { border-color: rgba(246,177,94,0.5); }
        .auth-input::placeholder { color: rgba(255,255,255,0.25); }
      `}</style>

      {/* Back button */}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '2.5rem', left: '2rem', zIndex: 10,
            background: 'transparent', border: 'none', color: 'var(--accent-gold)',
            cursor: 'pointer', opacity: 0.7,
          }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
      )}

      {/* Stars */}
      {stars.map(s => (
        <div key={s.id} style={{
          position: 'absolute', top: `${s.top}%`, left: `${s.left}%`,
          width: `${s.size}px`, height: `${s.size}px`, borderRadius: '50%',
          background: 'white', pointerEvents: 'none',
          animation: `twinkleAuth ${s.dur}s ${s.delay}s ease-in-out infinite`,
        }} />
      ))}

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: '380px', zIndex: 1,
        animation: 'floatUp 0.5s ease-out both',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>✨</div>
          <h1 style={{ fontFamily: 'serif', fontStyle: 'italic', color: 'var(--accent-gold)', fontSize: '2.4rem', margin: 0 }}>
            Aetheris
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', letterSpacing: '2.5px', textTransform: 'uppercase', marginTop: '6px' }}>
            Chart your constellation
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '14px', padding: '4px', marginBottom: '1.8rem' }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1.5px', textTransform: 'uppercase',
                background: mode === m ? 'rgba(246,177,94,0.15)' : 'transparent',
                color: mode === m ? 'var(--accent-gold)' : 'rgba(255,255,255,0.35)',
                transition: 'all 0.2s',
              }}>
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            className="auth-input" placeholder="Username"
            value={username} onChange={e => setUsername(e.target.value)}
            autoCapitalize="none" autoCorrect="off" required
          />
          <input
            className="auth-input" type="password" placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)}
            required
          />
          {error && (
            <p style={{ color: 'var(--accent-red)', fontSize: '0.8rem', margin: 0, textAlign: 'center', opacity: 0.85 }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
            background: loading ? 'rgba(246,177,94,0.4)' : 'var(--accent-gold)',
            color: '#111', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '1.5px',
            textTransform: 'uppercase', cursor: loading ? 'default' : 'pointer',
            transition: 'all 0.2s', marginTop: '4px',
          }}>
            {loading ? '...' : (mode === 'login' ? 'Enter the Void' : 'Begin Journey')}
          </button>
        </form>

        {/* Google OAuth — hidden until configured */}
      </div>
    </div>
  );
};
