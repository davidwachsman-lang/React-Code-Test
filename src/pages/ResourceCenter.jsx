import React, { useState, useMemo, useEffect } from 'react';
import { VENDOR_CATEGORIES, CATEGORY_COLORS } from '../data/vendorData';
import { INTERNAL_DIRECTORY } from '../data/internalDirectoryData';
import { vendorService } from '../services';
import InsuranceSLAs from '../components/resource-center/InsuranceSLAs';
import './ResourceCenter.css';

const emptyForm = () => ({
  name: '',
  category: 'Other',
  phone: '',
  email: '',
  notes: ''
});

const RESOURCE_TAB = {
  LANDING: 'landing',
  EXTERNAL: 'external',
  INTERNAL: 'internal',
  SLA: 'sla',
  ORG_CHARTS: 'org_charts',
};

const LANDING_CARDS = [
  {
    id: RESOURCE_TAB.EXTERNAL,
    title: 'Vendor & External Resources',
    subtitle: 'Quick access to vendors and sub-trades',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    id: RESOURCE_TAB.INTERNAL,
    title: 'Company Directory',
    subtitle: 'Internal contacts, roles, and departments',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
        <line x1="8" y1="7" x2="16" y2="7" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    ),
  },
  {
    id: RESOURCE_TAB.SLA,
    title: 'Insurance SLAs',
    subtitle: 'Service level agreements by carrier',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: RESOURCE_TAB.ORG_CHARTS,
    title: 'Org Charts',
    subtitle: 'Team structure and assignments',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="8.5" y="14" width="7" height="7" rx="1.5" />
        <line x1="6.5" y1="10" x2="6.5" y2="12" />
        <line x1="17.5" y1="10" x2="17.5" y2="12" />
        <line x1="6.5" y1="12" x2="17.5" y2="12" />
        <line x1="12" y1="12" x2="12" y2="14" />
      </svg>
    ),
  },
];

const SECTION_TITLES = {
  [RESOURCE_TAB.EXTERNAL]: 'Vendor & External Resources',
  [RESOURCE_TAB.INTERNAL]: 'Company Directory',
  [RESOURCE_TAB.SLA]: 'Insurance SLAs',
  [RESOURCE_TAB.ORG_CHARTS]: 'Org Charts',
};

const ResourceCenter = () => {
  const [resourceTab, setResourceTab] = useState(RESOURCE_TAB.LANDING);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [formSaving, setFormSaving] = useState(false);

  const refetchVendors = () => {
    return vendorService.getAll().then((data) => setVendors(data ?? []));
  };

  const openAdd = () => {
    setEditingVendor(null);
    setFormData(emptyForm());
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name ?? '',
      category: vendor.category ?? 'Other',
      phone: vendor.phone ?? '',
      email: vendor.email ?? '',
      notes: vendor.notes ?? ''
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingVendor(null);
    setFormData(emptyForm());
    setFormError(null);
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setFormError(null);
    const name = (formData.name || '').trim();
    if (!name) {
      setFormError('Name is required.');
      return;
    }
    setFormSaving(true);
    const payload = {
      name,
      category: formData.category || 'Other',
      phone: (formData.phone || '').trim(),
      email: (formData.email || '').trim(),
      notes: (formData.notes || '').trim()
    };
    const promise = editingVendor
      ? vendorService.update(editingVendor.id, payload)
      : vendorService.create(payload);
    promise
      .then(() => refetchVendors())
      .then(closeModal)
      .catch((err) => setFormError(err?.message ?? 'Failed to save vendor'))
      .finally(() => setFormSaving(false));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    vendorService
      .getAll()
      .then((data) => {
        if (!cancelled) setVendors(data ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Failed to load vendors');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Filter vendors based on search and category
  const filteredVendors = useMemo(() => {
    const list = Array.isArray(vendors) ? vendors : [];
    return list.filter(vendor => {
      // Category filter
      const matchesCategory = selectedCategory === 'All' || vendor.category === selectedCategory;
      
      // Search filter (name, phone, email, notes)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        (vendor.name && vendor.name.toLowerCase().includes(searchLower)) ||
        (vendor.phone && vendor.phone.toLowerCase().includes(searchLower)) ||
        (vendor.email && vendor.email.toLowerCase().includes(searchLower)) ||
        (vendor.notes && vendor.notes.toLowerCase().includes(searchLower));
      return matchesCategory && matchesSearch;
    });
  }, [vendors, searchTerm, selectedCategory]);

  // Group vendors by category for display
  const groupedVendors = useMemo(() => {
    const groups = {};
    filteredVendors.forEach(vendor => {
      if (!groups[vendor.category]) {
        groups[vendor.category] = [];
      }
      groups[vendor.category].push(vendor);
    });
    return groups;
  }, [filteredVendors]);

  const formatPhone = (phone) => {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
  };

  const isLanding = resourceTab === RESOURCE_TAB.LANDING;

  return (
    <div className="resource-center">
      {/* Header */}
      <div className="resource-header resource-header-with-action">
        <div>
          {!isLanding && (
            <button
              type="button"
              className="resource-back-btn"
              onClick={() => setResourceTab(RESOURCE_TAB.LANDING)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>
          )}
          <h1>{isLanding ? 'Resource Center' : SECTION_TITLES[resourceTab]}</h1>
          {isLanding && <p className="resource-subtitle">Select a section below</p>}
        </div>
        {resourceTab === RESOURCE_TAB.EXTERNAL && (
          <button type="button" className="resource-add-btn" onClick={openAdd}>
            Add vendor
          </button>
        )}
      </div>

      {/* Landing page — 4 cards */}
      {isLanding && (
        <div className="resource-landing-grid">
          {LANDING_CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              className="resource-landing-card"
              onClick={() => setResourceTab(card.id)}
            >
              <span className="resource-landing-icon">{card.icon}</span>
              <span className="resource-landing-title">{card.title}</span>
              <span className="resource-landing-subtitle">{card.subtitle}</span>
            </button>
          ))}
        </div>
      )}

      {/* Vendor & External Resources */}
      {resourceTab === RESOURCE_TAB.EXTERNAL && (
        <>
          {loading ? (
            <div className="resource-loading">Loading vendors...</div>
          ) : error ? (
            <div className="resource-error">
              <p>{error}</p>
              <button type="button" onClick={() => window.location.reload()}>Retry</button>
            </div>
          ) : (
            <>
              <div className="resource-controls">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search by name, phone, or notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  {searchTerm && (
                    <button className="clear-search" onClick={() => setSearchTerm('')}>
                      &times;
                    </button>
                  )}
                </div>
                <div className="category-pills">
                  <button
                    className={`category-pill ${selectedCategory === 'All' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('All')}
                  >
                    All
                  </button>
                  {VENDOR_CATEGORIES.map(category => (
                    <button
                      key={category}
                      className={`category-pill ${selectedCategory === category ? 'active' : ''}`}
                      style={{ '--pill-color': CATEGORY_COLORS[category] || '#64748b' }}
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
              <div className="results-info">
                {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''} found
                {selectedCategory !== 'All' && ` in ${selectedCategory}`}
              </div>
              {filteredVendors.length === 0 ? (
                <div className="no-results">
                  <p>No vendors found matching your criteria.</p>
                  <button onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}>
                    Clear filters
                  </button>
                </div>
              ) : selectedCategory === 'All' ? (
                Object.keys(groupedVendors).sort().map(category => (
                  <div key={category} className="vendor-group">
                    <h2 className="group-title" style={{ borderColor: CATEGORY_COLORS[category] }}>
                      <span className="group-badge" style={{ backgroundColor: CATEGORY_COLORS[category] }}>
                        {groupedVendors[category].length}
                      </span>
                      {category}
                    </h2>
                    <div className="vendor-grid">
                      {groupedVendors[category].map(vendor => (
                        <VendorCard key={vendor.id} vendor={vendor} formatPhone={formatPhone} onEdit={openEdit} />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="vendor-grid">
                  {filteredVendors.map(vendor => (
                    <VendorCard key={vendor.id} vendor={vendor} formatPhone={formatPhone} onEdit={openEdit} />
                  ))}
                </div>
              )}
              {modalOpen && (
                <VendorFormModal
                  isEdit={!!editingVendor}
                  formData={formData}
                  formError={formError}
                  formSaving={formSaving}
                  onClose={closeModal}
                  onChange={handleFormChange}
                  onSubmit={handleFormSubmit}
                />
              )}
            </>
          )}
        </>
      )}

      {/* Company Directory */}
      {resourceTab === RESOURCE_TAB.INTERNAL && <InternalCompanyDirectory />}

      {/* Insurance SLAs */}
      {resourceTab === RESOURCE_TAB.SLA && <InsuranceSLAs />}

      {/* Org Charts */}
      {resourceTab === RESOURCE_TAB.ORG_CHARTS && <MITTeamAssignments />}
    </div>
  );
};

const DIRECTORY_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role' },
  { key: 'department', label: 'Department' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
];

function formatPhoneWithExt(person) {
  const phone = person.phone || '';
  const ext = person.extension || '';
  if (!phone) return '';
  return ext ? `${phone} x${ext}` : phone;
}

function InternalCompanyDirectory() {
  const directoryData = INTERNAL_DIRECTORY;
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const filteredAndSorted = useMemo(() => {
    const searchLower = (searchTerm || '').toLowerCase().trim();
    let list = searchLower
      ? directoryData.filter((person) => {
          const name = (person.name || '').toLowerCase();
          const role = (person.role || '').toLowerCase();
          const department = (person.department || '').toLowerCase();
          const email = (person.email || '').toLowerCase();
          const phone = (person.phone || '').toLowerCase();
          const ext = (person.extension || '').toLowerCase();
          return (
            name.includes(searchLower) ||
            role.includes(searchLower) ||
            department.includes(searchLower) ||
            email.includes(searchLower) ||
            phone.includes(searchLower) ||
            ext.includes(searchLower)
          );
        })
      : [...directoryData];
    list.sort((a, b) => {
      const aVal = (a[sortField] || '').toString().toLowerCase();
      const bVal = (b[sortField] || '').toString().toLowerCase();
      const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [directoryData, searchTerm, sortField, sortDirection]);

  const handleSort = (key) => {
    if (sortField === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(key);
      setSortDirection('asc');
    }
  };

  return (
    <div className="resource-internal-directory">
      <div className="resource-internal-search-box">
        <input
          type="text"
          placeholder="Search by name, title, department, or phone"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {searchTerm && (
          <button type="button" className="clear-search" onClick={() => setSearchTerm('')} aria-label="Clear search">
            &times;
          </button>
        )}
      </div>
      <div className="resource-internal-results">
        {filteredAndSorted.length} {filteredAndSorted.length === 1 ? 'person' : 'people'} found
      </div>
      <div className="resource-internal-table-wrap">
        <table className="resource-internal-table">
          <thead>
            <tr>
              {DIRECTORY_COLUMNS.map(({ key, label }) => (
                <th
                  key={key}
                  className="resource-internal-th sortable"
                  onClick={() => handleSort(key)}
                >
                  <span className="header-content">
                    {label}
                    {sortField === key && (
                      <span className="sort-indicator" aria-hidden>
                        {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((person, index) => (
              <tr key={index}>
                <td>{person.name}</td>
                <td>{person.role}</td>
                <td>{person.department}</td>
                <td>{person.email || '—'}</td>
                <td>{formatPhoneWithExt(person)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// MIT Team Assignments / Org Charts Component
function MITTeamAssignments() {
  return (
    <div className="mit-team-assignments">
      <div className="org-chart">
        <div className="org-chart-top">
          <div className="org-chart-card org-chart-card-top">
            <span className="org-chart-name">Kenny</span>
            <span className="org-chart-title">Operations Manager</span>
          </div>
        </div>
        <div className="org-chart-branches">
          {/* Blue Team - Kevin */}
          <div className="org-chart-branch org-chart-branch-blue">
            <div className="org-chart-card org-chart-card-pm">
              <span className="org-chart-name">Kevin</span>
              <span className="org-chart-title">Senior Production Manager</span>
            </div>
            <div className="org-chart-team">
              <div className="org-chart-card org-chart-card-member">
                <span className="org-chart-name">Brandie</span>
                <span className="org-chart-title">Job File Coordinator</span>
              </div>
              <div className="org-chart-card org-chart-card-member">
                <span className="org-chart-name">Gabriel</span>
                <span className="org-chart-title">Crew Chief</span>
                <div className="org-chart-nested">
                  <div className="org-chart-card org-chart-card-nested">
                    <span className="org-chart-name">Genesis</span>
                    <span className="org-chart-title">Tech</span>
                  </div>
                </div>
              </div>
              <div className="org-chart-card org-chart-card-member">
                <span className="org-chart-name">David</span>
                <span className="org-chart-title">Crew Chief in Training</span>
                <div className="org-chart-nested">
                  <div className="org-chart-card org-chart-card-nested">
                    <span className="org-chart-name">Tyler</span>
                    <span className="org-chart-title">Tech</span>
                  </div>
                </div>
              </div>
              <div className="org-chart-card org-chart-card-member">
                <span className="org-chart-name">Michael</span>
                <span className="org-chart-title">Crew Chief in Training</span>
                <div className="org-chart-nested">
                  <div className="org-chart-card org-chart-card-nested">
                    <span className="org-chart-name">Josue</span>
                    <span className="org-chart-title">Tech</span>
                  </div>
                </div>
              </div>
            </div>
            <span className="org-chart-branch-label">Blue</span>
          </div>

          {/* Purple Team - Leo */}
          <div className="org-chart-branch org-chart-branch-purple">
            <div className="org-chart-card org-chart-card-pm">
              <span className="org-chart-name">Leo</span>
              <span className="org-chart-title">Production Manager</span>
            </div>
            <div className="org-chart-team">
              <div className="org-chart-card org-chart-card-member">
                <span className="org-chart-name">Brandie</span>
                <span className="org-chart-title">Job File Coordinator</span>
              </div>
              <div className="org-chart-card org-chart-card-member">
                <span className="org-chart-name">Ramon</span>
                <span className="org-chart-title">Crew Chief</span>
                <div className="org-chart-nested">
                  <div className="org-chart-card org-chart-card-nested">
                    <span className="org-chart-name">Frank</span>
                    <span className="org-chart-title">Technician</span>
                  </div>
                </div>
              </div>
              <div className="org-chart-card org-chart-card-member">
                <span className="org-chart-name">Roger</span>
                <span className="org-chart-title">Demo Lead Tech</span>
              </div>
            </div>
            <span className="org-chart-branch-label">Purple</span>
          </div>

          {/* Green Team - Aaron */}
          <div className="org-chart-branch org-chart-branch-green">
            <div className="org-chart-card org-chart-card-pm">
              <span className="org-chart-name">Aaron</span>
              <span className="org-chart-title">Production Manager</span>
            </div>
            <div className="org-chart-team">
              <div className="org-chart-card org-chart-card-member">
                <span className="org-chart-name">Brandie</span>
                <span className="org-chart-title">Job File Coordinator</span>
              </div>
              <div className="org-chart-card org-chart-card-member">
                <span className="org-chart-name">Pedro</span>
                <span className="org-chart-title">Crew Chief</span>
                <div className="org-chart-nested">
                  <div className="org-chart-card org-chart-card-nested">
                    <span className="org-chart-name">Juan</span>
                    <span className="org-chart-title">Technician</span>
                  </div>
                </div>
              </div>
              <div className="org-chart-card org-chart-card-member">
                <span className="org-chart-name">Monica</span>
                <span className="org-chart-title">Cleaning Crew Chief</span>
                <div className="org-chart-nested">
                  <div className="org-chart-card org-chart-card-nested">
                    <span className="org-chart-name">Leslie</span>
                    <span className="org-chart-title">Cleaning Technician</span>
                  </div>
                </div>
              </div>
            </div>
            <span className="org-chart-branch-label">Green</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Vendor Form Modal
const VendorFormModal = ({
  isEdit,
  formData,
  formError,
  formSaving,
  onClose,
  onChange,
  onSubmit
}) => (
  <div className="vendor-modal-backdrop" role="presentation">
    <div className="vendor-modal" role="dialog" aria-modal="true" aria-labelledby="vendor-modal-title">
      <div className="vendor-modal-header">
        <h2 id="vendor-modal-title">{isEdit ? 'Edit vendor' : 'Add vendor'}</h2>
        <button type="button" className="vendor-modal-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
      </div>
      <form onSubmit={onSubmit} className="vendor-form">
        {formError && (
          <div className="vendor-form-error" role="alert">
            {formError}
          </div>
        )}
        <div className="vendor-form-row">
          <label htmlFor="vendor-name">Name *</label>
          <input
            id="vendor-name"
            type="text"
            value={formData.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Vendor name"
            required
            autoFocus
          />
        </div>
        <div className="vendor-form-row">
          <label htmlFor="vendor-category">Category</label>
          <select
            id="vendor-category"
            value={formData.category}
            onChange={(e) => onChange('category', e.target.value)}
          >
            {VENDOR_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="vendor-form-row">
          <label htmlFor="vendor-phone">Phone</label>
          <input
            id="vendor-phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder="555-123-4567"
          />
        </div>
        <div className="vendor-form-row">
          <label htmlFor="vendor-email">Email</label>
          <input
            id="vendor-email"
            type="email"
            value={formData.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="email@example.com"
          />
        </div>
        <div className="vendor-form-row">
          <label htmlFor="vendor-notes">Notes</label>
          <textarea
            id="vendor-notes"
            value={formData.notes}
            onChange={(e) => onChange('notes', e.target.value)}
            placeholder="Optional notes"
            rows={3}
          />
        </div>
        <div className="vendor-form-actions">
          <button type="button" className="vendor-form-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="vendor-form-submit" disabled={formSaving}>
            {formSaving ? 'Saving…' : (isEdit ? 'Save changes' : 'Add vendor')}
          </button>
        </div>
      </form>
    </div>
  </div>
);

// Vendor Card Component
const VendorCard = ({ vendor, formatPhone, onEdit }) => {
  const categoryColor = CATEGORY_COLORS[vendor.category] || '#64748b';
  
  return (
    <div className="vendor-card">
      <div className="card-header">
        <div className="card-header-title-row">
          <h3 className="vendor-name">{vendor.name}</h3>
          {onEdit && (
            <button
              type="button"
              className="vendor-card-edit"
              onClick={() => onEdit(vendor)}
              aria-label={`Edit ${vendor.name}`}
              title="Edit"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
        </div>
        <span 
          className="category-badge"
          style={{ backgroundColor: categoryColor }}
        >
          {vendor.category}
        </span>
      </div>
      
      <div className="card-body">
        {/* Phone */}
        {(vendor.phone != null && vendor.phone !== '') && (
          <div className="contact-row">
            <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
            <a href={`tel:${formatPhone(vendor.phone)}`} className="contact-link phone">
              {vendor.phone}
            </a>
          </div>
        )}

        {/* Email */}
        {(vendor.email != null && vendor.email !== '') && (
          <div className="contact-row">
            <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <a href={`mailto:${vendor.email}`} className="contact-link email">
              {vendor.email}
            </a>
          </div>
        )}
        
        {/* Notes */}
        {vendor.notes && (
          <div className="notes-row">
            <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span className="notes-text">{vendor.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceCenter;
