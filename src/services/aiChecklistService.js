// AI Checklist Service — calls the server-side API proxy to process PDF text
// via OpenAI GPT-4o and returns structured checklist data.
// The API key is stored server-side only (never exposed to the browser).

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

/**
 * Send extracted PDF text to the backend and get back BOTH the detected carrier name
 * and a structured checklist — via a single OpenAI call on the server.
 * @param {string} pdfText — raw text extracted from one or more PDFs
 * @returns {Promise<{ carrier_name: string, publish_date: string|null, checklist: Array<{ section: string, text: string }> }>}
 */
export async function extractCarrierAndChecklist(pdfText) {
  if (!pdfText || !pdfText.trim()) {
    throw new Error('No text provided to generate checklist from.');
  }

  const response = await fetch(`${API_BASE}/api/ai/extract-checklist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfText, mode: 'full_extract' }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `Server error (${response.status})`);
  }

  return response.json();
}

/**
 * Send extracted PDF text to the backend and get back a structured checklist.
 * @param {string} pdfText — raw text extracted from one or more PDFs
 * @returns {Promise<Array<{ section: string, text: string }>>}
 */
export async function generateChecklistFromText(pdfText) {
  if (!pdfText || !pdfText.trim()) {
    throw new Error('No text provided to generate checklist from.');
  }

  const response = await fetch(`${API_BASE}/api/ai/extract-checklist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfText, mode: 'checklist_only' }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `Server error (${response.status})`);
  }

  const data = await response.json();
  return data.checklist;
}
