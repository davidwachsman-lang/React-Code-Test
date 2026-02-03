import React, { useState, useMemo } from 'react';
import { COMPANY_DIRECTORY_MOCK } from '../data/companyDirectoryData';
import './CompanyDirectory.css';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role' },
  { key: 'department', label: 'Department' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
];

function CompanyDirectory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const filteredAndSorted = useMemo(() => {
    const searchLower = (searchTerm || '').toLowerCase().trim();
    let list = searchLower
      ? COMPANY_DIRECTORY_MOCK.filter((person) => {
          const name = (person.name || '').toLowerCase();
          const role = (person.role || '').toLowerCase();
          const department = (person.department || '').toLowerCase();
          const email = (person.email || '').toLowerCase();
          const phone = (person.phone || '').toLowerCase();
          return (
            name.includes(searchLower) ||
            role.includes(searchLower) ||
            department.includes(searchLower) ||
            email.includes(searchLower) ||
            phone.includes(searchLower)
          );
        })
      : [...COMPANY_DIRECTORY_MOCK];

    list.sort((a, b) => {
      const aVal = (a[sortField] || '').toString().toLowerCase();
      const bVal = (b[sortField] || '').toString().toLowerCase();
      const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [searchTerm, sortField, sortDirection]);

  const handleSort = (key) => {
    if (sortField === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(key);
      setSortDirection('asc');
    }
  };

  const clearSearch = () => setSearchTerm('');

  return (
    <div className="company-directory">
      <div className="company-directory-search-box">
        <input
          type="text"
          placeholder="Search by name, role, department, email, or phone"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="company-directory-search-input"
        />
        {searchTerm && (
          <button type="button" className="company-directory-clear-search" onClick={clearSearch} aria-label="Clear search">
            &times;
          </button>
        )}
      </div>

      <div className="company-directory-results-info">
        {filteredAndSorted.length} {filteredAndSorted.length === 1 ? 'person' : 'people'} found
      </div>

      {filteredAndSorted.length === 0 ? (
        <div className="company-directory-empty">
          <p>No one found matching your search.</p>
          <button type="button" className="action-btn action-btn-gray" onClick={clearSearch}>
            Clear search
          </button>
        </div>
      ) : (
        <div className="company-directory-table-wrap">
          <table className="company-directory-table">
            <thead>
              <tr>
                {COLUMNS.map(({ key, label }) => (
                  <th
                    key={key}
                    className="company-directory-th sortable"
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
                  <td>{person.email}</td>
                  <td>{person.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CompanyDirectory;
