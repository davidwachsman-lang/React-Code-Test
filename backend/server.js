const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const nodemailer = require('nodemailer');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

// Middleware
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'RestoreLogic.AI Backend API',
    version: '1.0.0',
    note: 'This application uses Supabase for all database operations. Frontend services connect directly to Supabase.',
    endpoints: {
      health: '/health',
      aiExtractChecklist: 'POST /api/ai/extract-checklist',
      emailDispatchSchedule: 'POST /api/dispatch/email-schedule',
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Dispatch — Email schedule PDF                                      */
/* ------------------------------------------------------------------ */

function getBool(val, fallback = false) {
  if (val == null) return fallback;
  const s = String(val).trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(s)) return true;
  if (['false', '0', 'no', 'n'].includes(s)) return false;
  return fallback;
}

function getSmtpConfigFromEnv() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  const secure = getBool(process.env.SMTP_SECURE, port === 465);

  if (!host || !user || !pass || !from) {
    return { ok: false, error: 'SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM (and optionally SMTP_SECURE).' };
  }
  return {
    ok: true,
    host,
    port,
    user,
    pass,
    from,
    secure,
  };
}

function buildTransporter() {
  const cfg = getSmtpConfigFromEnv();
  if (!cfg.ok) throw new Error(cfg.error);
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

app.post('/api/dispatch/email-schedule', async (req, res) => {
  const {
    to,
    subject,
    bodyText,
    bodyHtml,
    pdfBase64,
    filename,
  } = req.body || {};

  if (!to || typeof to !== 'string' || !to.trim()) {
    return res.status(400).json({ error: '`to` is required (comma-separated emails ok).' });
  }
  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    return res.status(400).json({ error: '`subject` is required.' });
  }
  if (!pdfBase64 || typeof pdfBase64 !== 'string' || !pdfBase64.trim()) {
    return res.status(400).json({ error: '`pdfBase64` is required.' });
  }

  let pdfBuf;
  try {
    pdfBuf = Buffer.from(pdfBase64, 'base64');
  } catch (_) {
    return res.status(400).json({ error: 'Invalid `pdfBase64` encoding.' });
  }
  if (!pdfBuf || pdfBuf.length < 50) {
    return res.status(400).json({ error: 'PDF attachment is empty or invalid.' });
  }

  try {
    const cfg = getSmtpConfigFromEnv();
    if (!cfg.ok) {
      return res.status(500).json({ error: cfg.error });
    }

    const transporter = buildTransporter();
    const info = await transporter.sendMail({
      from: cfg.from,
      to: to.trim(),
      subject: subject.trim(),
      text: typeof bodyText === 'string' && bodyText.trim() ? bodyText : undefined,
      html: typeof bodyHtml === 'string' && bodyHtml.trim() ? bodyHtml : undefined,
      attachments: [
        {
          filename: (typeof filename === 'string' && filename.trim()) ? filename.trim() : 'schedule.pdf',
          content: pdfBuf,
          contentType: 'application/pdf',
        },
      ],
    });

    return res.status(200).json({
      ok: true,
      messageId: info.messageId || null,
      accepted: info.accepted || [],
      rejected: info.rejected || [],
    });
  } catch (err) {
    console.error('Email schedule error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to send email.' });
  }
});

/* ------------------------------------------------------------------ */
/*  AI Checklist Extraction (OpenAI proxy)                             */
/* ------------------------------------------------------------------ */

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
  return new OpenAI.default ? new OpenAI.default({ apiKey }) : new OpenAI({ apiKey });
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

app.post('/api/ai/extract-checklist', async (req, res) => {
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
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Note: This app uses Supabase for database operations`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`AI endpoint: POST http://localhost:${PORT}/api/ai/extract-checklist`);
});

module.exports = app;
