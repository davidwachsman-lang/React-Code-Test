import OpenAI from 'openai';

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

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY environment variable is not set');
  return new OpenAI({ apiKey });
}

function parseAIResponse(content) {
  let json = content.trim();
  if (json.startsWith('```')) {
    json = json.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(json);
}

function normalizeChecklist(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item.text === 'string' && item.text.trim())
    .map((item) => ({
      section: (item.section || '').trim() || null,
      text: item.text.trim(),
    }));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pdfText, mode } = req.body || {};

  if (!pdfText || typeof pdfText !== 'string' || !pdfText.trim()) {
    return res.status(400).json({ error: 'pdfText is required' });
  }

  const systemPrompt = mode === 'checklist_only' ? CHECKLIST_ONLY_PROMPT : FULL_EXTRACT_PROMPT;
  const truncated = pdfText.length > 100000
    ? pdfText.slice(0, 100000) + '\n\n[...document truncated...]'
    : pdfText;

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: truncated },
      ],
    });

    const content = response.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return res.status(502).json({ error: 'OpenAI returned an empty response' });
    }

    const parsed = parseAIResponse(content);

    if (mode === 'checklist_only') {
      if (!Array.isArray(parsed)) {
        return res.status(502).json({ error: 'AI response is not an array' });
      }
      return res.status(200).json({ checklist: normalizeChecklist(parsed) });
    }

    // Full extract mode
    const carrierName = (parsed?.carrier_name || '').trim() || 'Unknown Carrier';
    const publishDate = (parsed?.publish_date || '').trim() || null;
    const checklist = normalizeChecklist(parsed?.checklist ?? []);

    return res.status(200).json({
      carrier_name: carrierName,
      publish_date: publishDate,
      checklist,
      truncated: pdfText.length > 100000,
    });
  } catch (err) {
    console.error('AI extract-checklist error:', err);
    return res.status(500).json({ error: 'Failed to process PDF text' });
  }
}
