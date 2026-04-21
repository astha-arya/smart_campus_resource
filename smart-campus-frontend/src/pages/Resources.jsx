import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import BookingModal from '../components/BookingModal';

const API = 'https://smart-campus-resource.onrender.com';

const FLOORS = [
  { num: 15, dept: 'CTECH'       }, { num: 14, dept: 'CTECH'       },
  { num: 13, dept: 'Electronics' }, { num: 12, dept: 'Electronics' },
  { num: 11, dept: 'Electronics' }, { num: 10, dept: 'Electronics' },
  { num:  9, dept: 'Electronics' }, { num:  8, dept: 'CTECH'       },
  { num:  7, dept: 'CTECH'       }, { num:  6, dept: 'CTECH'       },
  { num:  5, dept: 'NWC'         }, { num:  4, dept: 'NWC'         },
  { num:  3, dept: 'NWC'         }, { num:  2, dept: 'Computing'   },
  { num:  1, dept: 'Computing'   },
];

const HALLS_FLOOR = 0;

const TYPE_ICON   = { classroom: '📖', lab: '🧪', hall: '🏛️' };
const FILTER_OPTS = [
  { key: 'all',       label: 'All'           },
  { key: 'classroom', label: '📖 Classrooms' },
  { key: 'lab',       label: '🧪 Labs'       },
  { key: 'hall',      label: '🏛️ Halls'      },
];

export default function Resources() {
  const [searchParams] = useSearchParams();

  const initialFloor  = searchParams.get('floor') !== null ? Number(searchParams.get('floor')) : 15;
  const initialFilter = searchParams.get('type') || 'all';

  const [currentFloor,  setCurrentFloor]  = useState(initialFloor);
  const [currentFilter, setCurrentFilter] = useState(initialFilter);
  const [resources,     setResources]     = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [modalResource, setModalResource] = useState(null);

  const effectiveFloor = currentFilter === 'hall' ? HALLS_FLOOR : currentFloor;

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let url = `${API}/api/resources?floor=${effectiveFloor}`;
      if (currentFilter !== 'all') url += `&type=${currentFilter}`;

      const res  = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to fetch resources.');
        setResources([]);
        return;
      }
      setResources(data.resources || []);
    } catch {
      setError('Cannot reach the server. Is your backend running?');
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveFloor, currentFilter]);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  function handleFilterChange(key) {
    setCurrentFilter(key);
    if (key !== 'hall' && currentFilter === 'hall') {
      setCurrentFloor(15);
    }
  }

  // ── Open modal and simultaneously close the sidebar ──────────────────────
  // The sidebar uses CSS `transform` which creates a new stacking context,
  // trapping any `position:fixed` children (like the modal overlay) inside
  // that context instead of the viewport. Closing the sidebar before the
  // modal mounts ensures the modal overlay is a child of a non-transformed
  // ancestor and can position itself correctly relative to the viewport.
  function openModal(room) {
    window.closeSidebar?.(); // close drawer if open — safe no-op on desktop
    setModalResource(room);
  }

  const currentFloorMeta    = FLOORS.find(f => f.num === currentFloor);
  const isHallsFilterActive = currentFilter === 'hall';

  return (
    <div className="view-enter">

      {/* ── TYPE FILTERS ── */}
      <div className="filter-bar">
        {FILTER_OPTS.map(opt => (
          <button
            key={opt.key}
            className={`filter-btn${currentFilter === opt.key ? ' active' : ''}`}
            onClick={() => handleFilterChange(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── FLOOR SELECTOR — hidden when Halls filter is active ── */}
      {!isHallsFilterActive && (
        <div style={{ marginBottom: 12 }}>
          <div className="nav-label">Select Floor</div>
          <div className="floor-scroll">
            {FLOORS.map(f => (
              <button
                key={f.num}
                className={`floor-chip${currentFloor === f.num ? ' active' : ''}`}
                onClick={() => setCurrentFloor(f.num)}
              >
                Floor {f.num} · {f.dept}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── FLOOR / VIEW HEADING ── */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="section-title">
          {isHallsFilterActive
            ? 'All Halls — Campus Wide'
            : `Floor ${currentFloor} — ${currentFloorMeta?.dept ?? ''} Department`}
        </div>
        <span className="tag tag-blue">
          {loading ? '…' : `${resources.length} Room${resources.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* ── ERROR STATE ── */}
      {error && (
        <div style={{ padding: '16px 20px', background: 'rgba(255,82,102,0.08)', border: '1px solid rgba(255,82,102,0.2)', borderRadius: 12, color: 'var(--red)', fontSize: 13, marginBottom: 20 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── LOADING STATE ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          Loading rooms…
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!loading && !error && resources.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🏚️</div>
          <div className="empty-title">No rooms found</div>
          <div>
            {isHallsFilterActive
              ? 'No halls are seeded in the database yet.'
              : 'Try a different floor or filter.'}
          </div>
        </div>
      )}

      {/* ── ROOMS GRID ── */}
      {!loading && resources.length > 0 && (
        <div className="rooms-grid">
          {resources.map(room => {
            const isAvailable = room.availableSlots?.length > 0;
            const icon        = TYPE_ICON[room.type] ?? '🏢';
            return (
              <div 
    key={room._id} 
    className="room-card" 
    onClick={() => {
      if (window.closeSidebar) window.closeSidebar();
      setModalResource(room);
    }}
  >
                <div className="room-thumb">
                  <span className={`avail-dot ${isAvailable ? 'available' : 'booked'}`} />
                  {icon}
                </div>
                <div className="room-body">
                  <div className="room-name">{room.name}</div>
                  <div className="room-type">
                    {room.type.charAt(0).toUpperCase() + room.type.slice(1)} · Floor {room.floor}
                  </div>
                  <div className="room-footer">
                    <span className="room-cap">👥 {room.capacity} seats</span>
                    <span className={`room-avail ${isAvailable ? 'avail' : 'busy'}`}>
                      {isAvailable ? '● Available' : '● Fully Booked'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── BOOKING MODAL ── */}
      {modalResource && (
        <BookingModal
          resource={modalResource}
          onClose={() => setModalResource(null)}
          onSuccess={fetchResources}
        />
      )}
    </div>
  );
}