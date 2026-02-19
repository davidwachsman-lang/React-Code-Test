import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../contexts/AuthContext';
import useDispatchSchedule, {
  UNASSIGNED, DAY_START,
  hourToLabel, formatDriveTime, getDriveTotal, getDriveLegs, escapeHtml,
} from '../hooks/useDispatchSchedule';
import useRouteOptimization from '../hooks/useRouteOptimization';
import dispatchTeamService from '../services/dispatchTeamService';
import { supabase } from '../services/supabaseClient';
import DispatchExcelUpload from '../components/dispatch/DispatchExcelUpload';
import DispatchHeader from '../components/dispatch/DispatchHeader';
import DispatchUnassignedPool from '../components/dispatch/DispatchUnassignedPool';
import DispatchTimeGrid from '../components/dispatch/DispatchTimeGrid';
import DispatchScheduleModal from '../components/dispatch/DispatchScheduleModal';
import DispatchMapView from '../components/dispatch/DispatchMapView';
import DispatchWeekView from '../components/dispatch/DispatchWeekView';
import DispatchMonthView from '../components/dispatch/DispatchMonthView';
import './Page.css';
import './DispatchAndScheduling.css';

function DispatchAndScheduling() {
  const { user } = useAuth();
  const userId = user?.id || null;

  // ─── Core schedule state (from hook) ──────────────────────────────────────
  const sched = useDispatchSchedule(userId);
  const {
    date, setDate, rangeMode, setRangeMode,
    lanes, setLanes, pmGroups, setPmGroups,
    schedule, setSchedule, driveTimeByCrew, setDriveTimeByCrew,
    scheduleColumns, pmHeaderGroups,
    weekDates, weekLabel, weekSnapshots,
    threeDayDates, threeDayLabel, threeDaySnapshots,
    monthDates, monthLabel, monthSnapshots,
    scheduleRef, lanesRef,
    goPrev, goNext, goToday,
    updateJob, addJob, removeJob, moveJobToUnassigned, copyJobToLane,
    totalHours, finalizeSchedule, pushUndo,
    saving, saveError, finalized, conflicts,
    undo, redo, canUndo, canRedo,
    formatDate, formatDayShort, formatMd,
  } = sched;

  // ─── Route optimization (from hook) ───────────────────────────────────────
  const opt = useRouteOptimization({
    schedule, setSchedule,
    lanes, setLanes,
    driveTimeByCrew, setDriveTimeByCrew,
    scheduleRef, lanesRef,
    pushUndo,
  });
  const {
    isLoaded,
    optimizing, setOptimizing,
    optimizeError, setOptimizeError,
    optimizeProgress, setOptimizeProgress,
    moveJobToLane,
    runFullOptimize,
    progressLabel, progressPercent,
  } = opt;

  // ─── Local UI state ───────────────────────────────────────────────────────
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [crewFilter, setCrewFilter] = useState('all'); // 'all' | 'pm' | 'crew'
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  useEffect(() => {
    if (rangeMode !== 'day' && viewMode === 'map') setViewMode('table');
  }, [rangeMode, viewMode]);

  // ─── Filtered columns based on crew filter toggle ──────────────────────────
  const filteredColumns = useMemo(() => {
    if (crewFilter === 'pm') return scheduleColumns.filter((c) => c.type === 'pm');
    if (crewFilter === 'crew') return scheduleColumns.filter((c) => c.type !== 'pm');
    return scheduleColumns;
  }, [scheduleColumns, crewFilter]);

  // ─── PDF generation (multi-page) ─────────────────────────────────────────

  const buildSchedulePdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 32;
    const lineH = 11;
    const blockGap = 10;

    const title = `Dispatch Schedule — ${formatDate(date)}`;
    const addHeader = () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(title, margin, 28);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, margin, 44);
      doc.setTextColor(0);
    };
    addHeader();

    const crews = [
      ...scheduleColumns.map((c) => ({ id: c.id, name: c.name, color: c.color })),
      { id: 'unassigned', name: 'Unassigned', color: UNASSIGNED.color },
    ];

    let y = 58;
    const maxTextWidth = pageWidth - margin * 2 - 14;
    const ellipsize = (s, maxLen = 70) => {
      const str = String(s || '').trim();
      if (!str) return '';
      return str.length <= maxLen ? str : str.slice(0, maxLen - 1).trimEnd() + '...';
    };

    const buildCrewLines = (crewId) => {
      const jobs = schedule[crewId] || [];
      const legs = getDriveLegs(driveTimeByCrew[crewId]);
      let cursor = DAY_START;
      let jobIdx = 0;
      const lines = [];
      jobs.forEach((job) => {
        const hours = Number(job.hours) || 0;
        const legSec = legs[jobIdx] || 0;
        cursor += legSec / 3600;
        const startHour = cursor;
        const endHour = cursor + hours;
        cursor = endHour;
        jobIdx++;
        const time = hours > 0 ? `${hourToLabel(startHour)}-${hourToLabel(endHour)}` : '-';
        const jobNum = job.jobNumber ? String(job.jobNumber).trim() : '-';
        const cust = job.customer ? String(job.customer).trim() : '';
        const type = job.jobType ? String(job.jobType).trim() : '';
        const addr = job.address ? ellipsize(job.address, 30) : '';
        const meta = [type, hours > 0 ? `${hours}h` : ''].filter(Boolean).join(' | ');
        lines.push(`${time}  ${jobNum}  ${ellipsize(cust, 28)}  ${addr}${meta ? `  (${meta})` : ''}`);
      });
      return lines;
    };

    for (const crew of crews) {
      const jobs = schedule[crew.id] || [];
      if (!jobs.length) continue;

      const isUnassigned = crew.id === 'unassigned';
      const header = `${crew.name} — Working: ${totalHours(crew.id).toFixed(1)}h${isUnassigned ? '' : ` | Drive: ${formatDriveTime(getDriveTotal(driveTimeByCrew[crew.id]))}`}`;
      const lines = buildCrewLines(crew.id);
      const wrapped = [];
      lines.forEach((ln) => {
        const parts = doc.splitTextToSize(ln, maxTextWidth);
        wrapped.push(...parts);
      });

      const blockHeight = (2 * lineH) + (wrapped.length * lineH) + blockGap;

      // Multi-page: add new page if this block won't fit
      if (y + blockHeight > pageHeight - margin) {
        doc.addPage();
        addHeader();
        y = 58;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(header, margin, y);
      y += lineH + 2;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      wrapped.forEach((t) => {
        if (y > pageHeight - margin) {
          doc.addPage();
          addHeader();
          y = 58;
        }
        doc.text(String(t), margin + 10, y);
        y += lineH;
      });
      y += blockGap;
    }

    const safeDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { doc, filename: `dispatch-schedule-${safeDate}.pdf`, title };
  };

  const exportPdf = () => {
    const { doc, filename } = buildSchedulePdf();
    doc.save(filename);
  };

  // ─── Email draft ──────────────────────────────────────────────────────────

  const openEmailDraft = () => {
    setEmailError('');
    setEmailSuccess('');
    try {
      const subject = `Dispatch Schedule — ${formatDate(date)}`;
      const lines = [subject, `Generated: ${new Date().toLocaleString('en-US')}`, ''];
      const allCrews = [
        ...scheduleColumns.map((c) => ({ id: c.id, name: c.name })),
        { id: 'unassigned', name: 'Unassigned' },
      ];

      allCrews.forEach((crew) => {
        const jobs = schedule[crew.id] || [];
        if (!jobs.length) return;
        const isUnassigned = crew.id === 'unassigned';
        const header = `${crew.name} — Working: ${totalHours(crew.id).toFixed(1)}h${isUnassigned ? '' : ` | Drive: ${formatDriveTime(getDriveTotal(driveTimeByCrew[crew.id]))}`}`;
        lines.push(header);
        const legs = getDriveLegs(driveTimeByCrew[crew.id]);
        let cursor = DAY_START;
        let jobIdx = 0;
        jobs.forEach((job) => {
          const hours = Number(job.hours) || 0;
          const legSec = legs[jobIdx] || 0;
          cursor += legSec / 3600;
          const startHour = cursor;
          cursor += hours;
          jobIdx++;
          const time = hours > 0 ? `${hourToLabel(startHour)}-${hourToLabel(cursor)}` : '-';
          lines.push(`- ${time}  ${job.jobNumber || '-'}  ${job.customer || ''}  (${job.jobType || '-'} ${hours}h)`);
        });
        lines.push('');
      });

      const bodyText = lines.join('\n');
      const MAX_BODY_CHARS = 3500;
      let clipped = bodyText;
      let note = '';
      if (bodyText.length > MAX_BODY_CHARS) {
        clipped = bodyText.slice(0, MAX_BODY_CHARS);
        note = '\n\n[Schedule truncated. Full schedule copied to clipboard.]';
        try { navigator?.clipboard?.writeText(bodyText); } catch (_) {}
      }
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(clipped + note)}`;
      setEmailSuccess('Email draft opened.');
    } catch (err) {
      setEmailError(err?.message || 'Failed to open email draft.');
    }
  };

  // ─── Excel upload handler ─────────────────────────────────────────────────

  const handleExcelApply = async (byCrew, newLanes, excelPmGroups) => {
    pushUndo();
    const lanesToUse = newLanes && Array.isArray(newLanes) && newLanes.length > 0 ? newLanes : lanes;
    const initialSchedule = {};
    Object.keys(byCrew || {}).forEach((id) => {
      initialSchedule[id] = (byCrew[id] || []).map((j) => ({
        id: j.id || crypto.randomUUID(),
        jobType: j.jobType || '',
        hours: j.hours ?? 0,
        jobNumber: j.jobNumber || '',
        customer: j.customer || '',
        address: j.address || '',
        latitude: j.latitude ?? null,
        longitude: j.longitude ?? null,
      }));
    });

    setLanes(lanesToUse);
    if (Array.isArray(excelPmGroups) && excelPmGroups.length > 0) {
      setPmGroups(excelPmGroups);
      // Save updated teams to DB
      dispatchTeamService.saveTeams(excelPmGroups).catch((err) =>
        console.warn('Failed to save teams to DB:', err.message)
      );
    }
    setShowExcelUpload(false);
    setViewMode('table');
    setOptimizeError('');
    setOptimizing(true);
    setOptimizeProgress(null);
    try {
      // Only optimize crew lanes — PM lanes stay empty for manual assignment
      const crewLanes = lanesToUse.filter((l) => l.type !== 'pm');
      const { newSchedule, newDriveTimes } = await runFullOptimize(initialSchedule, crewLanes, setOptimizeProgress);
      // Ensure PM lanes have empty arrays in the schedule
      lanesToUse.filter((l) => l.type === 'pm').forEach((l) => {
        if (!newSchedule[l.id]) newSchedule[l.id] = [];
      });
      setSchedule(newSchedule);
      setDriveTimeByCrew((prev) => ({ ...prev, ...newDriveTimes }));
    } catch (err) {
      setOptimizeError(err?.message || 'Optimization failed.');
      setSchedule(initialSchedule);
    } finally {
      setOptimizing(false);
      setOptimizeProgress(null);
    }
  };

  // ─── Export upcoming estimates/inspections PDF ──────────────────────────
  const [exportingUpcoming, setExportingUpcoming] = useState(false);

  const exportUpcomingPdf = async () => {
    setExportingUpcoming(true);
    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const end = new Date(today);
      end.setDate(end.getDate() + 30);
      const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

      // Query job_schedules for next 30 days where notes contain Estimate or Site Visit
      const { data, error } = await supabase
        .from('job_schedules')
        .select('*')
        .gte('scheduled_date', todayStr)
        .lte('scheduled_date', endStr)
        .in('status', ['scheduled', 'confirmed'])
        .order('technician_name', { ascending: true })
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      // Filter to only estimate/inspection entries
      const items = (data || []).filter((row) => {
        const n = (row.notes || '').toLowerCase();
        return n.startsWith('estimate') || n.startsWith('site visit') || n.startsWith('inspection');
      });

      if (items.length === 0) {
        alert('No estimates or inspections scheduled in the next 30 days.');
        return;
      }

      // Group by date, then by person, with entries sorted by customer
      const byDate = {};
      items.forEach((row) => {
        const dateKey = row.scheduled_date;
        const person = row.technician_name || 'Unassigned';
        if (!byDate[dateKey]) byDate[dateKey] = {};
        if (!byDate[dateKey][person]) byDate[dateKey][person] = [];

        // Parse notes: "Estimate — 24-1234 — Smith — extra notes"
        const parts = (row.notes || '').split(' — ');
        const itemType = parts[0] || '';
        const jobNum = parts[1] || '';
        const customerName = parts[2] || '';
        const extraNotes = parts.slice(3).join(' — ');

        byDate[dateKey][person].push({
          type: itemType,
          jobNumber: jobNum,
          customer: customerName,
          time: row.scheduled_time,
          duration: row.duration_minutes,
          notes: extraNotes,
        });
      });

      // Sort entries within each person by customer name
      Object.values(byDate).forEach((people) => {
        Object.values(people).forEach((entries) => {
          entries.sort((a, b) => (a.customer || '').localeCompare(b.customer || '', undefined, { sensitivity: 'base' }));
        });
      });

      // Build PDF
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 36;
      const lineH = 14;
      let y = margin + 4;

      const ensureSpace = (needed) => {
        if (y + needed > pageH - margin) {
          doc.addPage();
          y = margin + 10;
        }
      };

      const formatDateLabel = (dateStr) => {
        const [yr, mo, da] = dateStr.split('-');
        const d = new Date(Number(yr), Number(mo) - 1, Number(da));
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
      };

      const formatTime12 = (t) => {
        if (!t) return '';
        const [h, m] = t.split(':');
        const hr = parseInt(h, 10);
        const ampm = hr >= 12 ? 'PM' : 'AM';
        return ` at ${hr % 12 || 12}:${m} ${ampm}`;
      };

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Upcoming Estimates & Site Visits', margin, y);
      y += 16;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Next 30 days (${formatDateLabel(todayStr)} \u2013 ${formatDateLabel(endStr)})  \u00b7  Generated ${new Date().toLocaleString('en-US')}`, margin, y);
      doc.setTextColor(0);
      y += 22;

      const dateKeys = Object.keys(byDate).sort();

      dateKeys.forEach((dateStr) => {
        const people = byDate[dateStr];
        const personNames = Object.keys(people).sort((a, b) => a.localeCompare(b));

        // Date header
        ensureSpace(lineH * 3);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(30, 64, 175);
        doc.text(formatDateLabel(dateStr), margin, y);
        y += 4;
        doc.setDrawColor(30, 64, 175);
        doc.setLineWidth(0.75);
        doc.line(margin, y, pageW - margin, y);
        y += lineH + 2;
        doc.setTextColor(0);

        personNames.forEach((person) => {
          const entries = people[person];

          // Person subheader
          ensureSpace(lineH * 2);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(60);
          doc.text(person, margin + 12, y);
          doc.setTextColor(0);
          y += lineH;

          // Entries sorted by customer
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          entries.forEach((entry) => {
            ensureSpace(lineH);
            const timePart = formatTime12(entry.time);
            const line = `\u2022  ${entry.type}${timePart}${entry.customer ? '  \u2014  ' + entry.customer : ''}${entry.jobNumber ? '  (#' + entry.jobNumber + ')' : ''}`;
            doc.text(line, margin + 24, y);
            y += lineH;
          });
          y += 4;
        });
        y += 8;
      });

      doc.save('Upcoming_Estimates_Site_Visits.pdf');
    } catch (err) {
      console.error('Failed to export upcoming PDF:', err);
      alert('Failed to generate PDF: ' + (err?.message || 'Unknown error'));
    } finally {
      setExportingUpcoming(false);
    }
  };

  // ─── Schedule estimate/inspection directly onto dispatch ─────────────────
  const handleScheduleDirect = ({ laneId, job }) => {
    pushUndo();
    setSchedule((prev) => ({
      ...prev,
      [laneId]: [...(prev[laneId] || []), job],
    }));
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="dispatch-page">
      {/* Progress overlay */}
      {optimizing && (
        <div className="dispatch-progress-overlay">
          <div className="dispatch-progress-card">
            <h3>Optimizing Schedule</h3>
            <div className="dispatch-progress-step">{progressLabel(optimizeProgress)}</div>
            <div className="dispatch-progress-bar-wrap">
              <div className="dispatch-progress-bar" style={{ width: `${progressPercent(optimizeProgress)}%` }} />
            </div>
            <div className="dispatch-progress-count">
              {optimizeProgress?.step === 'geocoding' && optimizeProgress.total
                ? `${optimizeProgress.current} / ${optimizeProgress.total} addresses`
                : ''}
            </div>
          </div>
        </div>
      )}

      <DispatchHeader
        rangeMode={rangeMode} setRangeMode={setRangeMode}
        viewMode={viewMode} setViewMode={setViewMode}
        date={date} weekLabel={weekLabel} threeDayLabel={threeDayLabel} monthLabel={monthLabel}
        goPrev={goPrev} goNext={goNext} goToday={goToday} formatDate={formatDate}
        showExcelUpload={showExcelUpload} setShowExcelUpload={setShowExcelUpload}
        exportPdf={exportPdf} openEmailDraft={openEmailDraft}
        emailError={emailError} emailSuccess={emailSuccess}
        optimizeError={optimizeError}
        overflowCount={0}
        finalized={finalized} onFinalize={finalizeSchedule} saving={saving}
        canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo}
        conflicts={conflicts}
      />

      {showExcelUpload && (
        <DispatchExcelUpload onApply={handleExcelApply} onCancel={() => setShowExcelUpload(false)} />
      )}

      {rangeMode === 'week' && (
        <DispatchWeekView
          weekSnapshots={weekSnapshots} weekDates={weekDates}
          setDate={setDate} setRangeMode={setRangeMode} setViewMode={setViewMode}
          formatDayShort={formatDayShort} formatMd={formatMd}
        />
      )}

      {rangeMode === '3day' && (
        <DispatchWeekView
          weekSnapshots={threeDaySnapshots} weekDates={threeDayDates}
          setDate={setDate} setRangeMode={setRangeMode} setViewMode={setViewMode}
          formatDayShort={formatDayShort} formatMd={formatMd}
          columnCount={3}
        />
      )}

      {rangeMode === 'month' && (
        <DispatchMonthView
          monthSnapshots={monthSnapshots} monthDates={monthDates}
          currentDate={date}
          setDate={setDate} setRangeMode={setRangeMode} setViewMode={setViewMode}
        />
      )}

      {rangeMode === 'day' && viewMode === 'map' && (
        <DispatchMapView
          schedule={schedule} scheduleColumns={scheduleColumns}
          driveTimeByCrew={driveTimeByCrew} totalHours={totalHours}
          isLoaded={isLoaded}
        />
      )}

      {rangeMode === 'day' && viewMode === 'table' && (
        <div className="dispatch-table-view">
          <div className="dispatch-crew-filter">
            <span className="dispatch-crew-filter-label">View:</span>
            <div className="dispatch-crew-filter-toggle">
              <button className={crewFilter === 'all' ? 'active' : ''} onClick={() => setCrewFilter('all')}>All</button>
              <button className={crewFilter === 'pm' ? 'active' : ''} onClick={() => setCrewFilter('pm')}>PMs Only</button>
              <button className={crewFilter === 'crew' ? 'active' : ''} onClick={() => setCrewFilter('crew')}>Crew Chiefs Only</button>
            </div>
            <button className="dispatch-schedule-direct-btn" onClick={() => setShowScheduleModal(true)}>+ Schedule Estimate / Site Visit</button>
            <button className="dispatch-schedule-pdf-btn" onClick={exportUpcomingPdf} disabled={exportingUpcoming}>
              {exportingUpcoming ? 'Generating...' : 'Upcoming PDF'}
            </button>
          </div>
          {(schedule.unassigned || []).length > 0 && (
            <DispatchUnassignedPool
              schedule={schedule} addJob={addJob} removeJob={removeJob}
              moveJobToUnassigned={moveJobToUnassigned}
            />
          )}
          <DispatchTimeGrid
            schedule={schedule} scheduleColumns={filteredColumns} pmHeaderGroups={pmHeaderGroups}
            driveTimeByCrew={driveTimeByCrew}
            totalHours={totalHours}
            addJob={addJob} removeJob={removeJob} updateJob={updateJob}
            moveJobToUnassigned={moveJobToUnassigned} moveJobToLane={moveJobToLane} copyJobToLane={copyJobToLane}
          />
        </div>
      )}

      {saveError && <div className="dispatch-save-error">{saveError}</div>}

      {showScheduleModal && (
        <DispatchScheduleModal
          lanes={lanes}
          dispatchDate={date}
          onSchedule={handleScheduleDirect}
          onClose={() => setShowScheduleModal(false)}
        />
      )}
    </div>
  );
}

export default DispatchAndScheduling;
