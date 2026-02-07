// AI Checklist Service — sends extracted PDF text to OpenAI GPT-4o
// and returns a structured checklist array.
import OpenAI from 'openai';

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY;

let client = null;
function getClient() {
  if (!client) {
    if (!OPENAI_KEY) throw new Error('VITE_OPENAI_API_KEY is not set in your environment variables.');
    client = new OpenAI({ apiKey: OPENAI_KEY, dangerouslyAllowBrowser: true });
  }
  return client;
}

const CHECKLIST_ONLY_PROMPT = `You are an expert at reading insurance SLA (Service Level Agreement) documents for restoration and mitigation companies.

Given the raw text extracted from an insurance carrier's SLA PDF, produce a concise, actionable checklist of every requirement, deadline, obligation, and best practice.

Rules:
- Group items into logical sections (e.g. "Initial Response", "Day 1", "Day 3", "During Job — Daily", "Documentation", "Equipment", "Final Steps", "Critical Don'ts").
- Each item should be a short, clear, imperative sentence (e.g. "Contact customer within 60 minutes of assignment").
- Remove duplicate or redundant items.
- Omit legal boilerplate, headers/footers, page numbers, and marketing language.
- If the document references specific hour/day deadlines, include those numbers.

Return ONLY valid JSON — an array of objects:
[
  { "section": "Section Name", "text": "Checklist item text" },
  ...
]

No markdown, no code fences, no explanation — just the JSON array.`;

const FULL_EXTRACT_PROMPT = `You are an expert at reading insurance SLA (Service Level Agreement) documents for restoration and mitigation companies.

Given the raw text extracted from an insurance carrier's SLA PDF, do THREE things:

1. **Identify the insurance carrier name** — find the name of the insurance company or carrier this SLA belongs to. Look for company names, logos, headers, or "Program" titles. Return a clean, short carrier name (e.g. "State Farm", "Farmers Insurance", "USAA").

2. **Find the SLA publish/effective date** — look for a date near the top of the document such as "Effective Date", "Revised", "Published", "Updated", or any prominent date. Return it in YYYY-MM-DD format. If no date is found, return null.

3. **Produce a checklist** — extract every actionable requirement, deadline, obligation, and best practice into a concise checklist.

Checklist rules:
- Group items into logical sections (e.g. "Initial Response", "Day 1", "Day 3", "During Job — Daily", "Documentation", "Equipment", "Final Steps", "Critical Don'ts").
- Each item should be a short, clear, imperative sentence (e.g. "Contact customer within 60 minutes of assignment").
- Remove duplicate or redundant items.
- Omit legal boilerplate, headers/footers, page numbers, and marketing language.
- If the document references specific hour/day deadlines, include those numbers.

Return ONLY valid JSON in this exact format:
{
  "carrier_name": "Carrier Name Here",
  "publish_date": "YYYY-MM-DD or null",
  "checklist": [
    { "section": "Section Name", "text": "Checklist item text" },
    ...
  ]
}

No markdown, no code fences, no explanation — just the JSON object.`;

/** Helper: call OpenAI and parse the JSON response */
async function callOpenAI(systemPrompt, pdfText) {
  if (!pdfText || !pdfText.trim()) {
    throw new Error('No text provided to generate checklist from.');
  }
  const openai = getClient();
  const truncated = pdfText.length > 100000 ? pdfText.slice(0, 100000) + '\n\n[...document truncated...]' : pdfText;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.3,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: truncated },
    ],
  });

  const content = response.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('OpenAI returned an empty response.');

  let json = content;
  if (json.startsWith('```')) {
    json = json.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  try {
    return JSON.parse(json);
  } catch {
    throw new Error('Failed to parse AI response as JSON. Raw response:\n' + content.slice(0, 500));
  }
}

/** Normalize a checklist items array */
function normalizeChecklist(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item.text === 'string' && item.text.trim())
    .map((item) => ({
      section: (item.section || '').trim() || null,
      text: item.text.trim(),
    }));
}

/**
 * Send extracted PDF text to OpenAI and get back a structured checklist.
 * @param {string} pdfText — raw text extracted from one or more PDFs
 * @returns {Promise<Array<{ section: string, text: string }>>}
 */
export async function generateChecklistFromText(pdfText) {
  const items = await callOpenAI(CHECKLIST_ONLY_PROMPT, pdfText);
  if (!Array.isArray(items)) throw new Error('AI response is not an array.');
  return normalizeChecklist(items);
}

/**
 * Send extracted PDF text to OpenAI and get back BOTH the detected carrier name
 * and a structured checklist — in a single API call.
 * @param {string} pdfText — raw text extracted from one or more PDFs
 * @returns {Promise<{ carrier_name: string, checklist: Array<{ section: string, text: string }> }>}
 */
export async function extractCarrierAndChecklist(pdfText) {
  const result = await callOpenAI(FULL_EXTRACT_PROMPT, pdfText);

  const carrierName = (result?.carrier_name || '').trim() || 'Unknown Carrier';
  const publishDate = (result?.publish_date || '').trim() || null;
  const checklist = normalizeChecklist(result?.checklist ?? []);

  return { carrier_name: carrierName, publish_date: publishDate, checklist };
}
