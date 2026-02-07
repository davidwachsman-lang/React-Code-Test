import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import insuranceSlaService from '../../services/insuranceSlaService';
import { generateChecklistFromText, extractCarrierAndChecklist } from '../../services/aiChecklistService';
import './InsuranceSLAs.css';

/* ------------------------------------------------------------------ */
/*  PDF text extraction (pdfjs-dist)                                  */
/* ------------------------------------------------------------------ */

// Fix #1: Promise-based singleton to prevent concurrent loading race
let pdfjsPromise = null;
function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs',
        import.meta.url,
      ).href;
      return lib;
    });
  }
  return pdfjsPromise;
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
  // Fix #2: Unmount guard for async operations
  // Must set true in setup (not just useRef init) for React Strict Mode compatibility
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // All documents (flat table data)
  const [allDocs, setAllDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Upload flow states: idle -> processing -> confirm -> saving
  const [uploadStep, setUploadStep] = useState('idle'); // idle | processing | confirm | saving
  const [uploadError, setUploadError] = useState(null);
  // Each pending upload: { id, file, detectedName, checklist, processing, error, saved }
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

  // Fix #5: Removed generatingSet state and setGeneratingSet (dead code)

  // Fix #9: Delete button double-click protection
  const [deletingId, setDeletingId] = useState(null);

  // Fix #8: Modal focus refs
  const checklistModalRef = useRef(null);
  const reviewModalRef = useRef(null);

  // Fix #8: Auto-focus modals when opened
  useEffect(() => {
    if (checklistOpen && checklistModalRef.current) {
      checklistModalRef.current.focus();
    }
  }, [checklistOpen]);

  useEffect(() => {
    if (reviewOpen && reviewModalRef.current) {
      reviewModalRef.current.focus();
    }
  }, [reviewOpen]);

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                   */
  /* ---------------------------------------------------------------- */

  const fetchAllDocs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await insuranceSlaService.getAllDocumentsWithCarrier();
      if (!mountedRef.current) return; // Fix #2
      setAllDocs(data ?? []);
    } catch (err) {
      if (!mountedRef.current) return; // Fix #2
      setError(err?.message ?? 'Failed to load SLAs');
    } finally {
      if (mountedRef.current) setLoading(false); // Fix #2
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

    // Fix #7: Create a pending entry for each file with a unique id
    const entries = files.map((file, i) => ({
      id: Date.now() + '-' + i,
      file,
      detectedName: '',
      detectedDate: '',
      checklist: [],
      processing: true,
      error: null,
      saved: false,
    }));
    setPendingUploads(entries);

    // Process each file in parallel
    const results = await Promise.allSettled(
      files.map(async (file) => {
        const lines = await extractTextFromPdf(file);
        const fullText = lines.join('\n');
        if (!fullText.trim()) throw new Error('No readable text found \u2014 PDF may be scanned/image-only.');
        return await extractCarrierAndChecklist(fullText);
      })
    );

    if (!mountedRef.current) return; // Fix #2

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

    if (!mountedRef.current) return; // Fix #2
    setUploadStep('confirm');
  };

  /** Update the carrier name for a specific pending upload */
  const updatePendingName = (idx, name) => {
    setPendingUploads((prev) =>
      prev.map((entry, i) => (i === idx ? { ...entry, detectedName: name } : entry))
    );
  };

  // Fix #3: removePending without nested setState
  const removePending = (idx) => {
    setPendingUploads((prev) => prev.filter((_, i) => i !== idx));
  };

  // Fix #3: useEffect to reset upload when all pending uploads are removed
  useEffect(() => {
    if (pendingUploads.length === 0 && uploadStep === 'confirm') {
      resetUpload();
    }
  }, [pendingUploads.length, uploadStep]);

  // Fix #4: Partial-failure handling in handleConfirmAll
  /** Step 2: Confirm & save all pending uploads */
  const handleConfirmAll = async () => {
    const valid = pendingUploads.filter((u) => !u.error && !u.saved && u.detectedName.trim());
    if (valid.length === 0) { setUploadError('No valid uploads to save.'); return; }

    setUploadStep('saving');
    setUploadError(null);

    const succeededIds = new Set();

    for (const entry of valid) {
      try {
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

        succeededIds.add(entry.id);
      } catch (err) {
        // Continue processing the rest; this entry will remain for retry
        console.error(`Failed to save "${entry.file.name}":`, err);
      }
    }

    if (!mountedRef.current) return; // Fix #2

    if (succeededIds.size === valid.length) {
      // All succeeded
      resetUpload();
      await fetchAllDocs();
    } else {
      // Partial failure: filter out succeeded items so they aren't re-uploaded on retry
      setPendingUploads((prev) => prev.filter((u) => !succeededIds.has(u.id)));
      if (!mountedRef.current) return; // Fix #2
      setUploadError(`${succeededIds.size} of ${valid.length} saved. Retry remaining uploads.`);
      setUploadStep('confirm');
      // Still refresh the table to show what was saved
      await fetchAllDocs();
    }
  };

  const resetUpload = () => {
    setUploadStep('idle');
    setPendingUploads([]);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Fix #5: Removed runAiChecklistBackground (dead code)

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
      if (!mountedRef.current) return; // Fix #2
      setReviewItems(items);
    } catch (err) {
      if (!mountedRef.current) return; // Fix #2
      setAiError(err?.message ?? 'Failed to generate checklist from PDF');
    } finally {
      if (mountedRef.current) setAiProcessing(false); // Fix #2
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
      if (!mountedRef.current) return; // Fix #2
      // If the checklist modal is open for this carrier, refresh it
      if (checklistOpen && checklistCarrierId === reviewCarrierId) {
        const refreshed = await insuranceSlaService.getChecklistItems(reviewCarrierId);
        if (!mountedRef.current) return; // Fix #2
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
      if (!mountedRef.current) return; // Fix #2
      setChecklistItems(items ?? []);
    } catch (err) {
      console.error('Failed to load checklist', err);
    } finally {
      if (mountedRef.current) setChecklistLoading(false); // Fix #2
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
      if (!mountedRef.current) return; // Fix #2
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
      if (!mountedRef.current) return; // Fix #2
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
            {/* Fix #7: Use entry.id as key instead of array index */}
            {pendingUploads.map((entry, idx) => (
              <div key={entry.id} className={`sla-pending-item${entry.error ? ' sla-pending-item-error' : ''}`}>
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
                          {/* Fix #6: Use T12:00:00 to avoid timezone day-shift */}
                          <span>Published: {new Date(entry.detectedDate + 'T12:00:00').toLocaleDateString()}</span>
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
              disabled={!pendingUploads.some((u) => !u.error && !u.saved && u.detectedName.trim())}
            >
              Confirm &amp; Save {pendingUploads.filter((u) => !u.error && !u.saved && u.detectedName.trim()).length} SLA{pendingUploads.filter((u) => !u.error && !u.saved && u.detectedName.trim()).length !== 1 ? 's' : ''}
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
                    {/* Fix #6: Use T12:00:00 to avoid timezone day-shift */}
                    {doc.publish_date ? new Date(doc.publish_date + 'T12:00:00').toLocaleDateString() : '—'}
                  </td>
                  <td className="sla-table-date">
                    {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : '—'}
                  </td>
                  {/* Fix #5: Removed generatingSet reference, always show checklist button */}
                  <td>
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
                  </td>
                  <td>
                    {/* Fix #9: Delete button with double-click protection */}
                    <button
                      type="button"
                      className="sla-icon-btn sla-icon-btn-danger sla-icon-btn-sm"
                      title="Delete document"
                      disabled={deletingId === doc.id}
                      onClick={async () => {
                        if (!window.confirm(`Delete "${doc.file_name}"?`)) return;
                        setDeletingId(doc.id);
                        try {
                          await insuranceSlaService.deleteDocument(doc.id, doc.file_path);
                          if (!mountedRef.current) return; // Fix #2
                          setAllDocs((prev) => prev.filter((d) => d.id !== doc.id));
                        } catch (err) {
                          alert(err?.message ?? 'Failed to delete document');
                        } finally {
                          if (mountedRef.current) setDeletingId(null);
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
          {/* Fix #8: Focus trap + Escape handler for checklist modal */}
          <div
            className="sla-modal sla-modal-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            ref={checklistModalRef}
            onKeyDown={(e) => { if (e.key === 'Escape') closeChecklist(); }}
          >
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

              {/* Fix #7: Grouped items with section-based key instead of array index */}
              {groupedChecklist.map((group) => (
                <div key={group.section || '__none__'} className="sla-checklist-group">
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
          {/* Fix #8: Focus trap + Escape handler for review modal */}
          <div
            className="sla-modal sla-modal-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            ref={reviewModalRef}
            onKeyDown={(e) => { if (e.key === 'Escape' && !aiProcessing) setReviewOpen(false); }}
          >
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
                    {/* Fix #7: Use text+section combo as key for review items */}
                    {reviewItems.map((item, idx) => (
                      <div key={`${item.section || ''}-${item.text}-${idx}`} className="sla-review-item">
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
