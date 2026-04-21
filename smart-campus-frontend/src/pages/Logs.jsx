import { useState, useEffect, useCallback } from 'react';
const API = 'https://smart-campus-resource.onrender.com';
const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

const STATUS_TAG = { approved: 'tag-green', rejected: 'tag-red' };

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

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

export default function Logs() {
  const [logs,    setLogs]    = useState([]);
  const [filter,  setFilter]  = useState('all'); // 'all' | 'approved' | 'rejected'
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${API}/api/bookings/all`);
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to load logs.'); return; }
      // Only settled bookings belong in the audit log
      const settled = (data.bookings || []).filter(
        b => b.status === 'approved' || b.status === 'rejected'
      );
      setLogs(settled);
    } catch {
      setError('Cannot reach the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const displayed = filter === 'all'
    ? logs
    : logs.filter(b => b.status === filter);

  function handleExport() {
    if (logs.length === 0) {
      window.showToast?.('No log entries to export.', 'error');
      return;
    }

    // Build a CSV from the settled bookings
    const headers = ['Name', 'Role', 'UserID', 'Resource', 'Floor', 'Type', 'Date', 'Start', 'End', 'Reason', 'Status'];
    const rows    = logs.map(b => [
      b.user?.name       ?? '',
      b.user?.role       ?? '',
      b.user?.userId     ?? '',
      b.resource?.name   ?? '',
      b.resource?.floor  ?? '',
      b.resource?.type   ?? '',
      b.date             ?? '',
      b.startTime        ?? '',
      b.endTime          ?? '',
      (b.reason          ?? '').replace(/,/g, ';'), // escape commas in reason
      b.status,
    ]);

    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `scras-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    window.showToast?.('Logs exported successfully!', 'success');
  }

  return (
    <div className="view-enter">

      {/* ── HEADER ── */}
      <div className="section-header" style={{ marginBottom: 24 }}>
        <div>
          <div className="section-title">System Logs</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>
            All approved and rejected booking records
          </div>
        </div>
        <button className="btn-primary" onClick={handleExport}>
          ⬇ Export CSV
        </button>
      </div>

      {/* ── FILTER TABS ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[
          { key: 'all',      label: 'All Records' },
          { key: 'approved', label: '✅ Approved'  },
          { key: 'rejected', label: '❌ Rejected'  },
        ].map(opt => (
          <button
            key={opt.key}
            className={`filter-btn${filter === opt.key ? ' active' : ''}`}
            onClick={() => setFilter(opt.key)}
          >
            {opt.label}
            <span style={{ marginLeft: 6, opacity: 0.7 }}>
              ({opt.key === 'all' ? logs.length : logs.filter(b => b.status === opt.key).length})
            </span>
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
          Loading logs…
        </div>
      )}

      {/* ── EMPTY ── */}
      {!loading && !error && displayed.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">No log entries yet</div>
          <div>Approved and rejected bookings will appear here.</div>
        </div>
      )}

      {/* ── LOG TABLE ── */}
      {!loading && !error && displayed.length > 0 && (
        <div className="table-card">
          <div
            className="table-header"
            style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1.2fr 1fr 1fr' }}
          >
            <span>User</span>
            <span>Resource</span>
            <span>Date</span>
            <span>Time Window</span>
            <span>Action</span>
            <span>Status</span>
          </div>

          {displayed.map(b => {
            const userName     = b.user?.name      ?? 'Unknown';
            const resourceName = b.resource?.name  ?? '—';
            const floor        = b.resource?.floor ?? '—';
            const { bg, color } = avatarStyle(userName);

            return (
              <div
                key={b._id}
                className="table-row"
                style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1.2fr 1fr 1fr' }}
              >
                {/* User */}
                <div className="user-cell">
                  <div className="mini-avatar" style={{ background: bg, color }}>
                    {getInitials(userName)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13 }}>{userName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {b.user?.userId ?? ''}
                    </div>
                  </div>
                </div>

                {/* Resource */}
                <div>
                  <div style={{ fontSize: 13 }}>{resourceName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Floor {floor} · {capitalize(b.resource?.type ?? '')}
                  </div>
                </div>

                {/* Date */}
                <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>
                  {b.date ?? '—'}
                </span>

                {/* Time window */}
                <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>
                  {b.startTime ?? '—'} – {b.endTime ?? '—'}
                </span>

                {/* Action taken */}
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  {b.status === 'approved' ? 'Booked' : 'Rejected'}
                </span>

                {/* Status tag */}
                <span className={`tag ${STATUS_TAG[b.status] ?? 'tag-blue'}`}>
                  ● {capitalize(b.status)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}