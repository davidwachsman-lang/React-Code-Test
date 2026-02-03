import React, { useState } from 'react';
import './Page.css';
import './DispatchAndScheduling.css';

function DispatchAndScheduling() {
  const [draggedJob, setDraggedJob] = useState(null);
  const [dragSource, setDragSource] = useState(null); // Track where job is being dragged from
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    // Get the start of current week (Monday)
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(today.setDate(diff));
  });
  
  // Generate time slots from 7 AM to 7 PM
  const timeSlots = [];
  for (let hour = 7; hour <= 19; hour++) {
    const hour12 = hour > 12 ? hour - 12 : hour;
    const period = hour >= 12 ? 'PM' : 'AM';
    timeSlots.push(`${hour12}:00 ${period}`);
  }

  // Generate days of the week with dates
  const daysOfWeek = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + i);
    daysOfWeek.push({
      name: dayNames[i],
      shortName: dayNames[i].substring(0, 3),
      date: date,
      dateString: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    });
  }

  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() - 7);
      return newDate;
    });
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + 7);
      return newDate;
    });
  };

  const goToToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(today.setDate(diff)));
  };

  // Schedule structure: { day: { timeSlot: [jobs] } }
  const [schedule, setSchedule] = useState(() => {
    const initialSchedule = {};
    dayNames.forEach(day => {
      initialSchedule[day] = {};
      timeSlots.forEach(time => {
        initialSchedule[day][time] = [];
      });
    });
    return initialSchedule;
  });

  const [unassignedJobs] = useState([
    { id: 1, client: 'Smith Residence', type: 'Water Damage', priority: 'high', duration: 4, address: '123 Main St' },
    { id: 2, client: 'Johnson Building', type: 'Fire Restoration', priority: 'urgent', duration: 8, address: '456 Oak Ave' },
    { id: 3, client: 'Davis Home', type: 'Mold Remediation', priority: 'medium', duration: 6, address: '789 Pine Rd' },
    { id: 4, client: 'Wilson Property', type: 'Storm Damage', priority: 'high', duration: 5, address: '321 Elm St' },
    { id: 5, client: 'Brown Estate', type: 'Flood Cleanup', priority: 'medium', duration: 3, address: '654 Maple Dr' },
    { id: 6, client: 'Martinez Office', type: 'Water Extraction', priority: 'urgent', duration: 2, address: '987 Center St' },
    { id: 7, client: 'Taylor Home', type: 'Odor Removal', priority: 'low', duration: 3, address: '555 Lake Dr' }
  ]);

  const [technicians] = useState([
    { id: 1, name: 'Mike Johnson', specialty: 'Water Damage' },
    { id: 2, name: 'Sarah Chen', specialty: 'Fire Restoration' },
    { id: 3, name: 'Dave Wilson', specialty: 'Mold Remediation' },
    { id: 4, name: 'Lisa Brown', specialty: 'General Restoration' }
  ]);

  const [dragOverSlot, setDragOverSlot] = useState(null);

  const handleDragStart = (e, job, sourceDay = null, sourceTimeSlot = null) => {
    setDraggedJob(job);
    setDragSource(sourceDay && sourceTimeSlot ? { day: sourceDay, timeSlot: sourceTimeSlot } : null);
    e.dataTransfer.effectAllowed = 'move';
    // Add visual feedback
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedJob(null);
    setDragSource(null);
    setDragOverSlot(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (day, timeSlot) => {
    if (draggedJob) {
      setDragOverSlot(`${day}-${timeSlot}`);
    }
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = (e, day, timeSlot) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedJob) {
      setSchedule(prev => {
        const newSchedule = { ...prev };
        
        // If dragging from a scheduled slot, remove from source
        if (dragSource) {
          newSchedule[dragSource.day] = {
            ...newSchedule[dragSource.day],
            [dragSource.timeSlot]: newSchedule[dragSource.day][dragSource.timeSlot].filter(
              job => job.id !== draggedJob.id
            )
          };
        }
        
        // Add to destination (preserve assignedTech if moving from schedule)
        newSchedule[day] = {
          ...newSchedule[day],
          [timeSlot]: [
            ...newSchedule[day][timeSlot], 
            dragSource ? draggedJob : { ...draggedJob, assignedTech: null }
          ]
        };
        
        return newSchedule;
      });
    }
    setDraggedJob(null);
    setDragSource(null);
    setDragOverSlot(null);
  };

  const removeJob = (day, timeSlot, jobId) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [timeSlot]: prev[day][timeSlot].filter(job => job.id !== jobId)
      }
    }));
  };

  const assignTechnician = (day, timeSlot, jobId, techId) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [timeSlot]: prev[day][timeSlot].map(job => 
          job.id === jobId ? { ...job, assignedTech: techId } : job
        )
      }
    }));
  };

  const getPriorityClass = (priority) => {
    switch(priority) {
      case 'urgent': return 'priority-urgent';
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      default: return 'priority-low';
    }
  };

  const getTechName = (techId) => {
    const tech = technicians.find(t => t.id === techId);
    return tech ? tech.name : 'Unassigned';
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Create CSV content
    let csvContent = 'Day,Date,Time,Client,Type,Priority,Duration (hrs),Technician,Address\n';
    
    daysOfWeek.forEach(dayInfo => {
      timeSlots.forEach(timeSlot => {
        const jobs = schedule[dayInfo.name][timeSlot];
        if (jobs.length > 0) {
          jobs.forEach(job => {
            const techName = getTechName(job.assignedTech);
            csvContent += `"${dayInfo.name}","${dayInfo.dateString}","${timeSlot}","${job.client}","${job.type}","${job.priority}","${job.duration}","${techName}","${job.address}"\n`;
          });
        }
      });
    });

    // Add unassigned jobs
    if (unassignedJobs.length > 0) {
      csvContent += '\nUnassigned Jobs\n';
      csvContent += 'Client,Type,Priority,Duration (hrs),Address\n';
      unassignedJobs.forEach(job => {
        csvContent += `"${job.client}","${job.type}","${job.priority}","${job.duration}","${job.address}"\n`;
      });
    }

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const weekRange = `${daysOfWeek[0].dateString}-${daysOfWeek[6].dateString}`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', `schedule_${weekRange.replace(/\s/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-container dispatch-page">
      <div className="dispatch-header">
        <div className="header-left">
          <h1>Dispatch & Scheduling</h1>
          <div className="week-navigator">
            <button className="nav-btn" onClick={goToPreviousWeek} title="Previous Week">
              ‹
            </button>
            <button className="nav-btn today-btn" onClick={goToToday}>
              Today
            </button>
            <button className="nav-btn" onClick={goToNextWeek} title="Next Week">
              ›
            </button>
            <span className="week-range">
              {daysOfWeek[0].dateString} - {daysOfWeek[6].dateString}, {currentWeekStart.getFullYear()}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={handlePrint}>Print Schedule</button>
          <button className="btn-secondary" onClick={handleExport}>Export</button>
        </div>
      </div>

      <div className="dispatch-layout">
        {/* Unassigned Jobs Panel */}
        <div className="unassigned-panel">
          <h2>Unassigned Jobs</h2>
          <div className="jobs-list">
            {unassignedJobs.map(job => (
              <div
                key={job.id}
                className={`job-card ${getPriorityClass(job.priority)}`}
                draggable
                onDragStart={(e) => handleDragStart(e, job)}
                onDragEnd={handleDragEnd}
              >
                <div className="drag-handle">⋮⋮</div>
                <div className="job-header">
                  <h3>{job.client}</h3>
                  <span className={`priority-badge ${job.priority}`}>
                    {job.priority}
                  </span>
                </div>
                <div className="job-details">
                  <p><strong>Type:</strong> {job.type}</p>
                  <p><strong>Duration:</strong> {job.duration} hrs</p>
                  <p><strong>Address:</strong> {job.address}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="technicians-panel">
            <h3>Available Technicians</h3>
            {technicians.map(tech => (
              <div key={tech.id} className="tech-card">
                <div className="tech-avatar">{tech.name.charAt(0)}</div>
                <div className="tech-info">
                  <strong>{tech.name}</strong>
                  <span>{tech.specialty}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Outlook-style Calendar Grid */}
        <div className="calendar-container">
          <div className="calendar-grid">
            {/* Time Column */}
            <div className="time-column">
              <div className="time-header"></div>
              {timeSlots.map(time => (
                <div key={time} className="time-slot-label">
                  {time}
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {daysOfWeek.map(dayInfo => {
              const isToday = new Date().toDateString() === dayInfo.date.toDateString();
              return (
                <div key={dayInfo.name} className={`day-column ${isToday ? 'today' : ''}`}>
                  <div className="day-header">
                    <div className="day-name">{dayInfo.shortName}</div>
                    <div className={`day-date ${isToday ? 'today-date' : ''}`}>{dayInfo.dateString}</div>
                  </div>
                  
                  {timeSlots.map(timeSlot => {
                    const slotId = `${dayInfo.name}-${timeSlot}`;
                    const isDropTarget = dragOverSlot === slotId;
                    return (
                      <div
                        key={slotId}
                        className={`time-slot ${isDropTarget ? 'drop-target' : ''}`}
                        onDragOver={handleDragOver}
                        onDragEnter={() => handleDragEnter(dayInfo.name, timeSlot)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, dayInfo.name, timeSlot)}
                      >
                        {isDropTarget && (
                          <div className="drop-indicator">
                            Drop here: {timeSlot}
                          </div>
                        )}
                        {schedule[dayInfo.name][timeSlot].map((job, index) => (
                      <div
                        key={`${job.id}-${index}`}
                        className={`scheduled-job ${getPriorityClass(job.priority)}`}
                        style={{ height: `${job.duration * 60}px` }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, job, dayInfo.name, timeSlot)}
                        onDragEnd={handleDragEnd}
                      >
                        <button 
                          className="remove-btn"
                          onClick={() => removeJob(dayInfo.name, timeSlot, job.id)}
                          title="Remove job"
                        >
                          ×
                        </button>
                        <div className="job-content">
                          <div className="job-title">{job.client}</div>
                          <div className="job-type">{job.type}</div>
                          <div className="job-duration">{job.duration} hrs</div>
                          <select
                            value={job.assignedTech || ''}
                            onChange={(e) => assignTechnician(dayInfo.name, timeSlot, job.id, parseInt(e.target.value))}
                            className="tech-select-inline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">Assign Tech</option>
                            {technicians.map(tech => (
                              <option key={tech.id} value={tech.id}>
                                {tech.name}
                              </option>
                            ))}
                          </select>
                          {job.assignedTech && (
                            <div className="assigned-tech-badge">
                              👤 {getTechName(job.assignedTech)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DispatchAndScheduling;
