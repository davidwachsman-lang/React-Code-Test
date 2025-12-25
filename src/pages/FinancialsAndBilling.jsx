import React from 'react';
import './Page.css';

function FinancialsAndBilling() {
  return (
    <div className="page-container">
      <h1>Financials and Billing</h1>
      <p>Manage invoices, payments, and financial tracking.</p>
      <div className="content-section">
        <h2>Financial Management</h2>
        <ul>
          <li>Invoice generation</li>
          <li>Payment tracking</li>
          <li>Expense management</li>
          <li>Financial reporting</li>
        </ul>
      </div>
    </div>
  );
}

export default FinancialsAndBilling;
