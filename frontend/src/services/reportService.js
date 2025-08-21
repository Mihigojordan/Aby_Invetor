import api from '../api/api'; // Adjust the import path as needed

/**
 * Report Service for Frontend
 * Provides methods to interact with Report API endpoints using axios
 * Handles daily/shift reports with expenses and transactions
 */

class ReportService {
  /**
   * Create a new report
   * @param {Object} reportData - Report data
   * @param {Array} reportData.productsSold - Number of products sold (required)
   * @param {number} [reportData.cashAtHand] - Cash at hand amount (optional, defaults to 0)
   * @param {number} [reportData.moneyOnPhone] - Money on phone amount (optional, defaults to 0)
   * @param {Array} [reportData.expenses] - Array of expense objects (optional)
   * @param {Array} [reportData.transactions] - Array of transaction objects (optional)
   * @returns {Promise<Object>} Created report with success message
   */
  async createReport(reportData) {
    try {
      // Validate required fields
      if (reportData.productsSold === undefined || reportData.productsSold === null) {
        throw new Error('Products sold count is required');
      }

      // Format the request data
      const requestData = {
        productsSold: reportData.productsSold,
        cashAtHand: reportData.cashAtHand ? Number(reportData.cashAtHand) : 0,
        moneyOnPhone: reportData.moneyOnPhone ? Number(reportData.moneyOnPhone) : 0,
        expenses: reportData.expenses || [],
        transactions: reportData.transactions || []
      };

      // Validate expenses format
      if (requestData.expenses.length > 0) {
        this.validateExpenses(requestData.expenses);
      }

      // Validate transactions format
      if (requestData.transactions.length > 0) {
        this.validateTransactions(requestData.transactions);
      }

      const response = await api.post('/reports', requestData);
      return response.data;
    } catch (error) {
      console.error('Error creating report:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create report');
    }
  }

  /**
   * Get all reports
   * @returns {Promise<Array>} Array of report entries with related details
   */
  async getAllReports() {
    try {
      const response = await api.get('/reports');
      return response.data;
    } catch (error) {
      console.error('Error fetching all reports:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch reports');
    }
  }

  /**
   * Get a single report by ID
   * @param {string} id - Report ID
   * @returns {Promise<Object>} Report details with expenses and transactions
   */
  async getReportById(id) {
    try {
      if (!id) {
        throw new Error('Report ID is required');
      }

      const response = await api.get(`/reports/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching report by ID:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch report');
    }
  }

  /**
   * Update a report
   * @param {string} id - Report ID
   * @param {Object} updateData - Data to update
   * @param {Array} [updateData.productsSold] - Updated products sold count
   * @param {number} [updateData.cashAtHand] - Updated cash at hand amount
   * @param {number} [updateData.moneyOnPhone] - Updated money on phone amount
   * @returns {Promise<Object>} Updated report
   */
  async updateReport(id, updateData) {
    try {
      if (!id) {
        throw new Error('Report ID is required');
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        throw new Error('Update data is required');
      }

      // Ensure numeric fields are properly converted
      const formattedUpdateData = {
        ...updateData
      };

      if (updateData.productsSold !== undefined) {
        formattedUpdateData.productsSold = updateData.productsSold;
      }
      if (updateData.cashAtHand !== undefined) {
        formattedUpdateData.cashAtHand = Number(updateData.cashAtHand);
      }
      if (updateData.moneyOnPhone !== undefined) {
        formattedUpdateData.moneyOnPhone = Number(updateData.moneyOnPhone);
      }

      const response = await api.put(`/reports/${id}`, formattedUpdateData);
      return response.data;
    } catch (error) {
      console.error('Error updating report:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update report');
    }
  }

  /**
   * Delete a report
   * @param {string} id - Report ID
   * @returns {Promise<Object>} Success message
   */
  async deleteReport(id) {
    try {
      if (!id) {
        throw new Error('Report ID is required');
      }

      const response = await api.delete(`/reports/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting report:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to delete report');
    }
  }

  /**
   * Get reports filtered by date range
   * @param {string} startDate - Start date (ISO string or date)
   * @param {string} endDate - End date (ISO string or date)
   * @returns {Promise<Array>} Filtered reports
   */
  async getReportsByDateRange(startDate, endDate) {
    try {
      if (!startDate || !endDate) {
        throw new Error('Start date and end date are required');
      }

      const response = await api.get('/reports', {
        params: {
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching reports by date range:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch reports by date range');
    }
  }

  /**
   * Get reports for the authenticated employee
   * Uses the dedicated employee endpoint with JWT authentication
   * The employee ID is automatically extracted from the JWT token by the backend guard
   * @returns {Promise<Array>} Current employee's reports with expenses, transactions, and employee details
   */
  async getEmployeeReports() {
    try {
      const response = await api.get('/reports/employee');
      return response.data;
    } catch (error) {
      console.error('Error fetching employee reports:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch employee reports');
    }
  }

  /**
   * Validate expenses array
   * @param {Array} expenses - Array of expense objects
   * @throws {Error} If validation fails
   */
  validateExpenses(expenses) {
    if (!Array.isArray(expenses)) {
      throw new Error('Expenses must be an array');
    }

    for (const expense of expenses) {
      if (!expense.description || typeof expense.description !== 'string') {
        throw new Error('Each expense must have a valid description');
      }
      if (expense.amount === undefined || expense.amount === null || isNaN(Number(expense.amount))) {
        throw new Error('Each expense must have a valid amount');
      }
      if (Number(expense.amount) < 0) {
        throw new Error('Expense amounts must be positive');
      }
    }
  }

  /**
   * Validate transactions array
   * @param {Array} transactions - Array of transaction objects
   * @throws {Error} If validation fails
   */
  validateTransactions(transactions) {
    if (!Array.isArray(transactions)) {
      throw new Error('Transactions must be an array');
    }

    const validTypes = ['DEBIT', 'CREDIT']; // Adjust based on your business logic

    for (const transaction of transactions) {
      if (!transaction.type || !validTypes.includes(transaction.type)) {
        throw new Error(`Each transaction must have a valid type. Valid types: ${validTypes.join(', ')}`);
      }
      if (!transaction.description || typeof transaction.description !== 'string') {
        throw new Error('Each transaction must have a valid description');
      }
      if (transaction.amount === undefined || transaction.amount === null || isNaN(Number(transaction.amount))) {
        throw new Error('Each transaction must have a valid amount');
      }
    }
  }

  /**
   * Utility function to validate report data before sending
   * @param {Object} reportData - Report data to validate
   * @returns {boolean} True if valid
   * @throws {Error} If validation fails
   */
  validateReportData(reportData) {
    const errors = [];
    
    if (reportData.productsSold === undefined || reportData.productsSold === null) {
      errors.push('Products sold count is required');
    }
    
    if (reportData.productsSold !== undefined && (isNaN(Number(reportData.productsSold)) || Number(reportData.productsSold) < 0)) {
      errors.push('Products sold must be a valid non-negative number');
    }
    
    if (reportData.cashAtHand !== undefined && (isNaN(Number(reportData.cashAtHand)) || Number(reportData.cashAtHand) < 0)) {
      errors.push('Cash at hand must be a valid non-negative number');
    }
    
    if (reportData.moneyOnPhone !== undefined && (isNaN(Number(reportData.moneyOnPhone)) || Number(reportData.moneyOnPhone) < 0)) {
      errors.push('Money on phone must be a valid non-negative number');
    }
    
    // Validate expenses if provided
    if (reportData.expenses) {
      try {
        this.validateExpenses(reportData.expenses);
      } catch (error) {
        errors.push(error.message);
      }
    }
    
    // Validate transactions if provided
    if (reportData.transactions) {
      try {
        this.validateTransactions(reportData.transactions);
      } catch (error) {
        errors.push(error.message);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
    
    return true;
  }

  /**
   * Calculate total expenses from expenses array
   * @param {Array} expenses - Array of expense objects
   * @returns {number} Total expenses amount
   */
  calculateTotalExpenses(expenses) {
    if (!Array.isArray(expenses)) return 0;
    return expenses.reduce((total, expense) => total + (Number(expense.amount) || 0), 0);
  }

  /**
   * Calculate net cash flow from transactions
   * @param {Array} transactions - Array of transaction objects
   * @returns {number} Net cash flow (income - expenses)
   */
  calculateNetCashFlow(transactions) {
    if (!Array.isArray(transactions)) return 0;
    
    return transactions.reduce((total, transaction) => {
      const amount = Number(transaction.amount) || 0;
      if (transaction.type === 'income') {
        return total + amount;
      } else if (transaction.type === 'expense') {
        return total - amount;
      }
      return total;
    }, 0);
  }

  /**
   * Calculate total money available (cash + phone money)
   * @param {Object} report - Report object
   * @returns {number} Total available money
   */
  calculateTotalMoney(report) {
    const cashAtHand = Number(report.cashAtHand) || 0;
    const moneyOnPhone = Number(report.moneyOnPhone) || 0;
    return cashAtHand + moneyOnPhone;
  }

  /**
   * Generate report summary
   * @param {Object} report - Report object
   * @returns {Object} Report summary with calculations
   */
  generateReportSummary(report) {
    const totalExpenses = this.calculateTotalExpenses(report.expenses || []);
    const netCashFlow = this.calculateNetCashFlow(report.transactions || []);
    const totalMoney = this.calculateTotalMoney(report);
    
    return {
      reportId: report.id,
      productsSold: report.productsSold,
      totalExpenses,
      netCashFlow,
      totalMoney,
      cashAtHand: report.cashAtHand || 0,
      moneyOnPhone: report.moneyOnPhone || 0,
      expenseCount: (report.expenses || []).length,
      transactionCount: (report.transactions || []).length,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt
    };
  }

  /**
   * Format report data for display
   * @param {Object} report - Raw report object
   * @returns {Object} Formatted report data
   */
  formatReportForDisplay(report) {
    return {
      ...report,
      formattedCashAtHand: this.formatCurrency(report.cashAtHand || 0),
      formattedMoneyOnPhone: this.formatCurrency(report.moneyOnPhone || 0),
      formattedTotalExpenses: this.formatCurrency(this.calculateTotalExpenses(report.expenses || [])),
      formattedTotalMoney: this.formatCurrency(this.calculateTotalMoney(report)),
      formattedDate: this.formatDate(report.createdAt)
    };
  }

  /**
   * Format currency amount
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF', // Adjust currency code as needed
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Format date for display
   * @param {string|Date} date - Date to format
   * @returns {string} Formatted date string
   */
  formatDate(date) {
    return new Intl.DateTimeFormat('en-RW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }
}

// Create and export a singleton instance
const reportService = new ReportService();
export default reportService;

// Also export the class for potential custom instances
export { ReportService };