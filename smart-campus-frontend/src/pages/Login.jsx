import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ROLES = [
  { key: 'student', label: 'Student', icon: '🎓' },
  { key: 'faculty', label: 'Faculty', icon: '👨‍🏫' },
  { key: 'admin',   label: 'Admin',   icon: '🛠️' },
];

// Preset IDs make demo login instant — mirrors the prototype behaviour
const DEMO_IDS = {
  student: 'RA2311028010141',
  faculty: '103503',
  admin:   'ADM-2024-001',
};

export default function Login() {
  const navigate = useNavigate();

  const [role,      setRole]      = useState('student');
  const [userId,    setUserId]    = useState(DEMO_IDS.student);
  const [password,  setPassword]  = useState('password123');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  // Switch role tab and pre-fill the demo userId
  function handleRoleSelect(r) {
    setRole(r);
    setUserId(DEMO_IDS[r]);
    setError('');
  }

  async function handleLogin() {
    if (!userId.trim() || !password.trim()) {
      setError('Please enter your User ID and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('https://smart-campus-resource.onrender.com/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: userId.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Server returned 4xx – surface the message from our auth controller
        setError(data.message || 'Login failed. Please check your credentials.');
        return;
      }

      // Persist the full user object (password already stripped server-side)
      localStorage.setItem('user', JSON.stringify(data.user));

      navigate('/dashboard');
    } catch (err) {
      // Network error – backend not reachable
      setError('Cannot reach the server. Make sure your backend is running on port 5001.');
    } finally {
      setLoading(false);
    }
  }

  // Allow pressing Enter in either field to trigger login
  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLogin();
  }

  return (
    <div
      id="login-screen"
      style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        minHeight:      '100vh',
        position:       'relative',
        overflow:       'hidden',
      }}
    >
      {/* Background layers */}
      <div className="login-bg"   style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 20% 50%, rgba(79,142,255,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 80% 20%, rgba(124,92,255,0.06) 0%, transparent 60%)' }} />
      <div className="grid-bg"    style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(79,142,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(79,142,255,0.04) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

      {/* Card */}
      <div className="login-card" style={{ position: 'relative', width: 420, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 48, boxShadow: '0 40px 80px rgba(0,0,0,0.5)', animation: 'cardIn 0.6s cubic-bezier(0.16,1,0.3,1) both' }}>

        {/* ── UPDATED UNISPACE LOGO ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <div className="logo-mark" style={{ background: 'linear-gradient(135deg, var(--accent), var(--blue))' }}>US</div>
          <div>
            <span className="logo-text" style={{ letterSpacing: '0.5px' }}>UniSpace</span>
            <span className="logo-sub">Campus Resource System</span>
          </div>
        </div>

        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 700, marginBottom: 6 }}>
          Welcome back
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 32 }}>
          Sign in to manage campus resources
        </p>

        {/* Role selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
          {ROLES.map((r) => (
            <button
              key={r.key}
              onClick={() => handleRoleSelect(r.key)}
              style={{
                background:  role === r.key ? 'rgba(79,142,255,0.1)'  : 'var(--bg)',
                border:      role === r.key ? '1px solid var(--blue)' : '1px solid var(--border2)',
                boxShadow:   role === r.key ? '0 0 20px rgba(79,142,255,0.15)' : 'none',
                color:       role === r.key ? 'var(--text)' : 'var(--text-dim)',
                borderRadius: 10, padding: '12px 8px', cursor: 'pointer',
                textAlign: 'center', transition: 'all 0.2s',
                fontFamily: "'DM Sans', sans-serif", fontSize: 12,
              }}
            >
              <span style={{ fontSize: 20, display: 'block', marginBottom: 4 }}>{r.icon}</span>
              {r.label}
            </button>
          ))}
        </div>

        {/* User ID */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-dim)', marginBottom: 8, display: 'block' }}>
            User ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your registration ID"
            style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', color: 'var(--text)', fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 0 }}>
          <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-dim)', marginBottom: 8, display: 'block' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter password"
            style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', color: 'var(--text)', fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
          />
        </div>

        {/* Inline error */}
        {error && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,82,102,0.08)', border: '1px solid rgba(255,82,102,0.25)', borderRadius: 10, fontSize: 13, color: 'var(--red)' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%', marginTop: 24,
            background: loading ? 'var(--surface2)' : 'linear-gradient(135deg, var(--blue), var(--accent))',
            border: 'none', borderRadius: 12, padding: 14, color: 'white',
            fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15,
            cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            boxShadow: loading ? 'none' : '0 8px 24px rgba(79,142,255,0.3)',
            letterSpacing: '0.3px',
          }}
        >
          {loading ? 'Signing in…' : 'Sign In →'}
        </button>
      </div>

      {/* Inline keyframe for card entrance */}
      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        input:focus {
          border-color: var(--blue) !important;
          box-shadow: 0 0 0 3px rgba(79,142,255,0.1) !important;
        }
      `}</style>
    </div>
  );
}