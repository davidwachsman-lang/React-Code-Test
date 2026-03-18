import React, { useState, useMemo, useEffect } from 'react';
import { VENDOR_CATEGORIES, CATEGORY_COLORS, CATEGORY_BADGE_COLORS } from '../data/vendorData';
import { INTERNAL_DIRECTORY } from '../data/internalDirectoryData';
import { vendorService } from '../services';
import InsuranceSLAs from '../components/resource-center/InsuranceSLAs';
import './ResourceCenter.css';

const emptyForm = () => ({
  name: '',
  categories: [],
  phone: '',
  email: '',
  notes: '',
  coiReceived: false,
  workersCompReceived: false,
  coiExpirationDate: '',
  taxFormReceived: false,
  taxFormExpirationDate: '',
  paymentTerms: '',
  vendorTier: '',
  contractFile: null,
  contractFileName: '',
  contractFileUrl: '',
  contractFilePath: '',
});

const PAYMENT_TERMS = ['Net 15', 'Net 30', 'Net 60', 'Net 75', 'Net 90'];
const VENDOR_TIERS = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'];
const VENDOR_SORT_FIELDS = {
  NAME: 'name',
  CATEGORY: 'category',
  PAYMENT_TERMS: 'payment_terms',
  VENDOR_TIER: 'vendor_tier',
  COI: 'coi_received',
  TAX_FORM: 'tax_form_received',
  CONTRACT: 'contract_file_name',
};

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
  const [selectedTier, setSelectedTier] = useState('All');
  const [sortField, setSortField] = useState(VENDOR_SORT_FIELDS.NAME);
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedVendorId, setSelectedVendorId] = useState(null);
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
    const cats = vendor.category
      ? vendor.category.split(',').map(c => c.trim()).filter(Boolean)
      : [];
    setFormData({
      name: vendor.name ?? '',
      categories: cats,
      phone: vendor.phone ?? '',
      email: vendor.email ?? '',
      notes: vendor.notes ?? '',
      coiReceived: !!vendor.coi_received,
      workersCompReceived: !!vendor.workers_comp_received,
      coiExpirationDate: vendor.coi_expiration_date ?? '',
      taxFormReceived: !!vendor.tax_form_received,
      taxFormExpirationDate: vendor.tax_form_expiration_date ?? '',
      paymentTerms: vendor.payment_terms ?? '',
      vendorTier: vendor.vendor_tier ?? '',
      contractFile: null,
      contractFileName: vendor.contract_file_name ?? '',
      contractFileUrl: vendor.contract_file_url ?? '',
      contractFilePath: vendor.contract_file_path ?? '',
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

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    const name = (formData.name || '').trim();
    if (!name) {
      setFormError('Name is required.');
      return;
    }
    if (!formData.categories || formData.categories.length === 0) {
      setFormError('Select at least one trade/category.');
      return;
    }
    setFormSaving(true);
    const payload = {
      name,
      category: formData.categories.join(', '),
      phone: (formData.phone || '').trim(),
      email: (formData.email || '').trim(),
      notes: (formData.notes || '').trim(),
      coi_received: !!formData.coiReceived,
      workers_comp_received: !!formData.workersCompReceived,
      coi_expiration_date: formData.coiExpirationDate || null,
      tax_form_received: !!formData.taxFormReceived,
      tax_form_expiration_date: formData.taxFormExpirationDate || null,
      payment_terms: formData.paymentTerms || null,
      vendor_tier: formData.vendorTier || null,
    };
    try {
      const savedVendor = editingVendor
        ? await vendorService.update(editingVendor.id, payload)
        : await vendorService.create(payload);

      if (formData.contractFile) {
        await vendorService.uploadContract(
          savedVendor.id,
          formData.contractFile,
          savedVendor.contract_file_path || editingVendor?.contract_file_path || null
        );
      }

      await refetchVendors();
      closeModal();
    } catch (err) {
      setFormError(err?.message ?? 'Failed to save vendor');
    } finally {
      setFormSaving(false);
    }
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

  // Parse a vendor's category string into an array of trades
  const getVendorCategories = (vendor) => {
    if (!vendor.category) return [];
    return vendor.category.split(',').map(c => c.trim()).filter(Boolean);
  };

  // Filter vendors based on search and category
  const filteredVendors = useMemo(() => {
    const list = Array.isArray(vendors) ? vendors : [];
    return list.filter(vendor => {
      // Category filter — match if vendor has the selected category in their list
      const vendorCats = getVendorCategories(vendor);
      const matchesCategory = selectedCategory === 'All' || vendorCats.includes(selectedCategory);
      const matchesTier = selectedTier === 'All' || (vendor.vendor_tier || '') === selectedTier;

      // Search filter (name, phone, email, notes, categories)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        (vendor.name && vendor.name.toLowerCase().includes(searchLower)) ||
        (vendor.phone && vendor.phone.toLowerCase().includes(searchLower)) ||
        (vendor.email && vendor.email.toLowerCase().includes(searchLower)) ||
        (vendor.notes && vendor.notes.toLowerCase().includes(searchLower)) ||
        (vendor.category && vendor.category.toLowerCase().includes(searchLower)) ||
        (vendor.payment_terms && vendor.payment_terms.toLowerCase().includes(searchLower)) ||
        (vendor.vendor_tier && vendor.vendor_tier.toLowerCase().includes(searchLower));
      return matchesCategory && matchesTier && matchesSearch;
    });
  }, [vendors, searchTerm, selectedCategory, selectedTier]);

  const sortedVendors = useMemo(() => {
    const list = [...filteredVendors];
    list.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === 'boolean' || typeof bValue === 'boolean') {
        const boolA = aValue ? 1 : 0;
        const boolB = bValue ? 1 : 0;
        return sortDirection === 'asc' ? boolA - boolB : boolB - boolA;
      }

      const stringA = String(aValue || '').toLowerCase();
      const stringB = String(bValue || '').toLowerCase();
      const comparison = stringA.localeCompare(stringB, undefined, { sensitivity: 'base' });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filteredVendors, sortDirection, sortField]);

  const handleVendorSort = (field) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDirection('asc');
  };

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === selectedVendorId) ?? null,
    [selectedVendorId, vendors]
  );

  useEffect(() => {
    if (!selectedVendorId) return;
    if (!sortedVendors.some((vendor) => vendor.id === selectedVendorId)) {
      setSelectedVendorId(null);
    }
  }, [selectedVendorId, sortedVendors]);

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
                <div className="resource-segment-filters">
                  <label className="resource-filter-label" htmlFor="vendor-tier-filter">Tier</label>
                  <select
                    id="vendor-tier-filter"
                    className="resource-filter-select"
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value)}
                  >
                    <option value="All">All tiers</option>
                    {VENDOR_TIERS.map((tier) => (
                      <option key={tier} value={tier}>{tier}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="results-info">
                {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''} found
                {selectedCategory !== 'All' && ` in ${selectedCategory}`}
                {selectedTier !== 'All' && ` • ${selectedTier}`}
              </div>
              {filteredVendors.length === 0 ? (
                <div className="no-results">
                  <p>No vendors found matching your criteria.</p>
                  <button onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setSelectedTier('All'); }}>
                    Clear filters
                  </button>
                </div>
              ) : (
                <VendorList
                  vendors={sortedVendors}
                  onSort={handleVendorSort}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  selectedVendorId={selectedVendorId}
                  onSelectVendor={setSelectedVendorId}
                />
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
              {selectedVendor && (
                <VendorDetailDrawer
                  vendor={selectedVendor}
                  formatPhone={formatPhone}
                  onClose={() => setSelectedVendorId(null)}
                  onEdit={openEdit}
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
          <label>Trades / Categories *</label>
          <div className="vendor-category-grid">
            {VENDOR_CATEGORIES.map((cat) => {
              const isChecked = (formData.categories || []).includes(cat);
              return (
                <label
                  key={cat}
                  className={`vendor-category-chip${isChecked ? ' selected' : ''}`}
                  style={isChecked ? { '--chip-color': CATEGORY_COLORS[cat] || '#64748B' } : undefined}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      const current = formData.categories || [];
                      const updated = isChecked
                        ? current.filter(c => c !== cat)
                        : [...current, cat];
                      onChange('categories', updated);
                    }}
                  />
                  <span className="chip-label">{cat}</span>
                </label>
              );
            })}
          </div>
          {formData.categories && formData.categories.length > 0 && (
            <div className="selected-trades-summary">
              {formData.categories.length} trade{formData.categories.length !== 1 ? 's' : ''} selected
            </div>
          )}
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
        <div className="vendor-form-section">
          <h3>Compliance</h3>
          <p>Track paperwork, terms, and contract readiness for each vendor.</p>
        </div>
        <div className="vendor-form-check-grid">
          <div className="vendor-form-check-card">
            <label className="vendor-form-toggle">
              <input
                type="checkbox"
                checked={!!formData.coiReceived}
                onChange={(e) => onChange('coiReceived', e.target.checked)}
              />
              <span>COI on file</span>
            </label>
            <label className="vendor-form-toggle">
              <input
                type="checkbox"
                checked={!!formData.workersCompReceived}
                onChange={(e) => onChange('workersCompReceived', e.target.checked)}
              />
              <span>Workers&apos; Comp</span>
            </label>
            <label htmlFor="vendor-coi-expiration">COI expiration date</label>
            <input
              id="vendor-coi-expiration"
              type="date"
              value={formData.coiExpirationDate}
              onChange={(e) => onChange('coiExpirationDate', e.target.value)}
            />
          </div>
          <div className="vendor-form-check-card">
            <label className="vendor-form-toggle">
              <input
                type="checkbox"
                checked={!!formData.taxFormReceived}
                onChange={(e) => onChange('taxFormReceived', e.target.checked)}
              />
              <span>Tax form on file</span>
            </label>
            <label htmlFor="vendor-tax-form-expiration">Tax form expiration date</label>
            <input
              id="vendor-tax-form-expiration"
              type="date"
              value={formData.taxFormExpirationDate}
              onChange={(e) => onChange('taxFormExpirationDate', e.target.value)}
            />
          </div>
        </div>
        <div className="vendor-form-row">
          <label htmlFor="vendor-payment-terms">Payment Terms</label>
          <select
            id="vendor-payment-terms"
            value={formData.paymentTerms}
            onChange={(e) => onChange('paymentTerms', e.target.value)}
          >
            <option value="">Select payment terms</option>
            {PAYMENT_TERMS.map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>
        </div>
        <div className="vendor-form-row">
          <label htmlFor="vendor-tier">Vendor Tier</label>
          <select
            id="vendor-tier"
            value={formData.vendorTier}
            onChange={(e) => onChange('vendorTier', e.target.value)}
          >
            <option value="">Select vendor tier</option>
            {VENDOR_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
        </div>
        <div className="vendor-form-row">
          <label htmlFor="vendor-contract-file">Contract</label>
          <input
            id="vendor-contract-file"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => onChange('contractFile', e.target.files?.[0] || null)}
          />
          <div className="vendor-form-file-help">
            {formData.contractFile ? (
              <span>Selected: {formData.contractFile.name}</span>
            ) : formData.contractFileUrl ? (
              <a href={formData.contractFileUrl} target="_blank" rel="noreferrer">
                Current file: {formData.contractFileName || 'View contract'}
              </a>
            ) : (
              <span>No contract uploaded</span>
            )}
          </div>
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

const VendorList = ({ vendors, onSort, sortField, sortDirection, selectedVendorId, onSelectVendor }) => {
  const renderSort = (field) => {
    if (sortField !== field) return null;
    return <span className="vendor-table-sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  const renderStatus = (value, yesLabel = 'Yes', noLabel = 'No') => (
    <span className={`vendor-status-chip ${value ? 'is-complete' : 'is-missing'}`}>
      {value ? yesLabel : noLabel}
    </span>
  );

  return (
    <div className="vendor-master-detail">
      <div className="vendor-list-shell">
        <div className="vendor-list-header">
          <button type="button" className="vendor-list-sort" onClick={() => onSort(VENDOR_SORT_FIELDS.NAME)}>
            Vendor {renderSort(VENDOR_SORT_FIELDS.NAME)}
          </button>
          <button type="button" className="vendor-list-sort" onClick={() => onSort(VENDOR_SORT_FIELDS.VENDOR_TIER)}>
            Tier {renderSort(VENDOR_SORT_FIELDS.VENDOR_TIER)}
          </button>
          <button type="button" className="vendor-list-sort" onClick={() => onSort(VENDOR_SORT_FIELDS.COI)}>
            Compliance {renderSort(VENDOR_SORT_FIELDS.COI)}
          </button>
          <button type="button" className="vendor-list-sort" onClick={() => onSort(VENDOR_SORT_FIELDS.PAYMENT_TERMS)}>
            Terms {renderSort(VENDOR_SORT_FIELDS.PAYMENT_TERMS)}
          </button>
        </div>
        <div className="vendor-list">
          {vendors.map((vendor) => {
            const categories = vendor.category
              ? vendor.category.split(',').map((c) => c.trim()).filter(Boolean)
              : [];
            const isSelected = vendor.id === selectedVendorId;
            return (
              <button
                key={vendor.id}
                type="button"
                className={`vendor-row${isSelected ? ' selected' : ''}`}
                onClick={() => onSelectVendor(vendor.id)}
              >
                <div className="vendor-row-primary">
                  <div className="vendor-row-name">{vendor.name}</div>
                  <div className="category-badges category-badges-table">
                    {categories.map((cat) => {
                      const badge = CATEGORY_BADGE_COLORS[cat] || { bg: '#F1F5F9', text: '#64748B' };
                      return (
                        <span
                          key={cat}
                          className="category-badge"
                          style={{ backgroundColor: badge.bg, color: badge.text }}
                        >
                          {cat}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="vendor-row-tier">{vendor.vendor_tier || 'No tier'}</div>
                <div className="vendor-row-compliance">
                  {renderStatus(!!vendor.coi_received, 'COI', 'COI')}
                  {renderStatus(!!vendor.workers_comp_received, 'WC', 'WC')}
                  {renderStatus(!!vendor.tax_form_received, 'Tax', 'Tax')}
                  {renderStatus(!!vendor.contract_file_url, 'Contract', 'Contract')}
                </div>
                <div className="vendor-row-terms">{vendor.payment_terms || 'No terms'}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const VendorDetailDrawer = ({ vendor, formatPhone, onClose, onEdit }) => {
  const categories = vendor.category
    ? vendor.category.split(',').map((c) => c.trim()).filter(Boolean)
    : [];

  const complianceItems = [
    {
      label: 'COI',
      status: vendor.coi_received,
      detail: vendor.coi_expiration_date ? `Expires ${vendor.coi_expiration_date}` : 'No expiration date',
    },
    {
      label: "Workers' Comp",
      status: vendor.workers_comp_received,
      detail: vendor.workers_comp_received ? 'On file' : 'Missing',
    },
    {
      label: 'Tax Form',
      status: vendor.tax_form_received,
      detail: vendor.tax_form_expiration_date ? `Expires ${vendor.tax_form_expiration_date}` : 'No expiration date',
    },
    {
      label: 'Contract',
      status: !!vendor.contract_file_url,
      detail: vendor.contract_file_name || 'No contract uploaded',
    },
  ];

  return (
    <>
      <div className="vendor-drawer-backdrop" onClick={onClose} />
      <aside className="vendor-drawer" aria-label="Vendor details">
        <div className="vendor-drawer-header">
          <div>
            <div className="vendor-drawer-eyebrow">Vendor Detail</div>
            <h2>{vendor.name}</h2>
          </div>
          <button type="button" className="vendor-drawer-close" onClick={onClose} aria-label="Close vendor detail">
            ×
          </button>
        </div>

        <div className="vendor-drawer-body">
          <section className="vendor-drawer-section">
            <div className="vendor-drawer-summary-row">
              <span className="vendor-drawer-tier">{vendor.vendor_tier || 'No tier assigned'}</span>
              <span className="vendor-drawer-terms">{vendor.payment_terms || 'No payment terms'}</span>
            </div>
            <div className="category-badges">
              {categories.map((cat) => {
                const badge = CATEGORY_BADGE_COLORS[cat] || { bg: '#F1F5F9', text: '#64748B' };
                return (
                  <span
                    key={cat}
                    className="category-badge"
                    style={{ backgroundColor: badge.bg, color: badge.text }}
                  >
                    {cat}
                  </span>
                );
              })}
            </div>
          </section>

          <section className="vendor-drawer-section">
            <h3>Compliance</h3>
            <div className="vendor-drawer-compliance">
              {complianceItems.map((item) => (
                <div key={item.label} className="vendor-drawer-compliance-item">
                  <div className="vendor-drawer-compliance-top">
                    <span>{item.label}</span>
                    <span className={`vendor-status-chip ${item.status ? 'is-complete' : 'is-missing'}`}>
                      {item.status ? 'Complete' : 'Missing'}
                    </span>
                  </div>
                  <div className="vendor-table-meta">{item.detail}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="vendor-drawer-section">
            <h3>Contact</h3>
            <div className="vendor-drawer-contact">
              <div>
                <span className="vendor-drawer-label">Phone</span>
                {vendor.phone ? (
                  <a href={`tel:${formatPhone(vendor.phone)}`} className="contact-link phone">{vendor.phone}</a>
                ) : (
                  <span className="vendor-drawer-value">—</span>
                )}
              </div>
              <div>
                <span className="vendor-drawer-label">Email</span>
                {vendor.email ? (
                  <a href={`mailto:${vendor.email}`} className="contact-link email">{vendor.email}</a>
                ) : (
                  <span className="vendor-drawer-value">—</span>
                )}
              </div>
            </div>
          </section>

          <section className="vendor-drawer-section">
            <h3>Contract</h3>
            {vendor.contract_file_url ? (
              <a href={vendor.contract_file_url} className="vendor-contract-link" target="_blank" rel="noreferrer">
                {vendor.contract_file_name || 'Open contract'}
              </a>
            ) : (
              <div className="vendor-drawer-value">No contract uploaded</div>
            )}
          </section>

          <section className="vendor-drawer-section">
            <h3>Notes</h3>
            <div className="vendor-drawer-notes">{vendor.notes || 'No notes added'}</div>
          </section>
        </div>

        <div className="vendor-drawer-footer">
          <button type="button" className="vendor-form-cancel" onClick={onClose}>Close</button>
          <button type="button" className="vendor-form-submit" onClick={() => onEdit(vendor)}>Edit Vendor</button>
        </div>
      </aside>
    </>
  );
};

export default ResourceCenter;
