import React, { useState } from 'react';
import './Forms.css';

function Forms() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  const categories = [
    {
      id: 'hb-nash',
      name: 'HB-NASHVILLE',
      description: 'Residential Services',
      icon: '🏠',
      color: '#3b82f6',
      subcategories: [
        { id: 'mit', name: 'MIT', icon: '🔧' },
        { id: 'recon', name: 'RECON', icon: '🏗️' },
        { id: 'roofing', name: 'ROOFING', icon: '🏠' },
        { id: 'contents', name: 'CONTENTS', icon: '📦' }
      ]
    },
    {
      id: 'idrt',
      name: 'IDRT',
      description: 'Large Loss',
      icon: '📋',
      color: '#10b981',
      subcategories: []
    },
    {
      id: 'hr-admin',
      name: 'HR & ADMIN',
      description: 'Human Resources & Administration',
      icon: '👥',
      color: '#f59e0b',
      subcategories: []
    },
    {
      id: 'legal',
      name: 'LEGAL',
      description: 'Legal Documents & Contracts',
      icon: '⚖️',
      color: '#6366f1',
      subcategories: []
    },
    {
      id: 'custom',
      name: 'CREATE CUSTOM',
      description: 'Build your own custom form',
      icon: '✨',
      color: '#8b5cf6',
      subcategories: []
    }
  ];

  const handleCategoryClick = (categoryId) => {
    if (categoryId === 'custom') {
      alert('Custom form builder coming soon!');
    } else {
      if (selectedCategory === categoryId) {
        setSelectedCategory(null);
        setSelectedSubcategory(null);
      } else {
        setSelectedCategory(categoryId);
        setSelectedSubcategory(null);
      }
    }
  };

  const handleSubcategoryClick = (subcategoryId) => {
    setSelectedSubcategory(subcategoryId);
  };

  return (
    <div className="precision-layout forms-page">
      <div className="precision-main">
        <header className="forms-header">
          <h1>Forms</h1>
          <p className="forms-subtitle">Browse and access forms by category</p>
        </header>

        <div className="precision-content forms-content-wrapper">
        <div className="search-container">
          <input
            type="text"
            className="form-search-bar p-input"
            placeholder="Search for any form..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearchTerm('')}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="forms-content">
        {searchTerm && (
          <div className="search-info">
            Searching for: <strong>{searchTerm}</strong>
          </div>
        )}

        <div className="categories-grid">
          {categories.map(category => (
            <div
              key={category.id}
              role="button"
              tabIndex={0}
              className={`category-card ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => handleCategoryClick(category.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCategoryClick(category.id); } }}
            >
              <div className="category-icon">{category.icon}</div>
              <div className="category-info">
                <h2>{category.name}</h2>
                <p>{category.description}</p>
              </div>
              <div className="category-arrow">→</div>
            </div>
          ))}
        </div>

        {selectedCategory && (
          <div className="selected-category-content">
            <h3>{categories.find(c => c.id === selectedCategory)?.name}</h3>
            
            {categories.find(c => c.id === selectedCategory)?.subcategories?.length > 0 ? (
              <div className="subcategories-grid">
                {categories.find(c => c.id === selectedCategory)?.subcategories.map(sub => (
                  <div
                    key={sub.id}
                    role="button"
                    tabIndex={0}
                    className={`subcategory-card ${selectedSubcategory === sub.id ? 'active' : ''}`}
                    onClick={() => handleSubcategoryClick(sub.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSubcategoryClick(sub.id); } }}
                  >
                    <div className="subcategory-icon">{sub.icon}</div>
                    <div className="subcategory-name">{sub.name}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p>Forms for this category will be displayed here...</p>
            )}

            {selectedSubcategory && (
              <div className="subcategory-forms">
                <h4>{categories.find(c => c.id === selectedCategory)?.subcategories.find(s => s.id === selectedSubcategory)?.name} Forms</h4>
                <p>Forms for this subcategory will be displayed here...</p>
              </div>
            )}
          </div>
        )}
        </div>
        </div>
      </div>
    </div>
  );
}

export default Forms;
