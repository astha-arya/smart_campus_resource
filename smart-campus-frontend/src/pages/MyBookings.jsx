import { useState, useEffect } from 'react';

const API = 'https://smart-campus-resource.onrender.com';
const STATUS_TAG = { approved: 'tag-green', pending: 'tag-yellow', rejected: 'tag-red' };
const TYPE_ICON  = { classroom: '📖', lab: '🧪', hall: '🏛️' };
const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

const FILTER_OPTS = [
  { key: 'all',      label: 'All'      },
  { key: 'approved', label: 'Approved' },
  { key: 'pending',  label: 'Pending'  },
  { key: 'rejected', label: 'Rejected' },
];

export default function MyBookings() {
  const [bookings,     setBookings]     = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

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

  const displayed = statusFilter === 'all'
    ? bookings
    : bookings.filter(b => b.status === statusFilter);

  return (
    <div className="view-enter">

      {/* ── STATUS FILTERS ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
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

                // ── Timing: date + startTime–endTime ──────────────────────
                // These come from the updated Booking schema (Phase 4 engine
                // upgrade). We display them as three separate pieces so the
                // layout doesn't break if any field is missing.
                const bookingDate  = b.date      ?? '—';
                const bookingStart = b.startTime ?? null;
                const bookingEnd   = b.endTime   ?? null;

                const timeDisplay = bookingStart && bookingEnd
                  ? `${bookingStart} – ${bookingEnd}`
                  : bookingStart ?? '—';

                return (
                  <div className="booking-item" key={b._id}>
                    <div className="booking-icon">{icon}</div>
                    <div className="booking-info">
                      <div className="booking-name">
                        {resourceName}
                        <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>
                          — {capitalize(resourceType)}
                        </span>
                      </div>

                      {/* ── Fixed timing line ── */}
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

                    <span className={`tag ${STATUS_TAG[b.status] ?? 'tag-blue'}`}>
                      ● {capitalize(b.status)}
                    </span>
                  </div>
                );
              })}
            </div>
          )
      )}
    </div>
  );
}