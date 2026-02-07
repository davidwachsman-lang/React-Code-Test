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
  const [loading, setLoading] = useState(false);

  const loadContacts = useCallback(async (rep) => {
    if (!rep) {
      setContacts([]);
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
    } catch (err) {
      console.error('Error loading contacts:', err);
      setContacts([]);
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
  const emails = contactsWithEmail.map(c => c.email.trim());

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
                  <div className="stat-value">{contactsWithEmail.length}</div>
                  <div className="stat-label">Contacts with Email</div>
                </div>
                <div className="mass-email-stat">
                  <div className="stat-value">{contacts.length}</div>
                  <div className="stat-label">Total Contacts</div>
                </div>
              </div>

              <div className="mass-email-contacts-list">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Company</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map(c => (
                      <tr key={c.id}>
                        <td>{contactName(c)}</td>
                        <td>{c.company_name || '—'}</td>
                        <td>{c.email && c.email.trim() ? c.email : <span className="no-email">No email</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mass-email-actions">
                {batches.length === 1 && (
                  <button onClick={() => openMailto(batches[0])} disabled={emails.length === 0}>
                    Open in Email Client ({emails.length} contacts)
                  </button>
                )}
                {batches.length > 1 && batches.map((batch, i) => (
                  <button key={i} onClick={() => openMailto(batch)}>
                    Send Batch {i + 1} ({batch.length} contacts)
                  </button>
                ))}
                {emails.length === 0 && (
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
