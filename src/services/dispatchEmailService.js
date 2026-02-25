const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

export async function emailDispatchSchedule({
  to,
  subject,
  bodyText,
  bodyHtml,
  pdfBase64,
  filename,
}) {
  const resp = await fetch(`${API_BASE}/api/dispatch/email-schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to,
      subject,
      bodyText,
      bodyHtml,
      pdfBase64,
      filename,
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.json().catch(() => ({}));
    throw new Error(errBody.error || `Server error (${resp.status})`);
  }

  return resp.json();
}

/**
 * Send schedule notification emails to technicians after finalize.
 * @param {string} dateStr - The schedule date (YYYY-MM-DD)
 * @param {Array} jobScheduleRows - The finalized job_schedule rows
 * @param {Map} emailMap - crew_name → email address
 * @returns {{ sent: number, noEmail: number }}
 */
export async function notifyTechnicians(dateStr, jobScheduleRows, emailMap) {
  // Group rows by technician
  const byTech = {};
  jobScheduleRows.forEach((row) => {
    const name = row.technician_name;
    if (!byTech[name]) byTech[name] = [];
    byTech[name].push(row);
  });

  let sent = 0;
  let noEmail = 0;
  const errors = [];

  for (const [techName, jobs] of Object.entries(byTech)) {
    const email = emailMap.get(techName);
    if (!email) { noEmail++; continue; }

    // Build HTML body
    const rows = jobs.map((j) => {
      const time = j.scheduled_time ? j.scheduled_time.substring(0, 5) : '--';
      const dur = j.duration_minutes ? `${j.duration_minutes}m` : '';
      return `<tr><td style="padding:4px 8px">${time}</td><td style="padding:4px 8px">${j.notes || ''}</td><td style="padding:4px 8px">${dur}</td></tr>`;
    }).join('');

    const bodyHtml = `
      <h2>Your Schedule for ${dateStr}</h2>
      <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
        <tr style="background:#f1f5f9"><th style="padding:6px 8px">Time</th><th style="padding:6px 8px">Job</th><th style="padding:6px 8px">Duration</th></tr>
        ${rows}
      </table>
      <p style="color:#64748b;font-size:12px;margin-top:16px">This is an automated schedule notification from RestoreLogic AI.</p>
    `;

    const bodyText = jobs.map((j) => {
      const time = j.scheduled_time ? j.scheduled_time.substring(0, 5) : '--';
      return `${time} - ${j.notes || 'Job'} (${j.duration_minutes || 0}m)`;
    }).join('\n');

    try {
      await emailDispatchSchedule({
        to: email,
        subject: `Your Schedule for ${dateStr}`,
        bodyText,
        bodyHtml,
      });
      sent++;
    } catch (err) {
      errors.push(`${techName}: ${err.message}`);
    }
  }

  return { sent, noEmail, errors };
}

