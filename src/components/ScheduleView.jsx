import { useState } from 'react';
import scheduleService from '../services/scheduleService';
import './ScheduleView.css';

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

function ScheduleView() {
  const [technicianName, setTechnicianName] = useState('');
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [upcomingSchedule, setUpcomingSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadSchedules = async () => {
    if (!technicianName.trim()) {
      setError('Please enter a technician name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [today, upcoming] = await Promise.all([
        scheduleService.getTodaySchedule(technicianName),
        scheduleService.getScheduleForTechnician(technicianName)
      ]);

      setTodaySchedule(today);
      // Filter out today's schedule from upcoming
      const todayDate = new Date().toISOString().split('T')[0];
      setUpcomingSchedule(upcoming.filter(item => item.scheduled_date !== todayDate));
      setHasLoaded(true);
    } catch (err) {
      console.error('Error loading schedules:', err);
      setError('Failed to load schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      loadSchedules();
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'No time set';
    // Handle both full timestamps and time-only strings
    const time = timeString.includes('T') ? new Date(timeString) : new Date(`1970-01-01T${timeString}`);
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  const getStatusClass = (status) => {
    const statusMap = {
      'scheduled': 'status-scheduled',
      'confirmed': 'status-confirmed',
      'in_progress': 'status-in-progress',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
    };
    return statusMap[status] || 'status-scheduled';
  };

  const renderScheduleCard = (schedule) => (
    <div key={schedule.id} className="schedule-card">
      <div className="schedule-card-header">
        <div className="schedule-time-block">
          <div className="schedule-time">{formatTime(schedule.scheduled_time)}</div>
          {schedule.duration_minutes && (
            <div className="schedule-duration">{formatDuration(schedule.duration_minutes)}</div>
          )}
        </div>
        <div className="schedule-status-block">
          <span className={`schedule-status ${getStatusClass(schedule.status)}`}>
            {schedule.status?.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      <div className="schedule-card-body">
        <div className="schedule-job-number">Job #{schedule.job_number}</div>
        <div className="schedule-customer">{schedule.customer_name}</div>
        <div className="schedule-address">{schedule.property_address}</div>
        {schedule.notes && (
          <div className="schedule-notes">
            <span className="notes-label">Notes:</span> {schedule.notes}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="schedule-view-container">
      <div className="schedule-view-card">
        <h2>Schedule & Dispatch</h2>

        {error && (
          <div className="schedule-error">
            {error}
          </div>
        )}

        <div className="schedule-form">
          <div className="form-group">
            <label htmlFor="technicianName">Technician Name</label>
            <input
              id="technicianName"
              type="text"
              className="p-input"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your name"
              disabled={loading}
            />
          </div>
          <button
            className="load-schedule-button"
            onClick={loadSchedules}
            disabled={loading || !technicianName.trim()}
          >
            {loading ? 'Loading...' : 'Load Schedule'}
          </button>
        </div>

        {hasLoaded ? (
          loading ? (
            <div className="loading-state">
              Loading schedule...
            </div>
          ) : (
            <>
              {/* Today's Schedule */}
              <div className="schedule-section">
                <div className="section-header">
                  <h3>Today's Schedule</h3>
                  <span className="schedule-count">{todaySchedule.length} {todaySchedule.length === 1 ? 'visit' : 'visits'}</span>
                </div>

                {todaySchedule.length === 0 ? (
                  <div className="no-schedule-message">
                    <div className="no-schedule-icon"><CalendarIcon /></div>
                    <div>No scheduled visits for today</div>
                  </div>
                ) : (
                  <div className="schedule-cards-list">
                    {todaySchedule.map(renderScheduleCard)}
                  </div>
                )}
              </div>

              {/* Upcoming Schedule */}
              {upcomingSchedule.length > 0 && (
                <div className="schedule-section">
                  <div className="section-header">
                    <h3>Upcoming Schedule</h3>
                    <span className="schedule-count">{upcomingSchedule.length} {upcomingSchedule.length === 1 ? 'visit' : 'visits'}</span>
                  </div>

                  <div className="schedule-cards-list">
                    {upcomingSchedule.map((schedule) => (
                      <div key={schedule.id} className="schedule-card with-date">
                        <div className="schedule-date-header">
                          {formatDate(schedule.scheduled_date)}
                        </div>
                        {renderScheduleCard(schedule)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )
        ) : (
          <div className="no-tech-message">
            Please enter your name to view your schedule
          </div>
        )}
      </div>
    </div>
  );
}

export default ScheduleView;
