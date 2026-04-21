import { useState } from 'react';
import { createPortal } from 'react-dom';

const API = 'https://smart-campus-resource.onrender.com';

// FIX: Get the local date, not the UTC date!
const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
};

function timeToMinutes(t = '') {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export default function BookingModal({ resource, onClose, onSuccess }) {
  const [date,       setDate]       = useState(todayISO());
  const [startTime,  setStartTime]  = useState('09:00');
  const [endTime,    setEndTime]    = useState('10:00');
  const [reason,     setReason]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!resource) return null;

  const user      = JSON.parse(localStorage.getItem('user') || '{}');
  const TYPE_ICON = { classroom: '📖', lab: '🧪', hall: '🏛️' };
  const icon      = TYPE_ICON[resource.type] ?? '🏢';

  function validate() {
    if (!date) { window.showToast?.('Please select a date.', 'error'); return false; }
    
    // Hard block for past dates
    if (date < todayISO()) {
      window.showToast?.('You cannot book a room for a past date.', 'error');
      return false;
    }

    if (!startTime) { window.showToast?.('Please select a start time.', 'error'); return false; }

    // --- NEW: Hard block for past times ON TODAY'S DATE ---
    if (date === todayISO()) {
      const d = new Date();
      const currentMins = d.getHours() * 60 + d.getMinutes(); // Current time in minutes
      
      if (timeToMinutes(startTime) < currentMins) {
        window.showToast?.('You cannot book a time that has already passed today.', 'error');
        return false;
      }
    }

    if (!endTime) { window.showToast?.('Please select an end time.', 'error'); return false; }
    
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      window.showToast?.('End time must be after start time.', 'error');
      return false;
    }
    
    if (!reason.trim()) {
      window.showToast?.('Please enter a reason for booking.', 'error');
      return false;
    }
    
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/bookings`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:     user.userId,
          resourceId: resource._id,
          date,
          startTime,
          endTime,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        window.showToast?.(data.message || 'Booking failed.', 'error');
        return;
      }
      onSuccess?.();
      onClose();
      window.showToast?.(`Booking requested for ${resource.name}!`, 'success');
    } catch {
      window.showToast?.('Cannot reach the server.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  const inputStyle = {
    width:       '100%',
    background:  'var(--bg)',
    border:      '1px solid var(--border)',
    borderRadius: 10,
    padding:     '10px 14px',
    color:       'var(--text)',
    fontFamily:  "'DM Sans', sans-serif",
    fontSize:    13,
    outline:     'none',
    colorScheme: 'dark',
  };

  const labelStyle = {
    fontSize:      11,
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    color:         'var(--text-muted)',
    marginBottom:  6,
    display:       'block',
  };

  const durationMins = timeToMinutes(endTime) - timeToMinutes(startTime);

  return createPortal(
    <div className="modal-overlay open" onClick={handleBackdropClick}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{resource.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>
              {icon} {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
              {' '}· Floor {resource.floor}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="room-detail-grid" style={{ marginBottom: 24 }}>
          <div className="detail-item">
            <div className="detail-lbl">Capacity</div>
            <div className="detail-val">👥 {resource.capacity} seats</div>
          </div>
          <div className="detail-item">
            <div className="detail-lbl">Department</div>
            <div className="detail-val">{resource.department || '—'}</div>
          </div>
          <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
            <div className="detail-lbl">Features</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {resource.features?.length
                ? resource.features.map(f => (
                    <span key={f} className="tag tag-blue" style={{ fontSize: 11 }}>{f}</span>
                  ))
                : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No features listed</span>
              }
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Booking Date</label>
            <input
              type="date"
              style={inputStyle}
              value={date}
              min={todayISO()} // <--- Now strictly enforces today based on Local Time
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Start Time</label>
              <input type="time" style={inputStyle} value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>End Time</label>
              <input type="time" style={inputStyle} value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          {startTime && endTime && (
            <div style={{ marginTop: 8, fontSize: 12 }}>
              {durationMins > 0
                ? <span style={{ color: 'var(--green)' }}>⏱ Duration: {durationMins} minutes</span>
                : <span style={{ color: 'var(--red)'   }}>⚠ End time must be after start time</span>
              }
            </div>
          )}
        </div>

        <div className="nav-label" style={{ marginBottom: 8 }}>Reason for Booking</div>
        <textarea
          className="reason-textarea"
          placeholder="e.g., Group project work, Lab session for OS experiment…"
          value={reason}
          onChange={e => setReason(e.target.value)}
        />

        <button
          className="btn-primary"
          style={{ width: '100%', opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Sending…' : 'Send Booking Request →'}
        </button>
      </div>
    </div>,
    document.body
  );
}