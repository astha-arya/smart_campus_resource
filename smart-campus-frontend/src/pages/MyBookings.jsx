import { useState, useEffect } from 'react';

const API = 'https://smart-campus-resource.onrender.com';
const STATUS_TAG = { approved: 'tag-green', pending: 'tag-yellow', rejected: 'tag-red', cancelled: 'tag-blue' };
const TYPE_ICON  = { classroom: '📖', lab: '🧪', hall: '🏛️' };
const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

const FILTER_OPTS = [
  { key: 'all',       label: 'All'       },
  { key: 'approved',  label: 'Approved'  },
  { key: 'pending',   label: 'Pending'   },
  { key: 'rejected',  label: 'Rejected'  },
  { key: 'cancelled', label: 'Cancelled' }, // Added cancelled tab
];

export default function MyBookings() {
  const [bookings,     setBookings]     = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [cancellingId, setCancellingId] = useState(null); // Tracks which button is loading

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!user.userId) return;

    async function fetchBookings() {
      setLoading(true);
      setError('');
      try {
        const res  = await fetch(`${API}/api/bookings/my-bookings/${user.userId}`);
        const data = await res.json();
        if (!res.ok) { setError(data.message || 'Failed to fetch bookings.'); return; }
        setBookings(data.bookings || []);
      } catch {
        setError('Cannot reach the server.');
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
  }, [user.userId]);

  // ── Handle Soft Cancel ────────────────────────────────────────────────────
  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking? This will free up the room for others.')) return;

    setCancellingId(bookingId);
    try {
      const res = await fetch(`${API}/api/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (!res.ok) {
        window.alert(data.message || 'Failed to cancel booking.');
        return;
      }

      // Optimistically update the UI so the user sees the change instantly
      setBookings(prev => prev.map(b => 
        b._id === bookingId ? { ...b, status: 'cancelled' } : b
      ));
      
    } catch (err) {
      window.alert('Cannot reach the server to cancel.');
    } finally {
      setCancellingId(null);
    }
  };

  const displayed = statusFilter === 'all'
    ? bookings
    : bookings.filter(b => b.status === statusFilter);

  return (
    <div className="view-enter">

      {/* ── STATUS FILTERS ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {FILTER_OPTS.map(opt => (
          <button
            key={opt.key}
            className={`filter-btn${statusFilter === opt.key ? ' active' : ''}`}
            onClick={() => setStatusFilter(opt.key)}
          >
            {opt.label}
            {opt.key !== 'all' && (
              <span style={{ marginLeft: 6, opacity: 0.7 }}>
                ({bookings.filter(b => b.status === opt.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── ERROR ── */}
      {error && (
        <div style={{ padding: '16px 20px', background: 'rgba(255,82,102,0.08)', border: '1px solid rgba(255,82,102,0.2)', borderRadius: 12, color: 'var(--red)', fontSize: 13, marginBottom: 20 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── LOADING ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          Loading your bookings…
        </div>
      )}

      {/* ── LIST ── */}
      {!loading && !error && (
        displayed.length === 0
          ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <div className="empty-title">No bookings found</div>
              <div>
                {statusFilter === 'all'
                  ? "You haven't made any bookings yet."
                  : `No ${statusFilter} bookings.`}
              </div>
            </div>
          ) : (
            <div className="booking-list">
              {displayed.map(b => {
                const resourceName = b.resource?.name ?? 'Unknown Room';
                const resourceType = b.resource?.type ?? 'classroom';
                const floor        = b.resource?.floor    ?? '—';
                const capacity     = b.resource?.capacity ?? '—';
                const icon         = TYPE_ICON[resourceType] ?? '🏢';

                const bookingDate  = b.date      ?? '—';
                const bookingStart = b.startTime ?? null;
                const bookingEnd   = b.endTime   ?? null;

                const timeDisplay = bookingStart && bookingEnd
                  ? `${bookingStart} – ${bookingEnd}`
                  : bookingStart ?? '—';

                // Check if we should show the cancel button
                const canCancel = b.status === 'pending' || b.status === 'approved';

                return (
                  <div className="booking-item" key={b._id}>
                    <div className="booking-icon">{icon}</div>
                    
                    <div className="booking-info" style={{ flex: 1 }}>
                      <div className="booking-name">
                        {resourceName}
                        <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>
                          — {capitalize(resourceType)}
                        </span>
                      </div>

                      <div className="booking-meta">
                        Floor {floor}
                        {' · '}
                        <span style={{ color: 'var(--text)' }}>{bookingDate}</span>
                        {' · '}
                        <span style={{ color: 'var(--blue)' }}>{timeDisplay}</span>
                        {' · '}
                        👥 {capacity} seats
                      </div>

                      {b.reason && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                          "{b.reason}"
                        </div>
                      )}
                    </div>

                    {/* ── ACTION BORDER: STATUS & CANCEL BUTTON ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <span className={`tag ${STATUS_TAG[b.status] ?? 'tag-blue'}`}>
                        ● {capitalize(b.status)}
                      </span>
                      
                      {canCancel && (
                        <button 
                          onClick={() => handleCancel(b._id)}
                          disabled={cancellingId === b._id}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            color: 'var(--red)',
                            borderRadius: 6,
                            padding: '4px 10px',
                            fontSize: 11,
                            cursor: cancellingId === b._id ? 'wait' : 'pointer',
                            opacity: cancellingId === b._id ? 0.5 : 0.8,
                            transition: 'all 0.2s',
                          }}
                          onMouseOver={(e) => e.target.style.opacity = 1}
                          onMouseOut={(e) => e.target.style.opacity = 0.8}
                        >
                          {cancellingId === b._id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}
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