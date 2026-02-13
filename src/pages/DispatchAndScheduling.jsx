import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../contexts/AuthContext';
import useDispatchSchedule, {
  UNASSIGNED, DAY_START,
  hourToLabel, formatDriveTime, getDriveTotal, getDriveLegs, escapeHtml,
} from '../hooks/useDispatchSchedule';
import useRouteOptimization from '../hooks/useRouteOptimization';
import dispatchTeamService from '../services/dispatchTeamService';
import DispatchExcelUpload from '../components/dispatch/DispatchExcelUpload';
import DispatchHeader from '../components/dispatch/DispatchHeader';
import DispatchUnassignedPool from '../components/dispatch/DispatchUnassignedPool';
import DispatchTimeGrid from '../components/dispatch/DispatchTimeGrid';
import DispatchMapView from '../components/dispatch/DispatchMapView';
import DispatchWeekView from '../components/dispatch/DispatchWeekView';
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
    scheduleRef, lanesRef,
    goPrev, goNext, goToday,
    updateJob, addJob, removeJob, moveJobToUnassigned,
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
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  useEffect(() => {
    if (rangeMode === 'week' && viewMode === 'map') setViewMode('table');
  }, [rangeMode, viewMode]);

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
      const { newSchedule, newDriveTimes } = await runFullOptimize(initialSchedule, lanesToUse, setOptimizeProgress);
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
        date={date} weekLabel={weekLabel}
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

      {rangeMode === 'day' && viewMode === 'map' && (
        <DispatchMapView
          schedule={schedule} scheduleColumns={scheduleColumns}
          driveTimeByCrew={driveTimeByCrew} totalHours={totalHours}
          isLoaded={isLoaded}
        />
      )}

      {rangeMode === 'day' && viewMode === 'table' && (
        <div className="dispatch-table-view">
          <DispatchUnassignedPool
            schedule={schedule} addJob={addJob} removeJob={removeJob}
            moveJobToUnassigned={moveJobToUnassigned}
          />
          <DispatchTimeGrid
            schedule={schedule} scheduleColumns={scheduleColumns} pmHeaderGroups={pmHeaderGroups}
            driveTimeByCrew={driveTimeByCrew}
            totalHours={totalHours}
            addJob={addJob} removeJob={removeJob} updateJob={updateJob}
            moveJobToUnassigned={moveJobToUnassigned} moveJobToLane={moveJobToLane}
          />
        </div>
      )}

      {saveError && <div className="dispatch-save-error">{saveError}</div>}
    </div>
  );
}

export default DispatchAndScheduling;
