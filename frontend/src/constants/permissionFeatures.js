// Canonical list of permission-manageable features.
// Keys mirror Sidebar.jsx's adminItems keys exactly, so the same vocabulary
// is shared between sidebar navigation and the permission matrix.
export const PERMISSION_FEATURES = [
  { key: 'employee-report', label: 'Employee Report' },
  { key: 'partners', label: 'Partner Management' },
  { key: 'product-list', label: 'Product Management' },
  { key: 'category-management', label: 'Category Management' },
  { key: 'stockin', label: 'Manage Stock (Stock In)' },
  { key: 'stockout-movement', label: 'Stock Out Management' },
  { key: 'debt-movement', label: 'Debt Management' },
  { key: 'sales-returns', label: 'Sales Returns' },
  { key: 'requisition-management', label: 'Requisition Management' },
  { key: 'stock-requisition-management', label: 'Stock Requisition Management' },
  { key: 'expense-movement', label: 'Expense Management' },
  { key: 'credit-movement', label: 'Credit Management' },
  { key: 'sales-report', label: 'Sales Report' },
];
