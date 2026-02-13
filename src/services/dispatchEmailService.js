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

