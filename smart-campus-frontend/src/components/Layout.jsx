import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const API = 'https://smart-campus-resource.onrender.com';

function getInitials(name = '') {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function capitalize(str = '') {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const showToast = (msg, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };
  return { toasts, showToast };
}

function ToastContainer({ toasts }) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{icons[t.type]}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

export default function Layout({ children, pageTitle = 'Dashboard' }) {
  const navigate = useNavigate();
  const { toasts, showToast } = useToast();

  // ── Sidebar state ──
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Live Search States ──
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const user    = JSON.parse(localStorage.getItem('user') || '{}');
  const name    = user.name || 'User';
  const role    = user.role || 'student';
  const isAdmin = role === 'admin';

  function closeSidebar()  { setSidebarOpen(false); }
  function toggleSidebar() { setSidebarOpen((prev) => !prev); }

  function handleLogout() {
    localStorage.removeItem('user');
    navigate('/login');
  }

  // Expose functions globally
  if (typeof window !== 'undefined') {
    window.showToast    = showToast;
    window.closeSidebar = closeSidebar;
  }

  const navLinkClass = ({ isActive }) => 'nav-item' + (isActive ? ' active' : '');
  const handleNavClick = () => closeSidebar();

  // ── Live Search Logic ──
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [resRooms, resBookings] = await Promise.all([
          fetch(`${API}/api/resources`),
          fetch(`${API}/api/bookings/all`)
        ]);
        
        const dataRooms = await resRooms.json();
        const dataBookings = await resBookings.json();
        
        const rooms = dataRooms.resources || [];
        const bookings = dataBookings.bookings || [];
        
        const matches = rooms.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const d = new Date();
        const localToday = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        
        const results = matches.map(room => {
           const roomBookings = bookings.filter(b => 
             (b.resource?._id === room._id || b.resourceId === room._id) && 
             b.status === 'approved' &&
             b.date >= localToday
           ).sort((a,b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
           
           return { room, bookings: roomBookings };
        });
        
        setSearchResults(results);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  return (
    <div id="app-screen" style={{ display: 'flex' }}>

      {/* ── SIDEBAR OVERLAY ── */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-mark" style={{ background: 'linear-gradient(135deg, var(--accent), var(--blue))' }}>US</div>
          <div>
            <span className="logo-text" style={{ letterSpacing: '0.5px' }}>UniSpace</span>
            <span className="logo-sub">v2.0</span>
          </div>
        </div>

        <div className="nav-section">
          <div className="nav-label">Main</div>

          <NavLink className={navLinkClass} to="/dashboard" onClick={handleNavClick}>
            <span className="nav-icon">📊</span> Dashboard
          </NavLink>

          {!isAdmin && (
            <>
              <NavLink className={navLinkClass} to="/resources" onClick={handleNavClick}>
                <span className="nav-icon">🏢</span> Resources
              </NavLink>
              <NavLink className={navLinkClass} to="/bookings" onClick={handleNavClick}>
                <span className="nav-icon">📅</span> My Bookings
              </NavLink>
            </>
          )}

          {isAdmin && (
            <>
              <NavLink className={navLinkClass} to="/requests" onClick={handleNavClick}>
                <span className="nav-icon">📥</span> Requests
              </NavLink>
              <NavLink className={navLinkClass} to="/logs" onClick={handleNavClick}>
                <span className="nav-icon">📋</span> Logs
              </NavLink>
            </>
          )}
        </div>

        <div className="nav-section">
          <div className="nav-label">Account</div>
          <NavLink className={navLinkClass} to="/profile" onClick={handleNavClick}>
            <span className="nav-icon">👤</span> Profile
          </NavLink>
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{getInitials(name)}</div>
            <div>
              <div className="user-name">{name}</div>
              <div className="user-role-tag">{capitalize(role)}</div>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Logout">⏻</button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="main">
        <div className="topbar">
          <div className="topbar-left">
            <button
              className="menu-toggle"
              onClick={toggleSidebar}
              aria-label="Toggle navigation menu"
            >
              {sidebarOpen ? '✕' : '☰'}
            </button>
            <div>
              <div className="page-title">{pageTitle}</div>
              <div className="page-crumb">
                Overview · <span>{capitalize(role)}</span>
              </div>
            </div>
          </div>

          <div className="topbar-right">
            {/* ── LIVE SEARCH DROPDOWN ── */}
            <div className="search-wrap" style={{ position: 'relative' }}>
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search rooms (e.g. TP 1504)…" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => setTimeout(() => setSearchQuery(''), 200)}
              />
              
              {/* Dropdown Container */}
              {searchQuery.trim() && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '320px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '12px', padding: '12px', boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                  maxHeight: '400px', overflowY: 'auto', zIndex: 1000
                }}>
                  {isSearching ? (
                    <div style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', padding: '10px' }}>⏳ Searching...</div>
                  ) : searchResults.length === 0 ? (
                    <div style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', padding: '10px' }}>No rooms found.</div>
                  ) : (
                    searchResults.map(({ room, bookings }) => (
                      <div key={room._id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{room.name}</div>
                          <div style={{ fontSize: 11, background: 'rgba(79,142,255,0.1)', color: 'var(--blue)', padding: '2px 8px', borderRadius: '10px' }}>
                            {room.capacity} seats
                          </div>
                        </div>
                        
                        {bookings.length === 0 ? (
                          <div style={{ fontSize: 12, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                            <span style={{ fontSize: 10 }}>🟢</span> Free of upcoming bookings
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Upcoming Bookings</div>
                            {bookings.slice(0, 3).map(b => (
                              <div key={b._id} style={{ fontSize: 12, background: 'var(--bg)', padding: '6px 10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-dim)' }}>{b.date}</span>
                                <span style={{ color: 'var(--red)' }}>{b.startTime} - {b.endTime}</span>
                              </div>
                            ))}
                            {bookings.length > 3 && (
                              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>+ {bookings.length - 3} more...</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            {/* Notification Bell is removed */}
          </div>
        </div>

        <div className="content view-enter">{children}</div>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}