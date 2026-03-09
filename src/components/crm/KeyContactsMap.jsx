import React, { useState, useEffect, useRef, useCallback } from 'react';
import keyContactsService from '../../services/keyContactsService';

const EMPTY_CONTACT = { name: '', title: '', email: '', cell: '', role: '' };

const ROLE_OPTIONS = [
  { value: 'decisionMaker', label: 'Decision Maker', color: '#D97706', hint: 'Signs off — exec, owner, agency principal' },
  { value: 'operations', label: 'Operations Contact', color: '#2563EB', hint: 'Day-to-day — office manager, claims handler, property manager' },
  { value: 'finance', label: 'Finance / AP', color: '#16A34A', hint: 'Handles payments and invoicing' },
  { value: 'referralSource', label: 'Referral Source', color: '#f97316', hint: 'Sends you work — agent, adjuster, maintenance supervisor' },
  { value: 'gatekeeper', label: 'Gatekeeper', color: '#9333EA', hint: 'Controls access — admin, assistant, front desk' },
  { value: 'other', label: 'Other', color: '#9333EA', hint: '' },
];

const ROLE_COLORS = Object.fromEntries(ROLE_OPTIONS.map(r => [r.value, r.color]));

// Map old role values to new ones for migration
const ROLE_MIGRATION = {
  leadExec: 'decisionMaker',
  propertyManager: 'operations',
  apPerson: 'finance',
};

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0][0]?.toUpperCase() || '?';
}

function ContactCard({ contact, roleLabel, color, onChange, onRemove, contactKey, isInfluencer, onToggleInfluencer, showRoleSelect }) {
  const [editing, setEditing] = useState(false);
  const cardRef = useRef(null);
  const hasData = contact.name || contact.email || contact.cell;

  useEffect(() => {
    if (!editing) return;
    const handleClickOutside = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        setEditing(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editing]);

  const handleInfluencerClick = (e) => {
    e.stopPropagation();
    if (hasData) onToggleInfluencer(contactKey);
  };

  if (!hasData && !editing) {
    return (
      <div className="contact-card contact-card-empty" onClick={() => setEditing(true)}>
        <div className="contact-avatar" style={{ background: `${color}33`, color }}>+</div>
        <div className="contact-card-body">
          <span className="contact-card-add">Add {roleLabel}</span>
        </div>
      </div>
    );
  }

  if (editing) {
    const activeColor = contact.role ? (ROLE_COLORS[contact.role] || color) : color;
    const activeLabel = contact.role ? (ROLE_OPTIONS.find(r => r.value === contact.role)?.label || roleLabel) : roleLabel;
    return (
      <div ref={cardRef} className={`contact-card contact-card-editing${isInfluencer ? ' contact-card-influencer' : ''}`}>
        <div className="contact-avatar" style={{ background: `${activeColor}33`, color: activeColor }}>
          {getInitials(contact.name)}
        </div>
        <div className="contact-card-body">
          {showRoleSelect ? (
            <div>
              <select
                value={contact.role || ''}
                onChange={(e) => onChange({ ...contact, role: e.target.value })}
                className="contact-input"
                style={{ marginBottom: '0.15rem', width: '100%' }}
              >
                <option value="">Select role...</option>
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {contact.role && ROLE_OPTIONS.find(r => r.value === contact.role)?.hint && (
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '0.35rem', lineHeight: 1.3 }}>
                  {ROLE_OPTIONS.find(r => r.value === contact.role).hint}
                </div>
              )}
            </div>
          ) : (
            <div className="contact-role-badge" style={{ background: `${activeColor}22`, color: activeColor, borderColor: `${activeColor}55` }}>
              {activeLabel}
            </div>
          )}
          <div className="contact-edit-fields">
            <input
              type="text"
              placeholder="Full name"
              value={contact.name}
              onChange={(e) => onChange({ ...contact, name: e.target.value })}
              className="contact-input"
              autoFocus
            />
            <input
              type="text"
              placeholder="Title"
              value={contact.title || ''}
              onChange={(e) => onChange({ ...contact, title: e.target.value })}
              className="contact-input"
            />
            <input
              type="email"
              placeholder="Email"
              value={contact.email}
              onChange={(e) => onChange({ ...contact, email: e.target.value })}
              className="contact-input"
            />
            <input
              type="tel"
              placeholder="Cell phone"
              value={contact.cell}
              onChange={(e) => onChange({ ...contact, cell: e.target.value })}
              className="contact-input"
            />
          </div>
          {onRemove && (
            <div className="contact-edit-actions">
              <button type="button" className="contact-remove-btn" onClick={onRemove}>Remove</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove();
    } else {
      onChange({ ...EMPTY_CONTACT });
    }
  };

  const displayColor = contact.role ? (ROLE_COLORS[contact.role] || color) : color;
  const displayLabel = contact.role ? (ROLE_OPTIONS.find(r => r.value === contact.role)?.label || roleLabel) : roleLabel;

  return (
    <div className={`contact-card${isInfluencer ? ' contact-card-influencer' : ''}`} onClick={() => setEditing(true)}>
      <div className="contact-avatar" style={{ background: `${displayColor}33`, color: displayColor }}>
        {getInitials(contact.name)}
      </div>
      <div className="contact-card-body">
        <div className="contact-card-top-row">
          <div className="contact-card-badges">
            <div className="contact-role-badge" style={{ background: `${displayColor}22`, color: displayColor, borderColor: `${displayColor}55` }}>
              {displayLabel}
            </div>
            {isInfluencer && (
              <div className="contact-influencer-badge">Key Influencer</div>
            )}
          </div>
          <div className="contact-card-actions">
            <span
              className={`contact-influencer-star${isInfluencer ? ' active' : ''}`}
              onClick={handleInfluencerClick}
              title={isInfluencer ? 'Remove as Key Influencer' : 'Set as Key Influencer'}
            >
              {isInfluencer ? '★' : '☆'}
            </span>
            <span className="contact-delete-x" onClick={handleDelete} title="Delete contact">&times;</span>
          </div>
        </div>
        <div className="contact-card-name">{contact.name}</div>
        {contact.title && <div className="contact-card-title">{contact.title}</div>}
        <div className="contact-card-details">
          {contact.email && (
            <a href={`mailto:${contact.email}`} onClick={(e) => e.stopPropagation()} className="contact-link">
              {contact.email}
            </a>
          )}
          {contact.cell && (
            <a href={`tel:${contact.cell}`} onClick={(e) => e.stopPropagation()} className="contact-link">
              {contact.cell}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function migrateContacts(saved) {
  // Migrate old format (leadExec/propertyManagers/apPerson) to flat list
  if (saved && !Array.isArray(saved) && saved.leadExec !== undefined) {
    const list = [];
    if (saved.leadExec?.name) list.push({ ...saved.leadExec, role: 'decisionMaker' });
    if (saved.propertyManagers) {
      saved.propertyManagers.forEach(pm => {
        if (pm?.name) list.push({ ...pm, role: 'operations' });
      });
    }
    if (saved.apPerson?.name) list.push({ ...saved.apPerson, role: 'finance' });
    return list.length > 0 ? list : [];
  }
  // Migrate old role values in flat list format
  if (Array.isArray(saved)) {
    return saved.map(c => ({
      ...c,
      role: ROLE_MIGRATION[c.role] || c.role || '',
    }));
  }
  return saved || [];
}

function KeyContactsMap({ recordId }) {
  const [contacts, setContacts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);

  // Load contacts from Supabase
  useEffect(() => {
    if (!recordId) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await keyContactsService.getByCrmId(recordId);
        if (cancelled) return;
        const mapped = rows.map(r => ({
          name: r.name || '',
          title: r.title || '',
          email: r.email || '',
          cell: r.cell || '',
          role: ROLE_MIGRATION[r.role] || r.role || '',
          isKeyInfluencer: r.is_key_influencer || false,
        }));
        // Also check localStorage for migration
        const storageKey = `crm-contacts-${recordId}`;
        const localSaved = localStorage.getItem(storageKey);
        if (mapped.length === 0 && localSaved) {
          try {
            const migrated = migrateContacts(JSON.parse(localSaved));
            if (migrated.length > 0) {
              setContacts(migrated);
              setLoaded(true);
              // Save migrated data to Supabase and clear localStorage
              await keyContactsService.save(recordId, migrated);
              localStorage.removeItem(storageKey);
              return;
            }
          } catch { /* ignore */ }
        }
        setContacts(mapped);
      } catch (error) {
        console.error('Error loading key contacts:', error);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [recordId]);

  // Auto-save to Supabase with debounce
  const saveToSupabase = useCallback((contactsToSave) => {
    if (!recordId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await keyContactsService.save(recordId, contactsToSave);
      } catch (error) {
        console.error('Error saving key contacts:', error);
      }
    }, 800);
  }, [recordId]);

  const updateContact = (index, value) => {
    setContacts((c) => {
      const updated = c.map((ct, i) => (i === index ? value : ct));
      saveToSupabase(updated);
      return updated;
    });
  };

  const addContact = () => {
    setContacts((c) => {
      const updated = [...c, { ...EMPTY_CONTACT }];
      saveToSupabase(updated);
      return updated;
    });
  };

  const removeContact = (index) => {
    setContacts((c) => {
      const updated = c.filter((_, i) => i !== index);
      saveToSupabase(updated);
      return updated;
    });
  };

  const handleToggleInfluencer = (contactKey) => {
    const index = parseInt(contactKey.replace('contact-', ''), 10);
    setContacts((c) => {
      const updated = c.map((ct, i) => ({
        ...ct,
        isKeyInfluencer: i === index ? !ct.isKeyInfluencer : ct.isKeyInfluencer,
      }));
      saveToSupabase(updated);
      return updated;
    });
  };

  if (!loaded) {
    return (
      <div className="detail-section">
        <h3>Key Contacts</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Loading contacts...</p>
      </div>
    );
  }

  return (
    <div className="detail-section">
      <h3>Key Contacts</h3>

      <div className="contact-cards-grid">
        {contacts.map((contact, i) => {
          const roleColor = ROLE_COLORS[contact.role] || '#9333EA';
          const roleOption = ROLE_OPTIONS.find(r => r.value === contact.role);
          const roleLabel = roleOption?.label || 'Select Role';
          return (
            <ContactCard
              key={i}
              contact={contact}
              roleLabel={roleLabel}
              color={roleColor}
              onChange={(val) => updateContact(i, val)}
              onRemove={() => removeContact(i)}
              contactKey={`contact-${i}`}
              isInfluencer={contact.isKeyInfluencer || false}
              onToggleInfluencer={handleToggleInfluencer}
              showRoleSelect
            />
          );
        })}

        <div className="contact-card contact-card-empty" onClick={addContact}>
          <div className="contact-avatar" style={{ background: '#9333EA33', color: '#9333EA' }}>+</div>
          <div className="contact-card-body">
            <span className="contact-card-add">Add Key Contact</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KeyContactsMap;
