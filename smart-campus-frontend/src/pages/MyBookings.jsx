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
  { key: 'cancelled', label: 'Cancelled' },
];

export default function MyBookings() {
  const [bookings,     setBookings]     = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  
  const [cancellingId, setCancellingId] = useState(null); 
  const [bookingToCancel, setBookingToCancel] = useState(null); // Controls our custom modal

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

  // ── Handle Soft Cancel (Now triggered by Custom Modal) ────────────────────
  const executeCancel = async () => {
    if (!bookingToCancel) return;
    const targetId = bookingToCancel;

    setCancellingId(targetId);
    try {
      const res = await fetch(`${API}/api/bookings/${targetId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (!res.ok) {
        window.alert(data.message || 'Failed to cancel booking.');
        return;
      }

      // Optimistically update UI
      setBookings(prev => prev.map(b => 
        b._id === targetId ? { ...b, status: 'cancelled' } : b
      ));
      
      // Close the modal
      setBookingToCancel(null);

    } catch (err) {
      window.alert('Cannot reach the server to cancel.');
    } finally {
      setCancellingId(null);
    }
  };
  const displayed = []; // <-- BUG:
  // const displayed = statusFilter === 'all'
  //   ? bookings
  //   : bookings.filter(b => b.status === statusFilter);

  return (
    <div className="view-enter" style={{ position: 'relative' }}>

      {/* ── CUSTOM CONFIRMATION MODAL ── */}
      {bookingToCancel && (
        <div 
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div 
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 32, width: '90%', maxWidth: 400,
              boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, fontFamily: "'Syne', sans-serif" }}>
              Cancel this booking?
            </h3>
            <p style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
              Are you sure you want to cancel this reservation? This action will immediately free up the room for others to book.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setBookingToCancel(null)}
                disabled={cancellingId === bookingToCancel}
                style={{
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--text)', padding: '10px 16px', borderRadius: 8,
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Keep It
              </button>
              <button 
                onClick={executeCancel}
                disabled={cancellingId === bookingToCancel}
                style={{
                  background: 'rgba(255,82,102,0.1)', border: '1px solid rgba(255,82,102,0.3)',
                  color: 'var(--red)', padding: '10px 16px', borderRadius: 8,
                  fontSize: 13, fontWeight: 600, cursor: cancellingId === bookingToCancel ? 'wait' : 'pointer',
                  transition: 'all 0.2s', opacity: cancellingId === bookingToCancel ? 0.6 : 1
                }}
              >
                {cancellingId === bookingToCancel ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                          onClick={() => setBookingToCancel(b._id)}
                          style={{
                            background: 'transparent', border: '1px solid var(--border)',
                            color: 'var(--red)', borderRadius: 6, padding: '4px 10px',
                            fontSize: 11, cursor: 'pointer', opacity: 0.8,
                            transition: 'all 0.2s',
                          }}
                          onMouseOver={(e) => e.target.style.opacity = 1}
                          onMouseOut={(e) => e.target.style.opacity = 0.8}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
      )}

      {/* ── ANIMATION STYLES FOR MODAL ── */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { 
          from { opacity: 0; transform: translateY(20px) scale(0.95); } 
          to { opacity: 1; transform: translateY(0) scale(1); } 
        }
      `}</style>
    </div>
  );
}