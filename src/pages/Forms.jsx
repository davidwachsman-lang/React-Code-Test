import React, { useState } from 'react';
import './Page.css';
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
    <div className="page-container forms-page">
      <div className="forms-header">
        <h1>Forms</h1>
      </div>
      
      <div className="search-container">
        <input
          type="text"
          className="form-search-bar"
          placeholder="Search for any form..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button 
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
              className={`category-card ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => handleCategoryClick(category.id)}
              style={{ '--category-color': category.color }}
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
                    className={`subcategory-card ${selectedSubcategory === sub.id ? 'active' : ''}`}
                    onClick={() => handleSubcategoryClick(sub.id)}
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
  );
}

export default Forms;
