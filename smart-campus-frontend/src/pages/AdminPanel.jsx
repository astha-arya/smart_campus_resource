import { useState, useEffect, useCallback } from 'react';

const API = 'https://smart-campus-resource.onrender.com';
const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

function avatarStyle(name = '') {
  const palettes = [
    { bg: 'rgba(79,142,255,0.15)',  color: 'var(--blue)'   },
    { bg: 'rgba(34,211,160,0.15)',  color: 'var(--green)'  },
    { bg: 'rgba(245,200,66,0.15)', color: 'var(--yellow)' },
    { bg: 'rgba(124,92,255,0.15)', color: 'var(--accent)' },
    { bg: 'rgba(255,82,102,0.15)', color: 'var(--red)'    },
  ];
  return palettes[name.charCodeAt(0) % palettes.length];
}

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function AdminPanel() {
  // We fetch all bookings but only display pending ones here.
  // Approved / rejected live in Logs.jsx.
  const [pending,  setPending]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [acting,   setActing]   = useState(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${API}/api/bookings/all`);
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to load.'); return; }
      // Client-side filter: only keep pending ones for this view
      setPending((data.bookings || []).filter(b => b.status === 'pending'));
    } catch {
      setError('Cannot reach the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  async function handleAction(bookingId, status) {
    setActing(bookingId);
    try {
      const res  = await fetch(`${API}/api/bookings/${bookingId}/status`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        window.showToast?.(data.message || 'Action failed.', 'error');
        return;
      }
      window.showToast?.(
        `Booking ${status === 'approved' ? 'approved ✓' : 'rejected ✕'}`,
        status === 'approved' ? 'success' : 'error'
      );
      // Re-fetch so the actioned card disappears immediately from this view
      await fetchPending();
    } catch {
      window.showToast?.('Server error.', 'error');
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="view-enter">

      {/* ── PAGE HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="section-title">Pending Requests</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>
            Review and approve or reject incoming booking requests
          </div>
        </div>
        {pending.length > 0 && (
          <span className="tag tag-yellow" style={{ fontSize: 13, padding: '6px 14px' }}>
            {pending.length} Pending
          </span>
        )}
      </div>

      {error && (
        <div style={{ padding: '16px 20px', background: 'rgba(255,82,102,0.08)', border: '1px solid rgba(255,82,102,0.2)', borderRadius: 12, color: 'var(--red)', fontSize: 13, marginBottom: 20 }}>
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          Loading requests…
        </div>
      )}

      {!loading && !error && (
        pending.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎉</div>
            <div className="empty-title">All caught up!</div>
            <div>There are no pending booking requests.</div>
          </div>
        ) : (
          <div className="admin-requests">
            {pending.map(b => {
              const userName     = b.user?.name       ?? 'Unknown User';
              const userRole     = b.user?.role       ?? 'student';
              const userId       = b.user?.userId     ?? '—';
              const resourceName = b.resource?.name   ?? 'Unknown Room';
              const floor        = b.resource?.floor  ?? '—';
              const type         = b.resource?.type   ?? '—';
              const capacity     = b.resource?.capacity ?? '—';
              const isActing     = acting === b._id;
              const { bg, color } = avatarStyle(userName);

              return (
                <div
                  className="request-card"
                  key={b._id}
                  style={{ opacity: isActing ? 0.5 : 1, transition: 'opacity 0.2s' }}
                >
                  <div className="req-avatar" style={{ background: bg, color }}>
                    {getInitials(userName)}
                  </div>

                  <div className="req-info">
                    <div className="req-name">
                      {userName}
                      <span className="tag tag-blue" style={{ fontSize: 10, marginLeft: 8 }}>
                        {capitalize(userRole)}
                      </span>
                    </div>
                    <div className="req-detail">
                      {userId} · {b.date} · {b.startTime}–{b.endTime}
                    </div>
                    <div className="req-resource">
                      {resourceName} — {capitalize(type)} · Floor {floor} · 👥 {capacity}
                    </div>
                    {b.reason && (
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>
                        "{b.reason}"
                      </div>
                    )}
                  </div>

                  <div className="req-actions">
                    <button
                      className="btn-approve"
                      disabled={isActing}
                      onClick={() => handleAction(b._id, 'approved')}
                    >
                      {isActing ? '…' : '✓ Approve'}
                    </button>
                    <button
                      className="btn-reject"
                      disabled={isActing}
                      onClick={() => handleAction(b._id, 'rejected')}
                    >
                      {isActing ? '…' : '✕ Reject'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}