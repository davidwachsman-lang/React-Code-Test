import React, { useState, useMemo, useEffect } from 'react';
import { VENDOR_CATEGORIES, CATEGORY_COLORS } from '../data/vendorData';
import { vendorService } from '../services';
import './ResourceCenter.css';

const emptyForm = () => ({
  name: '',
  category: 'Other',
  phone: '',
  email: '',
  notes: ''
});

const ResourceCenter = () => {
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

  if (loading) {
    return (
      <div className="resource-center">
        <div className="resource-header">
          <h1>Resource Center</h1>
          <p className="resource-subtitle">Quick access to vendors and sub-trades</p>
        </div>
        <div className="resource-loading">Loading vendors…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="resource-center">
        <div className="resource-header">
          <h1>Resource Center</h1>
          <p className="resource-subtitle">Quick access to vendors and sub-trades</p>
        </div>
        <div className="resource-error">
          <p>{error}</p>
          <button type="button" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="resource-center">
      <div className="resource-header resource-header-with-action">
        <div>
          <h1>Resource Center</h1>
          <p className="resource-subtitle">Quick access to vendors and sub-trades</p>
        </div>
        <button type="button" className="resource-add-btn" onClick={openAdd}>
          Add vendor
        </button>
      </div>

      {/* Search and Filter Bar */}
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

        {/* Category Pills */}
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
              style={{
                '--pill-color': CATEGORY_COLORS[category] || '#64748b'
              }}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="results-info">
        {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''} found
        {selectedCategory !== 'All' && ` in ${selectedCategory}`}
      </div>

      {/* Vendor Cards */}
      {filteredVendors.length === 0 ? (
        <div className="no-results">
          <p>No vendors found matching your criteria.</p>
          <button onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}>
            Clear filters
          </button>
        </div>
      ) : selectedCategory === 'All' ? (
        // Grouped view when showing all categories
        Object.keys(groupedVendors).sort().map(category => (
          <div key={category} className="vendor-group">
            <h2 className="group-title" style={{ borderColor: CATEGORY_COLORS[category] }}>
              <span 
                className="group-badge" 
                style={{ backgroundColor: CATEGORY_COLORS[category] }}
              >
                {groupedVendors[category].length}
              </span>
              {category}
            </h2>
            <div className="vendor-grid">
              {groupedVendors[category].map(vendor => (
                <VendorCard
                  key={vendor.id}
                  vendor={vendor}
                  formatPhone={formatPhone}
                  onEdit={openEdit}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        // Flat grid when filtering by category
        <div className="vendor-grid">
          {filteredVendors.map(vendor => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              formatPhone={formatPhone}
              onEdit={openEdit}
            />
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
    </div>
  );
};

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
  <div className="vendor-modal-backdrop" onClick={onClose} role="presentation">
    <div className="vendor-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="vendor-modal-title">
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
