import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import insuranceSlaService from '../../services/insuranceSlaService';
import { generateChecklistFromText, extractCarrierAndChecklist } from '../../services/aiChecklistService';
import './InsuranceSLAs.css';

/* ------------------------------------------------------------------ */
/*  PDF text extraction (pdfjs-dist)                                  */
/* ------------------------------------------------------------------ */
let pdfjsLib = null;

async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).toString();
  return pdfjsLib;
}

async function extractTextFromPdf(file) {
  const lib = await loadPdfJs();
  let arrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch {
    throw new Error(`Could not read file "${file.name}".`);
  }
  let pdf;
  try {
    pdf = await lib.getDocument({ data: arrayBuffer }).promise;
  } catch (err) {
    throw new Error(`Could not open PDF "${file.name}": ${err.message || 'unknown error'}`);
  }
  const lines = [];
  const numPages = pdf.numPages || 0;
  for (let i = 1; i <= numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      let pageLine = '';
      let lastY = null;
      for (const item of content.items) {
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 2) {
          if (pageLine.trim()) lines.push(pageLine.trim());
          pageLine = '';
        }
        pageLine += item.str;
        lastY = item.transform[5];
      }
      if (pageLine.trim()) lines.push(pageLine.trim());
    } catch (pageErr) {
      // Skip pages that can't be read (encrypted, corrupted, image-only, etc.)
      console.warn(`Skipping page ${i} of "${file.name}":`, pageErr.message);
    }
  }
  return lines.filter((l) => l.length > 0);
}

/* ================================================================== */
/*  Main component                                                    */
/* ================================================================== */

export default function InsuranceSLAs() {
  // All documents (flat table data)
  const [allDocs, setAllDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Upload flow states: idle -> processing -> confirm -> saving
  const [uploadStep, setUploadStep] = useState('idle'); // idle | processing | confirm | saving
  const [uploadError, setUploadError] = useState(null);
  // Each pending upload: { file, detectedName, checklist, processing, error }
  const [pendingUploads, setPendingUploads] = useState([]);
  const fileInputRef = useRef(null);

  // Checklist modal state
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistCarrierId, setChecklistCarrierId] = useState(null);
  const [checklistCarrierName, setChecklistCarrierName] = useState('');
  const [checklistItems, setChecklistItems] = useState([]);
  const [checklistLoading, setChecklistLoading] = useState(false);

  // Inline add item (inside checklist modal)
  const [addingItem, setAddingItem] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [newItemSection, setNewItemSection] = useState('');

  // AI checklist review modal
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewItems, setReviewItems] = useState([]);
  const [reviewCarrierId, setReviewCarrierId] = useState(null);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Track which carrier IDs are currently generating checklists
  const [generatingSet, setGeneratingSet] = useState(new Set());

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                   */
  /* ---------------------------------------------------------------- */

  const fetchAllDocs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await insuranceSlaService.getAllDocumentsWithCarrier();
      setAllDocs(data ?? []);
    } catch (err) {
      setError(err?.message ?? 'Failed to load SLAs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllDocs(); }, [fetchAllDocs]);

  /* ---------------------------------------------------------------- */
  /*  Upload flow (multi-file)                                        */
  /* ---------------------------------------------------------------- */

  /** Step 1: User picks file(s) -> extract + AI for each */
  const handleFilesPicked = async (e) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    e.target.value = ''; // reset so same files can be re-selected

    setUploadStep('processing');
    setUploadError(null);

    // Create a pending entry for each file
    const entries = files.map((file) => ({
      file,
      detectedName: '',
      detectedDate: '',
      checklist: [],
      processing: true,
      error: null,
    }));
    setPendingUploads(entries);

    // Process each file in parallel
    const results = await Promise.allSettled(
      files.map(async (file) => {
        const lines = await extractTextFromPdf(file);
        const fullText = lines.join('\n');
        if (!fullText.trim()) throw new Error('No readable text found — PDF may be scanned/image-only.');
        return await extractCarrierAndChecklist(fullText);
      })
    );

    // Update each entry with AI results
    setPendingUploads((prev) =>
      prev.map((entry, i) => {
        const result = results[i];
        if (result.status === 'fulfilled') {
          return {
            ...entry,
            detectedName: result.value.carrier_name,
            detectedDate: result.value.publish_date || '',
            checklist: result.value.checklist,
            processing: false,
          };
        }
        return {
          ...entry,
          detectedName: '',
          error: result.reason?.message ?? 'Failed to process',
          processing: false,
        };
      })
    );

    setUploadStep('confirm');
  };

  /** Update the carrier name for a specific pending upload */
  const updatePendingName = (idx, name) => {
    setPendingUploads((prev) =>
      prev.map((entry, i) => (i === idx ? { ...entry, detectedName: name } : entry))
    );
  };

  /** Remove a pending upload from the list */
  const removePending = (idx) => {
    setPendingUploads((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) resetUpload();
      return next;
    });
  };

  /** Step 2: Confirm & save all pending uploads */
  const handleConfirmAll = async () => {
    const valid = pendingUploads.filter((u) => !u.error && u.detectedName.trim());
    if (valid.length === 0) { setUploadError('No valid uploads to save.'); return; }

    setUploadStep('saving');
    setUploadError(null);

    try {
      for (const entry of valid) {
        const carrier = await insuranceSlaService.findOrCreateCarrier(entry.detectedName.trim());
        await insuranceSlaService.uploadDocument(carrier.id, entry.file, {
          publish_date: entry.detectedDate || null,
        });

        if (entry.checklist.length > 0) {
          const existing = await insuranceSlaService.getChecklistItems(carrier.id);
          const maxSort = (existing ?? []).length > 0
            ? Math.max(...existing.map((it) => it.sort_order ?? 0))
            : -1;
          const rows = entry.checklist.map((item, i) => ({
            text: item.text,
            section: item.section || null,
            sort_order: maxSort + 1 + i,
          }));
          await insuranceSlaService.addChecklistItems(carrier.id, rows);
        }
      }

      resetUpload();
      await fetchAllDocs();
    } catch (err) {
      setUploadError(err?.message ?? 'Upload failed');
      setUploadStep('confirm');
    }
  };

  const resetUpload = () => {
    setUploadStep('idle');
    setPendingUploads([]);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ---------------------------------------------------------------- */
  /*  AI checklist generation (background)                            */
  /* ---------------------------------------------------------------- */

  const runAiChecklistBackground = async (carrierId, files) => {
    setGeneratingSet((prev) => new Set(prev).add(carrierId));
    try {
      const allLines = [];
      for (const file of files) {
        const lines = await extractTextFromPdf(file);
        allLines.push(...lines);
      }
      const fullText = allLines.join('\n');
      if (!fullText.trim()) return;

      const items = await generateChecklistFromText(fullText);
      if (items.length > 0) {
        const existing = await insuranceSlaService.getChecklistItems(carrierId);
        const maxSort = (existing ?? []).length > 0
          ? Math.max(...existing.map((it) => it.sort_order ?? 0))
          : -1;
        const rows = items.map((item, i) => ({
          text: item.text,
          section: item.section || null,
          sort_order: maxSort + 1 + i,
        }));
        await insuranceSlaService.addChecklistItems(carrierId, rows);
      }
    } catch (err) {
      console.error('AI checklist generation failed:', err);
    } finally {
      setGeneratingSet((prev) => {
        const next = new Set(prev);
        next.delete(carrierId);
        return next;
      });
    }
  };

  /* ---------------------------------------------------------------- */
  /*  AI review modal (from re-extract)                               */
  /* ---------------------------------------------------------------- */

  const handleReExtract = async (doc) => {
    if (!doc.file_url) { alert('No file URL available for this document.'); return; }
    setReviewCarrierId(doc.carrier_id);
    setAiProcessing(true);
    setAiError(null);
    setReviewItems([]);
    setReviewOpen(true);
    try {
      const response = await fetch(doc.file_url);
      if (!response.ok) throw new Error('Failed to fetch PDF');
      const blob = await response.blob();
      const file = new File([blob], doc.file_name, { type: 'application/pdf' });
      const lines = await extractTextFromPdf(file);
      const fullText = lines.join('\n');
      const items = await generateChecklistFromText(fullText);
      setReviewItems(items);
    } catch (err) {
      setAiError(err?.message ?? 'Failed to generate checklist from PDF');
    } finally {
      setAiProcessing(false);
    }
  };

  const removeReviewItem = (idx) => {
    setReviewItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleReviewSave = async () => {
    if (reviewItems.length === 0 || !reviewCarrierId) return;
    try {
      const existing = await insuranceSlaService.getChecklistItems(reviewCarrierId);
      const maxSort = (existing ?? []).length > 0
        ? Math.max(...existing.map((it) => it.sort_order ?? 0))
        : -1;
      const items = reviewItems.map((item, i) => ({
        text: item.text,
        section: item.section || null,
        sort_order: maxSort + 1 + i,
      }));
      await insuranceSlaService.addChecklistItems(reviewCarrierId, items);
      // If the checklist modal is open for this carrier, refresh it
      if (checklistOpen && checklistCarrierId === reviewCarrierId) {
        const refreshed = await insuranceSlaService.getChecklistItems(reviewCarrierId);
        setChecklistItems(refreshed ?? []);
      }
      setReviewOpen(false);
    } catch (err) {
      alert(err?.message ?? 'Failed to save checklist items');
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Checklist modal                                                 */
  /* ---------------------------------------------------------------- */

  const openChecklist = async (doc) => {
    setChecklistCarrierId(doc.carrier_id);
    setChecklistCarrierName(doc.carrier_name);
    setChecklistOpen(true);
    setChecklistLoading(true);
    setChecklistItems([]);
    setAddingItem(false);
    try {
      const items = await insuranceSlaService.getChecklistItems(doc.carrier_id);
      setChecklistItems(items ?? []);
    } catch (err) {
      console.error('Failed to load checklist', err);
    } finally {
      setChecklistLoading(false);
    }
  };

  const closeChecklist = () => {
    setChecklistOpen(false);
    setChecklistCarrierId(null);
    setChecklistCarrierName('');
    setChecklistItems([]);
    setAddingItem(false);
    setNewItemText('');
    setNewItemSection('');
  };

  const handleAddItem = async () => {
    if (!newItemText.trim() || !checklistCarrierId) return;
    const maxSort = checklistItems.length > 0
      ? Math.max(...checklistItems.map((it) => it.sort_order ?? 0))
      : -1;
    try {
      await insuranceSlaService.addChecklistItems(checklistCarrierId, [{
        text: newItemText.trim(),
        section: newItemSection.trim() || null,
        sort_order: maxSort + 1,
      }]);
      const refreshed = await insuranceSlaService.getChecklistItems(checklistCarrierId);
      setChecklistItems(refreshed ?? []);
      setNewItemText('');
      setNewItemSection('');
      setAddingItem(false);
    } catch (err) {
      alert(err?.message ?? 'Failed to add item');
    }
  };

  const handleDeleteChecklistItem = async (item) => {
    try {
      await insuranceSlaService.deleteChecklistItem(item.id);
      setChecklistItems((prev) => prev.filter((it) => it.id !== item.id));
    } catch (err) {
      alert(err?.message ?? 'Failed to delete item');
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Grouped checklist items                                         */
  /* ---------------------------------------------------------------- */

  const groupedChecklist = useMemo(() => {
    const groups = [];
    const map = {};
    for (const item of checklistItems) {
      const key = item.section || '__none__';
      if (!map[key]) {
        map[key] = { section: item.section, items: [] };
        groups.push(map[key]);
      }
      map[key].items.push(item);
    }
    return groups;
  }, [checklistItems]);

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  return (
    <div className="sla-container">
      {/* Header */}
      <div className="sla-page-header">
        <h2 className="sla-page-title">Insurance SLAs</h2>
        {uploadStep === 'idle' && (
          <button
            type="button"
            className="sla-add-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload New SLA
          </button>
        )}
        {uploadStep !== 'idle' && (
          <button type="button" className="sla-btn-secondary sla-btn-sm" onClick={resetUpload}>
            Cancel
          </button>
        )}
        {/* Hidden file input (multi-file) */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          style={{ display: 'none' }}
          onChange={handleFilesPicked}
        />
      </div>

      {/* Upload processing step */}
      {uploadStep === 'processing' && (
        <div className="sla-upload-status">
          <div className="sla-ai-spinner" />
          <span>
            Analyzing {pendingUploads.length} PDF{pendingUploads.length !== 1 ? 's' : ''}&hellip; detecting carriers and building checklists.
          </span>
        </div>
      )}

      {/* Confirm step — one row per file */}
      {uploadStep === 'confirm' && (
        <div className="sla-upload-confirm">
          {uploadError && <div className="sla-form-error">{uploadError}</div>}

          <div className="sla-pending-list">
            {pendingUploads.map((entry, idx) => (
              <div key={idx} className={`sla-pending-item${entry.error ? ' sla-pending-item-error' : ''}`}>
                <div className="sla-pending-file-name">{entry.file.name}</div>
                {entry.error ? (
                  <div className="sla-pending-error">{entry.error}</div>
                ) : (
                  <>
                    <div className="sla-confirm-row">
                      <label className="sla-confirm-label">Carrier:</label>
                      <input
                        type="text"
                        className="sla-confirm-input"
                        value={entry.detectedName}
                        onChange={(e) => updatePendingName(idx, e.target.value)}
                      />
                    </div>
                    <div className="sla-confirm-meta">
                      {entry.detectedDate && (
                        <>
                          <span>Published: {new Date(entry.detectedDate + 'T00:00:00').toLocaleDateString()}</span>
                          <span>&middot;</span>
                        </>
                      )}
                      <span>{entry.checklist.length} checklist item{entry.checklist.length !== 1 ? 's' : ''} generated</span>
                    </div>
                  </>
                )}
                <button
                  type="button"
                  className="sla-pending-remove"
                  title="Remove"
                  onClick={() => removePending(idx)}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>

          <div className="sla-confirm-actions">
            <button type="button" className="sla-btn-secondary sla-btn-sm" onClick={resetUpload}>Cancel All</button>
            <button
              type="button"
              className="sla-btn-primary"
              onClick={handleConfirmAll}
              disabled={!pendingUploads.some((u) => !u.error && u.detectedName.trim())}
            >
              Confirm &amp; Save {pendingUploads.filter((u) => !u.error && u.detectedName.trim()).length} SLA{pendingUploads.filter((u) => !u.error && u.detectedName.trim()).length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {uploadStep === 'saving' && (
        <div className="sla-upload-status">
          <div className="sla-ai-spinner" />
          <span>Saving {pendingUploads.filter((u) => !u.error).length} SLA{pendingUploads.filter((u) => !u.error).length !== 1 ? 's' : ''} to Supabase&hellip;</span>
        </div>
      )}

      {uploadStep === 'idle' && uploadError && (
        <div className="sla-form-error" style={{ marginBottom: '1rem' }}>{uploadError}</div>
      )}

      {/* Loading / Error / Empty */}
      {loading && <div className="sla-loading">Loading SLAs...</div>}
      {error && (
        <div className="sla-error">
          <p>{error}</p>
          <button type="button" onClick={fetchAllDocs}>Retry</button>
        </div>
      )}

      {!loading && !error && allDocs.length === 0 && (
        <div className="sla-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <h3>No SLAs yet</h3>
          <p>Click &ldquo;Upload New SLA&rdquo; to add your first insurance SLA document.</p>
        </div>
      )}

      {/* Main table */}
      {!loading && !error && allDocs.length > 0 && (
        <div className="sla-table-wrap">
          <table className="sla-table">
            <thead>
              <tr>
                <th>Insurance Carrier</th>
                <th>File</th>
                <th>SLA Publish Date</th>
                <th>Date Uploaded</th>
                <th>Checklist</th>
                <th style={{ width: '1%' }}></th>
              </tr>
            </thead>
            <tbody>
              {allDocs.map((doc) => (
                <tr key={doc.id}>
                  <td className="sla-table-carrier">{doc.carrier_name}</td>
                  <td>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sla-table-file-link"
                      title={`View ${doc.file_name}`}
                    >
                      {/* PDF icon */}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </a>
                  </td>
                  <td className="sla-table-date">
                    {doc.publish_date ? new Date(doc.publish_date + 'T00:00:00').toLocaleDateString() : '—'}
                  </td>
                  <td className="sla-table-date">
                    {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    {generatingSet.has(doc.carrier_id) ? (
                      <span className="sla-table-generating" title="Generating checklist...">
                        <span className="sla-mini-spinner" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="sla-table-checklist-btn"
                        title="View checklist"
                        onClick={() => openChecklist(doc)}
                      >
                        {/* Checklist icon */}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                          <path d="M9 11l3 3L22 4" />
                          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                        </svg>
                      </button>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="sla-icon-btn sla-icon-btn-danger sla-icon-btn-sm"
                      title="Delete document"
                      onClick={async () => {
                        if (!window.confirm(`Delete "${doc.file_name}"?`)) return;
                        try {
                          await insuranceSlaService.deleteDocument(doc.id, doc.file_path);
                          setAllDocs((prev) => prev.filter((d) => d.id !== doc.id));
                        } catch (err) {
                          alert(err?.message ?? 'Failed to delete document');
                        }
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Checklist modal */}
      {checklistOpen && (
        <div className="sla-modal-backdrop" onClick={closeChecklist}>
          <div className="sla-modal sla-modal-lg" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="sla-modal-header">
              <h2>Checklist &mdash; {checklistCarrierName}</h2>
              <button type="button" className="sla-modal-close" onClick={closeChecklist}>&times;</button>
            </div>

            <div className="sla-checklist-modal-body">
              {checklistLoading && <div className="sla-loading">Loading checklist...</div>}

              {!checklistLoading && checklistItems.length === 0 && !addingItem && (
                <p className="sla-panel-empty">
                  No checklist items yet. Click &ldquo;+ Add Item&rdquo; or re-extract a PDF to generate one.
                </p>
              )}

              {/* Grouped items */}
              {groupedChecklist.map((group, gi) => (
                <div key={gi} className="sla-checklist-group">
                  {group.section && (
                    <div className="sla-checklist-section-title">{group.section}</div>
                  )}
                  <ul className="sla-checklist-list">
                    {group.items.map((item) => (
                      <li key={item.id} className="sla-checklist-item">
                        <span className="sla-check-square" />
                        <span className="sla-checklist-text">{item.text}</span>
                        <button
                          type="button"
                          className="sla-icon-btn sla-icon-btn-danger sla-icon-btn-sm sla-checklist-delete"
                          title="Remove item"
                          onClick={() => handleDeleteChecklistItem(item)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* Inline add item form */}
              {addingItem && (
                <div className="sla-inline-add">
                  <input
                    type="text"
                    placeholder="Section (optional)"
                    value={newItemSection}
                    onChange={(e) => setNewItemSection(e.target.value)}
                    className="sla-inline-input sla-inline-section"
                  />
                  <input
                    type="text"
                    placeholder="Checklist item text *"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    className="sla-inline-input"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                  />
                  <div className="sla-inline-actions">
                    <button type="button" className="sla-btn-secondary sla-btn-sm" onClick={() => { setAddingItem(false); setNewItemText(''); setNewItemSection(''); }}>
                      Cancel
                    </button>
                    <button type="button" className="sla-btn-primary sla-btn-sm" onClick={handleAddItem} disabled={!newItemText.trim()}>
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="sla-modal-footer">
              <button
                type="button"
                className="sla-btn-primary sla-btn-sm"
                onClick={() => setAddingItem(true)}
              >
                + Add Item
              </button>
              <button type="button" className="sla-btn-secondary" onClick={closeChecklist}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* AI checklist review modal */}
      {reviewOpen && (
        <div className="sla-modal-backdrop" onClick={() => !aiProcessing && setReviewOpen(false)}>
          <div className="sla-modal sla-modal-lg" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="sla-modal-header">
              <h2>AI-Generated Checklist</h2>
              {!aiProcessing && (
                <button type="button" className="sla-modal-close" onClick={() => setReviewOpen(false)}>&times;</button>
              )}
            </div>

            <div className="sla-review-body">
              {aiProcessing ? (
                <div className="sla-ai-loading">
                  <div className="sla-ai-spinner" />
                  <p>Generating checklist&hellip;</p>
                  <p className="sla-ai-loading-sub">Extracting text and analyzing with AI. This may take a moment.</p>
                </div>
              ) : aiError ? (
                <div className="sla-ai-error">
                  <p>{aiError}</p>
                  <button type="button" className="sla-btn-secondary" onClick={() => setReviewOpen(false)}>Close</button>
                </div>
              ) : reviewItems.length === 0 ? (
                <p className="sla-panel-empty">No checklist items were generated. Try re-extracting the PDF.</p>
              ) : (
                <>
                  <p className="sla-review-info">
                    Review the {reviewItems.length} items below. Remove any you don&rsquo;t need, then save.
                  </p>
                  <div className="sla-review-list">
                    {reviewItems.map((item, idx) => (
                      <div key={idx} className="sla-review-item">
                        <div className="sla-review-item-content">
                          {item.section && <span className="sla-review-section-tag">{item.section}</span>}
                          <span className="sla-review-item-text">{item.text}</span>
                        </div>
                        <button
                          type="button"
                          className="sla-icon-btn sla-icon-btn-danger sla-icon-btn-sm"
                          title="Remove item"
                          onClick={() => removeReviewItem(idx)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {!aiProcessing && !aiError && reviewItems.length > 0 && (
              <div className="sla-modal-footer">
                <button type="button" className="sla-btn-secondary" onClick={() => setReviewOpen(false)}>Cancel</button>
                <button
                  type="button"
                  className="sla-btn-primary"
                  onClick={handleReviewSave}
                >
                  Save {reviewItems.length} Item{reviewItems.length !== 1 ? 's' : ''} to Checklist
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
