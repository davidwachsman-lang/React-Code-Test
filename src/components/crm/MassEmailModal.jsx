import React, { useState, useCallback } from 'react';
import { supabase, handleSupabaseResult } from '../../services/supabaseClient';
import './MassEmailModal.css';

const SALES_REPS = [
  { value: 'bri', label: 'Bri' },
  { value: 'paige', label: 'Paige' },
  { value: 'tony', label: 'Tony' },
  { value: 'david', label: 'David' },
  { value: 'mike', label: 'Mike' },
  { value: 'ainsley', label: 'Ainsley' },
  { value: 'joe', label: 'Joe' },
];

const MAX_MAILTO_LENGTH = 2000;

function MassEmailModal({ onClose }) {
  const [selectedRep, setSelectedRep] = useState('');
  const [contacts, setContacts] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const loadContacts = useCallback(async (rep) => {
    if (!rep) {
      setContacts([]);
      setSelectedIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const response = await supabase
        .from('crm_records')
        .select('id, first_name, last_name, company_name, email')
        .eq('primary_sales_rep', rep)
        .neq('is_deleted', true)
        .order('company_name', { ascending: true });
      const data = handleSupabaseResult(response);
      setContacts(data || []);
      // Select all contacts with email by default
      const withEmail = (data || []).filter(c => c.email && c.email.trim());
      setSelectedIds(new Set(withEmail.map(c => c.id)));
    } catch (err) {
      console.error('Error loading contacts:', err);
      setContacts([]);
      setSelectedIds(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRepChange = (e) => {
    const rep = e.target.value;
    setSelectedRep(rep);
    loadContacts(rep);
  };

  const contactsWithEmail = contacts.filter(c => c.email && c.email.trim());

  const toggleContact = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === contactsWithEmail.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contactsWithEmail.map(c => c.id)));
    }
  };

  const selectedContacts = contactsWithEmail.filter(c => selectedIds.has(c.id));
  const emails = selectedContacts.map(c => c.email.trim());

  // Split emails into batches if BCC string exceeds mailto length limit
  const buildBatches = () => {
    if (emails.length === 0) return [];
    const batches = [];
    let currentBatch = [];
    let currentLength = 0;

    for (const email of emails) {
      // +1 for the comma separator
      const addition = currentLength === 0 ? email.length : email.length + 1;
      if (currentLength + addition > MAX_MAILTO_LENGTH && currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [email];
        currentLength = email.length;
      } else {
        currentBatch.push(email);
        currentLength += addition;
      }
    }
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }
    return batches;
  };

  const batches = buildBatches();

  const openMailto = (batchEmails) => {
    const bcc = batchEmails.join(',');
    window.open(`mailto:?bcc=${encodeURIComponent(bcc)}`, '_self');
  };

  const contactName = (c) => {
    const parts = [c.first_name, c.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : '—';
  };

  return (
    <div className="modal-overlay mass-email-modal" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Email Book</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="mass-email-body">
          <div className="form-group">
            <label>Sales Rep</label>
            <select value={selectedRep} onChange={handleRepChange}>
              <option value="">Select a sales rep...</option>
              {SALES_REPS.map(rep => (
                <option key={rep.value} value={rep.value}>{rep.label}</option>
              ))}
            </select>
          </div>

          {loading && <div className="mass-email-loading">Loading contacts...</div>}

          {!loading && selectedRep && contacts.length > 0 && (
            <>
              <div className="mass-email-stats">
                <div className="mass-email-stat">
                  <div className="stat-value">{selectedContacts.length}</div>
                  <div className="stat-label">Selected</div>
                </div>
                <div className="mass-email-stat">
                  <div className="stat-value">{contactsWithEmail.length}</div>
                  <div className="stat-label">With Email</div>
                </div>
                <div className="mass-email-stat">
                  <div className="stat-value">{contacts.length}</div>
                  <div className="stat-label">Total</div>
                </div>
              </div>

              <div className="mass-email-contacts-list">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '36px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.size === contactsWithEmail.length && contactsWithEmail.length > 0}
                          onChange={toggleAll}
                          title="Select All / Deselect All"
                        />
                      </th>
                      <th>Name</th>
                      <th>Company</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map(c => {
                      const hasEmail = c.email && c.email.trim();
                      return (
                        <tr key={c.id} style={{ opacity: hasEmail ? 1 : 0.5 }}>
                          <td style={{ textAlign: 'center' }}>
                            {hasEmail && (
                              <input
                                type="checkbox"
                                checked={selectedIds.has(c.id)}
                                onChange={() => toggleContact(c.id)}
                              />
                            )}
                          </td>
                          <td>{contactName(c)}</td>
                          <td>{c.company_name || '—'}</td>
                          <td>{hasEmail ? c.email : <span className="no-email">No email</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mass-email-actions">
                {batches.length === 1 && (
                  <button onClick={() => openMailto(batches[0])} disabled={emails.length === 0}>
                    Open in Email Client ({selectedContacts.length} selected)
                  </button>
                )}
                {batches.length > 1 && batches.map((batch, i) => (
                  <button key={i} onClick={() => openMailto(batch)}>
                    Send Batch {i + 1} ({batch.length} contacts)
                  </button>
                ))}
                {selectedContacts.length === 0 && contactsWithEmail.length > 0 && (
                  <div className="mass-email-empty">Select contacts to email.</div>
                )}
                {contactsWithEmail.length === 0 && (
                  <div className="mass-email-empty">No contacts with email addresses for this rep.</div>
                )}
              </div>
            </>
          )}

          {!loading && selectedRep && contacts.length === 0 && (
            <div className="mass-email-empty">No contacts found for this sales rep.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MassEmailModal;
