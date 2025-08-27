import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Eye,
  Clock,
  Receipt,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import reportService from "../../../services/reportService";

// View Report Modal Component
const ViewReportsPage = ({ isOpen, onClose, report }) => {
  if (!isOpen || !report) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-RW", {
      style: "currency",
      currency: "RWF",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateTotalExpenses = () => {
    return (report.expenses || []).reduce(
      (total, expense) => total + (expense.amount || 0),
      0
    );
  };

  const calculateNetCashFlow = () => {
    const transactions = report.transactions || [];
    return transactions.reduce((total, transaction) => {
      const amount = transaction.amount || 0;
      if (transaction.type === "CREDIT") {
        return total + amount;
      } else if (transaction.type === "DEBIT") {
        return total - amount;
      }
      return total;
    }, 0);
  };

  const calculateTotalCredit = () => {
    const transactions = report.transactions || [];
    return transactions
      .filter((t) => t.type === "CREDIT")
      .reduce((total, t) => total + (t.amount || 0), 0);
  };

  const calculateTotalDebit = () => {
    const transactions = report.transactions || [];
    return transactions
      .filter((t) => t.type === "DEBIT")
      .reduce((total, t) => total + (t.amount || 0), 0);
  };

  // Separate credit and debit transactions
  const creditTransactions = (report.transactions || []).filter(t => t.type === "CREDIT");
  const debitTransactions = (report.transactions || []).filter(t => t.type === "DEBIT");

  const totalMoney = (report.cashAtHand || 0) + (report.moneyOnPhone || 0);
  const totalExpenses = calculateTotalExpenses();
  const netCashFlow = calculateNetCashFlow();
  const totalCredit = calculateTotalCredit();
  const totalDebit = calculateTotalDebit();
  const productsSold = report.productsSold || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Daily Report</h2>
              <p className="text-blue-600 font-medium">
                {productsSold.length} products sold
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Financial Summary */}
            <div className="space-y-6">
              {/* Cash Summary */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Cash Summary</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cash at Hand
                    </label>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(report.cashAtHand || 0)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Money on Phone
                    </label>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(report.moneyOnPhone || 0)}
                    </p>
                  </div>
                  <div className="col-span-2 border-t pt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Available
                    </label>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(totalMoney)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Transaction Flow */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">
                    Transaction Flow
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Credit
                    </label>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(totalCredit)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Debit
                    </label>
                    <p className="text-xl font-bold text-red-600">
                      {formatCurrency(totalDebit)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expenses Summary */}
              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-gray-900">
                    Expenses Summary
                  </h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Expenses
                  </label>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(totalExpenses)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {(report.expenses || []).length} expense entries
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Details */}
            <div className="space-y-6">
              {/* Products Sold Information */}
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Products Sold</h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Products ({productsSold.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {productsSold.map((product, index) => (
                      <span
                        key={index}
                        className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {product}
                      </span>
                    ))}
                    {productsSold.length === 0 && (
                      <span className="text-gray-500 text-sm">No products added</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Expense Details */}
              {report.expenses && report.expenses.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Expense Breakdown
                  </h3>
                  <div className="space-y-2">
                    {report.expenses.map((expense, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0"
                      >
                        <span className="text-gray-700">
                          {expense.description || 'No description'}
                        </span>
                        <span className="font-medium text-red-600">
                          {formatCurrency(expense.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Credit Transactions */}
              {creditTransactions.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-600 rounded-full"></span>
                    Credit Transactions ({creditTransactions.length})
                  </h3>
                  <div className="space-y-2">
                    {creditTransactions.map((transaction, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center py-2 border-b border-green-200 last:border-b-0"
                      >
                        <span className="text-gray-700">
                          {transaction.description || 'No description'}
                        </span>
                        <span className="font-medium text-green-600">
                          +{formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Debit Transactions */}
              {debitTransactions.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-600 rounded-full"></span>
                    Debit Transactions ({debitTransactions.length})
                  </h3>
                  <div className="space-y-2">
                    {debitTransactions.map((transaction, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center py-2 border-b border-red-200 last:border-b-0"
                      >
                        <span className="text-gray-700">
                          {transaction.description || 'No description'}
                        </span>
                        <span className="font-medium text-red-600">
                          -{formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Timeline</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Created
                    </label>
                    <span className="text-gray-900">
                      {formatDate(report.createdAt)}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Updated
                    </label>
                    <span className="text-gray-900">
                      {formatDate(report.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Reports Page Component
const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch reports on component mount
  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportService.getAllReports();
      setReports(data || []);
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError("Failed to load reports. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm("Are you sure you want to delete this report?")) {
      return;
    }

    try {
      await reportService.deleteReport(reportId);
      setReports(reports.filter(report => report.id !== reportId));
    } catch (err) {
      console.error("Error deleting report:", err);
      setError("Failed to delete report. Please try again.");
    }
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setIsViewModalOpen(true);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-RW", {
      style: "currency",
      currency: "RWF",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate totals for a report
  const calculateReportTotals = (report) => {
    const totalExpenses = (report.expenses || []).reduce(
      (total, expense) => total + (expense.amount || 0),
      0
    );
    
    const totalMoney = (report.cashAtHand || 0) + (report.moneyOnPhone || 0);
    
    const netCashFlow = (report.transactions || []).reduce((total, transaction) => {
      const amount = transaction.amount || 0;
      if (transaction.type === "CREDIT") {
        return total + amount;
      } else if (transaction.type === "DEBIT") {
        return total - amount;
      }
      return total;
    }, 0);

    return { totalExpenses, totalMoney, netCashFlow };
  };

  // Filter reports based on search term
  const filteredReports = reports.filter(report => {
    const searchLower = searchTerm.toLowerCase();
    const reportDate = formatDate(report.createdAt).toLowerCase();
    const productsSold = (report.productsSold || []).join(' ').toLowerCase();
    
    return reportDate.includes(searchLower) || 
           productsSold.includes(searchLower) ||
           report.id.toString().includes(searchLower);
  });

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">
            View and manage your daily business reports
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchReports}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Refresh
          </button>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Plus size={20} />
            New Report
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search reports by date, products, or ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Reports Grid */}
      {paginatedReports.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {paginatedReports.map((report) => {
              const { totalExpenses, totalMoney, netCashFlow } = calculateReportTotals(report);
              
              return (
                <div
                  key={report.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  {/* Card Header */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white">
                          <FileText size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Report #{report.id}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {formatDate(report.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewReport(report)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Report"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit Report"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteReport(report.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Report"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Total Money
                        </label>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(totalMoney)}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Expenses
                        </label>
                        <p className="text-lg font-bold text-red-600">
                          {formatCurrency(totalExpenses)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    <div className="space-y-4">
                      {/* Net Cash Flow */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Net Cash Flow</span>
                        <span className={`font-semibold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {netCashFlow >= 0 ? '+' : ''}{formatCurrency(netCashFlow)}
                        </span>
                      </div>

                      {/* Products Count */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Products Sold</span>
                        <span className="text-sm font-medium text-gray-900">
                          {(report.productsSold || []).length} items
                        </span>
                      </div>

                      {/* Transaction Count */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Transactions</span>
                        <span className="text-sm font-medium text-gray-900">
                          {(report.transactions || []).length} entries
                        </span>
                      </div>

                      {/* Products Preview */}
                      {report.productsSold && report.productsSold.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-2">
                            Products Preview
                          </label>
                          <div className="flex flex-wrap gap-1">
                            {report.productsSold.slice(0, 3).map((product, index) => (
                              <span
                                key={index}
                                className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs"
                              >
                                {product}
                              </span>
                            ))}
                            {report.productsSold.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{report.productsSold.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredReports.length)} of {filteredReports.length} reports
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, index) => {
                    const page = index + 1;
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded ${
                            currentPage === page
                              ? "bg-blue-600 text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return <span key={page} className="text-gray-400">...</span>;
                    }
                    return null;
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? "No reports found" : "No reports yet"}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm
              ? "Try adjusting your search terms"
              : "Create your first daily report to get started"}
          </p>
          {!searchTerm && (
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto">
              <Plus size={20} />
              Create First Report
            </button>
          )}
        </div>
      )}

      {/* View Report Modal */}
      <ViewReportModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        report={selectedReport}
      />
    </div>
  );
};

export default ViewReportsPage;