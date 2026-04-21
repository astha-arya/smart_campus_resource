import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const STATUS_TAG = { approved: 'tag-green', pending: 'tag-yellow', rejected: 'tag-red' };
const capitalize  = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

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

const API = 'https://smart-campus-resource.onrender.com';

export default function Dashboard() {
  const navigate = useNavigate();
  const user    = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  // --- Smart Dashboard States ---
  const [stats, setStats] = useState({ 
    total: 153, 
    eventsToday: 0, 
    card3Value: 0, 
    pending: 0 
  });
  
  const [recentBookings, setRecentBookings] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Fetch Live Statistics
  useEffect(() => {
    async function fetchLiveStats() {
      try {
        const resRooms = await fetch(`${API}/api/resources`);
        const dataRooms = await resRooms.json();
        const totalRooms = dataRooms.resources?.length || 153;

        const resBookings = await fetch(`${API}/api/bookings/all`);
        const dataBookings = await resBookings.json();
        const bookings = dataBookings.bookings || [];

        const d = new Date();
        const localToday = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        // Bulletproof helper to check if a booking belongs to the logged-in user
        const isMyBooking = (b) => {
          const matchId = user.userId;
          return b.userId === matchId || 
                 (b.user && b.user.userId === matchId) || 
                 (b.user && b.user._id === matchId);
        };

        // 1. Campus Events Today (Approved & Today)
        const eventsTodayCount = bookings.filter(b => b.status === 'approved' && b.date === localToday).length;

        // 2. Dynamic Card 3 Logic (All Bookings vs My Bookings)
        const myTotalBookingsCount = bookings.filter(b => b.status === 'approved' && isMyBooking(b)).length;
        const totalApprovedBookings = bookings.filter(b => b.status === 'approved').length;

        // 3. Pending Requests Logic (All Pending vs My Pending)
        const allPendingCount = bookings.filter(b => b.status === 'pending').length;
        const myPendingCount = bookings.filter(b => b.status === 'pending' && isMyBooking(b)).length;

        setStats({
          total: totalRooms,
          eventsToday: eventsTodayCount,
          card3Value: isAdmin ? totalApprovedBookings : myTotalBookingsCount,
          pending: isAdmin ? allPendingCount : myPendingCount
        });
      } catch (err) {
        console.error('Failed to fetch live stats', err);
      }
    }
    fetchLiveStats();
  }, [isAdmin, user.userId]);

  // Fetch Recent Activity (Admins Only)
  useEffect(() => {
    if (!isAdmin) return;
    async function fetchRecent() {
      setActivityLoading(true);
      try {
        const res  = await fetch(`${API}/api/bookings/all`);
        const data = await res.json();
        if (res.ok) {
          setRecentBookings((data.bookings || []).slice(0, 5));
        }
      } catch {
        console.error('Failed to fetch recent activity');
      } finally {
        setActivityLoading(false);
      }
    }
    fetchRecent();
  }, [isAdmin]);

  return (
    <div className="view-enter">

      {/* ── SMART STAT CARDS ── */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon blue">🏢</div>
          <div className="stat-num glow-blue">{stats.total}</div>
          <div className="stat-label">Total Resources</div>
          <span className="stat-change up">Seeded Database</span>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon green">📅</div>
          <div className="stat-num" style={{ color: 'var(--green)' }}>{stats.eventsToday}</div>
          <div className="stat-label">Campus Events Today</div>
          <span className="stat-change up">Approved classes & events</span>
        </div>
        
        {/* Dynamic Card 3: Admin vs User */}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(124,92,255,0.12)' }}>
            {isAdmin ? '📚' : '📌'}
          </div>
          <div className="stat-num" style={{ color: 'var(--accent)' }}>{stats.card3Value}</div>
          <div className="stat-label">
            {isAdmin ? 'Total Bookings' : 'My Bookings'}
          </div>
          <span className="stat-change" style={{ background: 'rgba(124,92,255,0.1)', color: 'var(--accent)' }}>
            {isAdmin ? 'All approved sessions' : 'All your approved sessions'}
          </span>
        </div>
        
        {/* Dynamic Card 4: Admin vs User */}
        <div className="stat-card">
          <div className="stat-icon yellow">⏳</div>
          <div className="stat-num" style={{ color: 'var(--yellow)' }}>{stats.pending}</div>
          <div className="stat-label">{isAdmin ? 'Total Pending' : 'My Pending Requests'}</div>
          <span className="stat-change up">{isAdmin ? 'Needs your approval' : 'Awaiting Admin Approval'}</span>
        </div>
      </div>

      {/* ── CAMPUS BUILDINGS (Full Width Grid) ── */}
      <div style={{ marginBottom: 32 }}>
        <div className="section-header">
          <div className="section-title">Campus Buildings</div>
          {!isAdmin && (
            <button className="btn-sm" onClick={() => navigate('/resources')}>
              View All
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
          
          {/* Tech Park 1 */}
          <div
            className="building-card"
            onClick={() => !isAdmin && navigate('/resources')}
            style={{ cursor: isAdmin ? 'default' : 'pointer' }}
            title={!isAdmin ? 'Browse resources in Tech Park 1' : undefined}
          >
            <div className="building-image" style={{ fontSize: 36 }}>
              🏛️
              <div className="building-badge">15 Floors</div>
            </div>
            <div className="building-body">
              <div className="building-name" style={{ fontSize: 14 }}>Tech Park 1</div>
              <div className="building-meta">Main Academic Block</div>
              <div className="building-stats">
                <div className="b-stat">
                  <div className="b-stat-num glow-green" style={{ fontSize: 15 }}>{stats.total > 0 ? stats.total - 11 : 0}</div>
                  <div className="b-stat-lbl">Free</div>
                </div>
                <div className="b-stat">
                  <div className="b-stat-num" style={{ color: 'var(--red)', fontSize: 15 }}>11</div>
                  <div className="b-stat-lbl">Booked</div>
                </div>
                <div className="b-stat">
                  <div className="b-stat-num glow-blue" style={{ fontSize: 15 }}>{stats.total}</div>
                  <div className="b-stat-lbl">Total</div>
                </div>
              </div>
            </div>
          </div>

          {/* Common Halls */}
          <div
            className="building-card"
            onClick={() => navigate('/resources?type=hall&floor=0')}
            style={{ cursor: 'pointer' }}
            title="View all campus halls"
          >
            <div className="building-image" style={{ fontSize: 36, background: 'linear-gradient(135deg, rgba(124,92,255,0.15), rgba(79,142,255,0.08))' }}>
              🏟️
              <div className="building-badge">13 Halls</div>
            </div>
            <div className="building-body">
              <div className="building-name" style={{ fontSize: 14 }}>Common Halls</div>
              <div className="building-meta">Seminar & Event Spaces</div>
              <div className="building-stats">
                <div className="b-stat">
                  <div className="b-stat-num" style={{ color: 'var(--accent)', fontSize: 15 }}>13</div>
                  <div className="b-stat-lbl">Halls</div>
                </div>
                <div className="b-stat">
                  <div className="b-stat-num glow-green" style={{ fontSize: 15 }}>—</div>
                  <div className="b-stat-lbl">Free</div>
                </div>
                <div className="b-stat">
                  <div className="b-stat-num" style={{ color: 'var(--text-muted)', fontSize: 15 }}>400+</div>
                  <div className="b-stat-lbl">Cap.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tech Park 2 */}
          <div
            className="building-card"
            onClick={() => window.showToast?.('Tech Park 2 — Coming Soon!', 'info')}
            style={{ cursor: 'pointer' }}
          >
            <div className="building-image" style={{ fontSize: 36, background: 'repeating-linear-gradient(45deg,var(--surface2),var(--surface2) 10px,var(--bg) 10px,var(--bg) 20px)' }}>
              🚧
              <div className="building-badge">Soon</div>
            </div>
            <div className="building-body">
              <div className="building-name" style={{ fontSize: 14 }}>Tech Park 2</div>
              <div className="building-meta">Under Construction</div>
              <div className="building-stats">
                <div className="b-stat">
                  <div className="b-stat-num" style={{ color: 'var(--text-muted)', fontSize: 15 }}>—</div>
                  <div className="b-stat-lbl">Free</div>
                </div>
                <div className="b-stat">
                  <div className="b-stat-num" style={{ color: 'var(--text-muted)', fontSize: 15 }}>—</div>
                  <div className="b-stat-lbl">Booked</div>
                </div>
                <div className="b-stat">
                  <div className="b-stat-num" style={{ color: 'var(--text-muted)', fontSize: 15 }}>8</div>
                  <div className="b-stat-lbl">Planned</div>
                </div>
              </div>
            </div>
          </div>

          {/* UB (University Building) */}
          <div
            className="building-card"
            onClick={() => window.showToast?.('UB — Coming Soon!', 'info')}
            style={{ cursor: 'pointer' }}
          >
            <div className="building-image" style={{ fontSize: 36, background: 'repeating-linear-gradient(45deg,var(--surface2),var(--surface2) 10px,var(--bg) 10px,var(--bg) 20px)' }}>
              🏢
              <div className="building-badge">Soon</div>
            </div>
            <div className="building-body">
              <div className="building-name" style={{ fontSize: 14 }}>UB</div>
              <div className="building-meta">University Building</div>
              <div className="building-stats">
                <div className="b-stat">
                  <div className="b-stat-num" style={{ color: 'var(--text-muted)', fontSize: 15 }}>—</div>
                  <div className="b-stat-lbl">Free</div>
                </div>
                <div className="b-stat">
                  <div className="b-stat-num" style={{ color: 'var(--text-muted)', fontSize: 15 }}>—</div>
                  <div className="b-stat-lbl">Booked</div>
                </div>
                <div className="b-stat">
                  <div className="b-stat-num" style={{ color: 'var(--text-muted)', fontSize: 15 }}>12</div>
                  <div className="b-stat-lbl">Planned</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bell Block */}
          <div
            className="building-card"
            onClick={() => window.showToast?.('Bell Block — Coming Soon!', 'info')}
            style={{ cursor: 'pointer' }}
          >
            <div className="building-image" style={{ fontSize: 36, background: 'repeating-linear-gradient(45deg,var(--surface2),var(--surface2) 10px,var(--bg) 10px,var(--bg) 20px)' }}>
              🔔
              <div className="building-badge">Soon</div>
            </div>
            <div className="building-body">
              <div className="building-name" style={{ fontSize: 14 }}>Bell Block</div>
              <div className="building-meta">Under Construction</div>
              <div className="building-stats">
                <div className="b-stat">
                  <div className="b-stat-num" style={{ color: 'var(--text-muted)', fontSize: 15 }}>—</div>
                  <div className="b-stat-lbl">Free</div>
                </div>
                <div className="b-stat">
                  <div className="b-stat-num" style={{ color: 'var(--text-muted)', fontSize: 15 }}>—</div>
                  <div className="b-stat-lbl">Booked</div>
                </div>
                <div className="b-stat">
                  <div className="b-stat-num" style={{ color: 'var(--text-muted)', fontSize: 15 }}>5</div>
                  <div className="b-stat-lbl">Planned</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── RECENT ACTIVITY ── */}
      {isAdmin && (
        <>
          <div className="section-header">
            <div className="section-title">Recent Activity</div>
            <button className="btn-sm" onClick={() => navigate('/logs')}>
              View All Logs
            </button>
          </div>

          <div className="table-card">
            <div className="table-header">
              <span>User</span>
              <span>Resource</span>
              <span>Date</span>
              <span>Time</span>
              <span>Status</span>
            </div>

            {activityLoading && (
              <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
                ⏳ Loading activity…
              </div>
            )}

            {!activityLoading && recentBookings.length === 0 && (
              <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
                No booking activity yet.
              </div>
            )}

            {!activityLoading && recentBookings.map(b => {
              const userName     = b.user?.name     ?? 'Unknown';
              const resourceName = b.resource?.name ?? '—';
              const { bg, color } = avatarStyle(userName);

              return (
                <div className="table-row" key={b._id}>
                  <div className="user-cell">
                    <div className="mini-avatar" style={{ background: bg, color }}>
                      {getInitials(userName)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13 }}>{userName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {b.user?.role ? capitalize(b.user.role) : ''}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 13 }}>
                    {resourceName}
                    {b.resource?.type
                      ? <span style={{ color: 'var(--text-muted)', fontSize: 11 }}> · {capitalize(b.resource.type)}</span>
                      : null}
                  </span>
                  <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>{b.date ?? '—'}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                    {b.startTime ?? '—'} – {b.endTime ?? '—'}
                  </span>
                  <span className={`tag ${STATUS_TAG[b.status] ?? 'tag-blue'}`}>
                    ● {capitalize(b.status)}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

    </div>
  );
}