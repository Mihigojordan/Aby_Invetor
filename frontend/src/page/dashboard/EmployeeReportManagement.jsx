import React, { useState, useEffect, useMemo } from 'react';
import { Search, Calendar, Filter, User, DollarSign, TrendingUp, FileText, Clock, ChevronLeft, ChevronRight, Eye, X, Package } from 'lucide-react';
import reportService from '../../services/reportService';
import { useNavigate } from 'react-router-dom';

const EmployeeReportManagement = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const navigate = useNavigate();

  // Fetch all reports on component mount
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const data = await reportService.getAllReports();
        setReports(data);
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to fetch reports');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  // Filter reports based on search term and date filter
  useEffect(() => {
    let filtered = [...reports];

    // Filter by employee search
    if (searchTerm) {
      filtered = filtered.filter(report => {
        const employeeName = `${report.employee?.firstname || ''} ${report.employee?.lastname || ''}`.toLowerCase();
        const employeeEmail = report.employee?.email?.toLowerCase() || '';
        const employeePhone = report.employee?.phoneNumber || '';

        return employeeName.includes(searchTerm.toLowerCase()) ||
               employeeEmail.includes(searchTerm.toLowerCase()) ||
               employeePhone.includes(searchTerm);
      });
    }

    // Filter by date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateFilter) {
      case 'today':
        filtered = filtered.filter(report => {
          const reportDate = new Date(report.createdAt);
          const reportDay = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate());
          return reportDay.getTime() === today.getTime();
        });
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        filtered = filtered.filter(report => {
          const reportDate = new Date(report.createdAt);
          return reportDate >= weekStart && reportDate <= now;
        });
        break;
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        filtered = filtered.filter(report => {
          const reportDate = new Date(report.createdAt);
          return reportDate >= monthStart && reportDate <= now;
        });
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          const startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999); // Include full end date
          filtered = filtered.filter(report => {
            const reportDate = new Date(report.createdAt);
            return reportDate >= startDate && reportDate <= endDate;
          });
        }
        break;
      default:
        // Show all reports
        break;
    }

    setFilteredReports(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [reports, searchTerm, dateFilter, customStartDate, customEndDate]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalReports = filteredReports.length;
    const totalEmployees = new Set(filteredReports.map(r => r.employeeId)).size;
    const totalCash = filteredReports.reduce((sum, r) => sum + (r.cashAtHand || 0), 0);
    const totalPhoneMoney = filteredReports.reduce((sum, r) => sum + (r.moneyOnPhone || 0), 0);
    const totalExpenses = filteredReports.reduce((sum, r) =>
      sum + (r.expenses?.reduce((expSum, exp) => expSum + (exp.amount || 0), 0) || 0), 0);

    return {
      totalReports,
      totalEmployees,
      totalCash,
      totalPhoneMoney,
      totalExpenses,
      totalMoney: totalCash + totalPhoneMoney
    };
  }, [filteredReports]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredReports.slice(startIndex, endIndex);

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // Format currency helper
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-RW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getEmployeeReportsCount = (employeeId) => {
    return filteredReports.filter(r => r.employeeId === employeeId).length;
  };

  const handleViewMore = (reportId) => {
    if (!reportId) return;
    navigate(`/admin/dashboard/employee-report/${reportId}`);
  };

  const hasActiveFilters = searchTerm || dateFilter !== 'all' || customStartDate || customEndDate;

  // Pagination Component
  const PaginationComponent = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center gap-3">
        <p className="text-xs text-gray-600">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredReports.length)} of {filteredReports.length} entries
        </p>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className={`flex items-center gap-1 px-2 py-1 text-xs border rounded-md transition-colors ${currentPage === 1
              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
              : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
          >
            <ChevronLeft size={14} />
            Previous
          </button>
          <div className="flex items-center gap-1 mx-2">
            {getPageNumbers().map((page, idx) => (
              <button
                key={idx}
                onClick={() => typeof page === 'number' && handlePageChange(page)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  typeof page !== 'number'
                    ? 'cursor-default text-gray-500'
                    : currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
                disabled={typeof page !== 'number'}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className={`flex items-center gap-1 px-2 py-1 text-xs border rounded-md transition-colors ${currentPage === totalPages
              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
              : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );

  // Table View Component
  const TableView = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cash at Hand</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Money</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.map((report, index) => {
              const totalExpenses = report.expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
              return (
                <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                      {startIndex + index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white">
                        <User size={12} />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-900">
                          {report.employee?.firstname} {report.employee?.lastname}
                        </div>
                        <div className="text-xs text-gray-500">
                          {report.employee?.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <DollarSign size={12} className="text-green-500" />
                      <span className="text-xs text-gray-900">
                        {formatCurrency(report.cashAtHand || 0)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <DollarSign size={12} className="text-blue-500" />
                      <span className="text-xs text-gray-900">
                        {formatCurrency(report.moneyOnPhone || 0)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={12} className="text-red-500" />
                      <div className="text-xs">
                        <div className="font-medium text-gray-900">
                          {formatCurrency(totalExpenses)}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {report.expenses?.length || 0} item{(report.expenses?.length || 0) !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-600">
                        {formatDate(report.createdAt)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleViewMore(report.id)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <PaginationComponent />
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-5 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[90vh] overflow-y-auto px-4 bg-gray-50 p-4 sm:p-5 lg:p-6">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Employee Report Management</h1>
          <p className="text-xs text-gray-600">View and analyze all employee reports</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-4 text-xs">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center">
              <FileText className="h-10 w-10 text-blue-600" />
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Total Reports</p>
                <p className="text-lg font-bold text-gray-900">{summaryStats.totalReports}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center">
              <User className="h-10 w-10 text-green-600" />
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Employees</p>
                <p className="text-lg font-bold text-gray-900">{summaryStats.totalEmployees}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center">
              <DollarSign className="h-10 w-10 text-yellow-600" />
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Total Money</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(summaryStats.totalMoney)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center">
              <TrendingUp className="h-10 w-10 text-red-600" />
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Total Expenses</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(summaryStats.totalExpenses)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search employees (name, email, phone)..."
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Date Filter */}
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-sm"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Range */}
            {dateFilter === 'custom' ? (
              <div className="flex space-x-2">
                <input
                  type="date"
                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
                <input
                  type="date"
                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            ) : (
              <div></div>
            )}

            {/* Clear Filters Button */}
            <div className="flex justify-end">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X size={14} />
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="space-y-4">
          {filteredReports.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-base text-gray-600 mb-1">No reports found</p>
              <p className="text-xs text-gray-500">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <TableView />
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeReportManagement;